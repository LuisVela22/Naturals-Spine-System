import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { VincularDocumentoDto } from './dto/vincular-documento.dto';
import { TipoDocumento, Rol } from '@prisma/client';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { carpetaDeDocumento, nombreObjetoDocumento, nombreObjetoAclaracion } from './storage-path';

@Injectable()
export class DocumentosService {
  private storage: Storage;
  private bucketName: string;

  constructor(private prisma: PrismaService, private notificaciones: NotificacionesService) {
    this.storage = new Storage();
    this.bucketName = process.env.GCP_STORAGE_BUCKET_NAME || 'naturals-spine-docs-bucket';
  }

  private useLocalStorage() {
    return (process.env.STORAGE_PROVIDER || 'gcp').toLowerCase() === 'local';
  }

  private localStorageDir() {
    return path.resolve(process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'storage', 'documentos'));
  }

  private validateFile(dto: VincularDocumentoDto) {
    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!tiposPermitidos.includes(dto.mime_type)) {
      throw new BadRequestException('Solo se admiten archivos PDF, JPEG o PNG.');
    }

    const maxBytes = 5 * 1024 * 1024;
    if (dto.tamano_bytes > maxBytes) {
      throw new BadRequestException('El archivo supera el límite máximo permitido de 5 MB.');
    }
  }

  async eliminarArchivos(documentos: Array<{ url_gcs: string }>) {
    const localDir = this.localStorageDir();
    await Promise.all(documentos.map(async (doc) => {
      try {
        if (doc.url_gcs.startsWith('local/')) await fs.unlink(path.join(localDir, path.basename(doc.url_gcs)));
        else await this.storage.bucket(this.bucketName).file(doc.url_gcs).delete({ ignoreNotFound: true });
      } catch (error: any) {
        if (error?.code !== 'ENOENT' && error?.code !== 404) throw error;
      }
    }));
  }

  async eliminarDocumentosCliente(clienteId: string) {
    const documentos = await this.prisma.documento.findMany({ where: { cliente_id: clienteId }, select: { id: true, url_gcs: true } });
    await this.eliminarArchivos(documentos);
    await this.prisma.documento.deleteMany({ where: { cliente_id: clienteId } });
  }

  private validateRole(usuario: { rol: Rol }, dto: VincularDocumentoDto) {
    if (
      (dto.tipo_documento === TipoDocumento.FACTURA || dto.tipo_documento === TipoDocumento.REMISION) &&
      usuario.rol !== Rol.ADMIN
    ) {
      throw new ForbiddenException('RF08: Solo el personal de la empresa puede cargar facturas o remisiones');
    }

    if (dto.tipo_documento === TipoDocumento.COMPROBANTE_PAGO && usuario.rol !== Rol.CLIENTE) {
      throw new ForbiddenException('Solo el cliente institucional puede cargar comprobantes de pago');
    }
  }

  private async validatePaymentLock(usuario: { id: string; rol: Rol }, dto: VincularDocumentoDto) {
    if (dto.orden_id && dto.tipo_documento === TipoDocumento.COMPROBANTE_PAGO) {
      const orden = await this.prisma.orden.findUnique({ where: { id: dto.orden_id }, select: { cliente_id: true, bloqueado_para_cliente: true } });
      if (!orden) throw new NotFoundException('Orden no encontrada');
      if (usuario.rol === Rol.CLIENTE) {
        const cliente = await this.prisma.clienteInstitucional.findUnique({ where: { usuario_id: usuario.id }, select: { id: true } });
        if (!cliente || cliente.id !== orden.cliente_id) throw new ForbiddenException('No tienes acceso a esta orden.');
      }
      if (orden.bloqueado_para_cliente && usuario.rol === Rol.CLIENTE) {
        throw new BadRequestException('La orden se encuentra bloqueada tras la carga del comprobante.');
      }
    }
  }

  async generarUrlSubida(usuario: { id: string; rol: Rol }, dto: VincularDocumentoDto) {
    this.validateFile(dto);
    this.validateRole(usuario, dto);
    await this.validatePaymentLock(usuario, dto);

    if (this.useLocalStorage()) {
      return {
        storage: 'local',
        uploadUrl: null,
        rutaGcs: null,
        message: 'Modo de almacenamiento local activo. Utilice /documentos/subir-local.',
      };
    }

    const rfc = await this.obtenerRfcDocumento(usuario, dto);
    const rutaGcs = nombreObjetoDocumento(rfc, dto.tipo_documento, dto.nombre_archivo);
    const file = this.storage.bucket(this.bucketName).file(rutaGcs);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: dto.mime_type,
    });

    return { storage: 'gcp', uploadUrl, rutaGcs };
  }

  async guardarAclaracionRenta(usuarioId: string, ordenId: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    const dto: VincularDocumentoDto = { orden_id: ordenId, tipo_documento: TipoDocumento.CONTRATO, nombre_archivo: file.originalname, mime_type: file.mimetype, tamano_bytes: file.size };
    this.validateFile(dto);
    const orden = await this.prisma.orden.findUnique({ where: { id: ordenId }, select: { cliente_id: true, cliente: { select: { rfc: true } } } });
    if (!orden) throw new NotFoundException('Orden no encontrada');
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${safeName}`;
    let ruta: string;
    if (this.useLocalStorage()) {
      await fs.mkdir(this.localStorageDir(), { recursive: true });
      await fs.writeFile(path.join(this.localStorageDir(), uniqueName), file.buffer);
      ruta = `local/${uniqueName}`;
    } else {
      ruta = nombreObjetoAclaracion(orden.cliente.rfc, file.originalname);
      await this.storage.bucket(this.bucketName).file(ruta).save(file.buffer, { resumable: false, metadata: { contentType: file.mimetype } });
    }
    return this.prisma.documento.create({ data: { cliente_id: orden.cliente_id, orden_id: ordenId, tipo_documento: TipoDocumento.CONTRATO, nombre_archivo: file.originalname, url_gcs: ruta, mime_type: file.mimetype, tamano_bytes: file.size, cargado_por: usuarioId } });
  }

  async subirLocal(
    usuario: { id: string; rol: Rol },
    dto: VincularDocumentoDto,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    if (!this.useLocalStorage()) {
      throw new BadRequestException('El almacenamiento local no está habilitado. Configure STORAGE_PROVIDER=local.');
    }

    const effectiveDto: VincularDocumentoDto = {
      ...dto,
      nombre_archivo: file.originalname,
      mime_type: file.mimetype,
      tamano_bytes: file.size,
    };

    this.validateFile(effectiveDto);
    this.validateRole(usuario, effectiveDto);
    await this.validatePaymentLock(usuario, effectiveDto);

    const dir = this.localStorageDir();
    await fs.mkdir(dir, { recursive: true });

    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${safeName}`;
    const absolutePath = path.join(dir, uniqueName);
    const rutaLocal = `local/${uniqueName}`;

    await fs.writeFile(absolutePath, file.buffer);

    const documento = await this.prisma.$transaction(async (tx) => {
      const cliente = await tx.clienteInstitucional.findUnique({
        where: { usuario_id: usuario.id },
      });

      const documento = await tx.documento.create({
        data: {
          cliente_id: cliente ? cliente.id : null,
          orden_id: effectiveDto.orden_id || null,
          tipo_documento: effectiveDto.tipo_documento,
          nombre_archivo: effectiveDto.nombre_archivo,
          url_gcs: rutaLocal,
          mime_type: effectiveDto.mime_type,
          tamano_bytes: effectiveDto.tamano_bytes,
          cargado_por: usuario.id,
        },
      });

      if (effectiveDto.orden_id && effectiveDto.tipo_documento === TipoDocumento.COMPROBANTE_PAGO) {
        await tx.orden.update({
          where: { id: effectiveDto.orden_id },
          data: { bloqueado_para_cliente: true },
        });
      }

      if (effectiveDto.orden_id) {
        const orden = await tx.orden.findUnique({ where: { id: effectiveDto.orden_id }, select: { estado: true } });
        if (orden) await tx.orderLog.create({ data: { orden_id: effectiveDto.orden_id, usuario_id: usuario.id, estado_anterior: orden.estado, estado_nuevo: orden.estado, comentario: effectiveDto.tipo_documento === TipoDocumento.COMPROBANTE_PAGO ? 'Se adjuntó comprobante de pago.' : `Se adjuntó ${effectiveDto.tipo_documento.toLowerCase()}.` } });
      }

      return documento;
    });
    if (effectiveDto.orden_id && effectiveDto.tipo_documento === TipoDocumento.COMPROBANTE_PAGO) {
      try { await this.notificaciones.notificarPersonalComprobante(effectiveDto.orden_id); }
      catch (error: any) { console.warn(`No se pudo notificar el comprobante al personal: ${error.message}`); }
    }
    return documento;
  }

  private async obtenerRfcDocumento(usuario: { id: string; rol: Rol }, dto: VincularDocumentoDto) {
    if (dto.orden_id) {
      const orden = await this.prisma.orden.findUnique({
        where: { id: dto.orden_id },
        select: { cliente_id: true, cliente: { select: { rfc: true } } },
      });
      if (!orden) throw new NotFoundException('Orden no encontrada');
      if (usuario.rol === Rol.CLIENTE) {
        const cliente = await this.prisma.clienteInstitucional.findUnique({ where: { usuario_id: usuario.id }, select: { id: true } });
        if (!cliente || cliente.id !== orden.cliente_id) throw new ForbiddenException('No tienes acceso a esta orden.');
      }
      return orden.cliente.rfc;
    }
    const cliente = await this.prisma.clienteInstitucional.findUnique({ where: { usuario_id: usuario.id }, select: { rfc: true } });
    if (cliente) return cliente.rfc;
    if (usuario.rol === Rol.ADMIN) return 'SIN-RFC';
    throw new ForbiddenException('No se encontró una cuenta institucional asociada.');
  }

  async confirmarCarga(usuario: { id: string; rol: Rol }, rutaGcs: string, dto: VincularDocumentoDto) {
    this.validateFile(dto);
    this.validateRole(usuario, dto);
    await this.validatePaymentLock(usuario, dto);
    const rfc = await this.obtenerRfcDocumento(usuario, dto);
    const prefijoEsperado = carpetaDeDocumento(dto.tipo_documento) + '/' + rfc.toUpperCase() + '_';
    if (!rutaGcs.startsWith(prefijoEsperado)) throw new BadRequestException('La ruta del documento no corresponde al tipo de archivo o al RFC de la cuenta.');
    const archivo = this.storage.bucket(this.bucketName).file(rutaGcs);
    let metadatos: any;
    try { [metadatos] = await archivo.getMetadata(); }
    catch { throw new BadRequestException('El archivo no existe en Cloud Storage o la carga no terminó correctamente.'); }
    if (Number(metadatos.size) !== dto.tamano_bytes || metadatos.contentType !== dto.mime_type) {
      throw new BadRequestException('El archivo cargado no coincide con el tipo o tamaño declarado.');
    }
    const documento = await this.prisma.$transaction(async (tx) => {
      const cliente = await tx.clienteInstitucional.findUnique({
        where: { usuario_id: usuario.id },
      });
      const documento = await tx.documento.create({
        data: {
          cliente_id: cliente ? cliente.id : null,
          orden_id: dto.orden_id || null,
          tipo_documento: dto.tipo_documento,
          nombre_archivo: dto.nombre_archivo,
          url_gcs: rutaGcs,
          mime_type: dto.mime_type,
          tamano_bytes: dto.tamano_bytes,
          cargado_por: usuario.id,
        },
      });

      if (dto.orden_id && dto.tipo_documento === TipoDocumento.COMPROBANTE_PAGO) {
        await tx.orden.update({
          where: { id: dto.orden_id },
          data: { bloqueado_para_cliente: true },
        });
      }

      if (dto.orden_id) {
        const orden = await tx.orden.findUnique({ where: { id: dto.orden_id }, select: { estado: true } });
        if (orden) await tx.orderLog.create({ data: { orden_id: dto.orden_id, usuario_id: usuario.id, estado_anterior: orden.estado, estado_nuevo: orden.estado, comentario: dto.tipo_documento === TipoDocumento.COMPROBANTE_PAGO ? 'Se adjuntó comprobante de pago.' : `Se adjuntó ${dto.tipo_documento.toLowerCase()}.` } });
      }

      return documento;
    });
    if (dto.orden_id && dto.tipo_documento === TipoDocumento.COMPROBANTE_PAGO) {
      try { await this.notificaciones.notificarPersonalComprobante(dto.orden_id); }
      catch (error: any) { console.warn(`No se pudo notificar el comprobante al personal: ${error.message}`); }
    }
    return documento;
  }

  async obtenerPorOrden(ordenId: string) {
    return this.prisma.documento.findMany({
      where: { orden_id: ordenId },
      orderBy: { fecha_carga: 'desc' },
      include: {
        usuario: {
          select: {
            correo_electronico: true,
            rol: true,
          },
        },
      },
    });
  }

  async generarUrlDescarga(documentoId: string) {
    const doc = await this.prisma.documento.findUnique({ where: { id: documentoId } });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    if (doc.url_gcs.startsWith('local/')) {
      return {
        storage: 'local',
        url: `/api/documentos/${documentoId}/archivo-local`,
        nombre_archivo: doc.nombre_archivo,
        mime_type: doc.mime_type,
      };
    }

    const file = this.storage.bucket(this.bucketName).file(doc.url_gcs);
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 5 * 60 * 1000,
    });

    return {
      storage: 'gcp',
      url: downloadUrl,
      nombre_archivo: doc.nombre_archivo,
      mime_type: doc.mime_type,
    };
  }

  async obtenerArchivoLocal(documentoId: string) {
    const doc = await this.prisma.documento.findUnique({ where: { id: documentoId } });
    if (!doc || !doc.url_gcs.startsWith('local/')) {
      throw new NotFoundException('Archivo local no encontrado');
    }

    const filename = path.basename(doc.url_gcs.replace(/^local\//, ''));
    const filePath = path.join(this.localStorageDir(), filename);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo local no encontrado');

    return { filePath, mimeType: doc.mime_type, nombreArchivo: doc.nombre_archivo };
  }
}

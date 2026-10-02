import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { VincularDocumentoDto } from './dto/vincular-documento.dto';
import { TipoDocumento, Rol } from '@prisma/client';

@Injectable()
export class DocumentosService {
  private storage: Storage;
  private bucketName: string;

  constructor(private prisma: PrismaService) {
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
      throw new BadRequestException('RN03: Solo se admiten archivos PDF, JPEG o PNG');
    }

    const maxBytes = 5 * 1024 * 1024;
    if (dto.tamano_bytes > maxBytes) {
      throw new BadRequestException('RN03: El archivo supera el límite máximo permitido de 5MB');
    }
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
      const orden = await this.prisma.orden.findUnique({ where: { id: dto.orden_id } });
      if (!orden) throw new NotFoundException('Orden no encontrada');
      if (orden.bloqueado_para_cliente && usuario.rol === Rol.CLIENTE) {
        throw new BadRequestException('RN05: La orden se encuentra inmutable tras la carga del comprobante');
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

    const rutaGcs = `documentos/${Date.now()}_${dto.nombre_archivo}`;
    const file = this.storage.bucket(this.bucketName).file(rutaGcs);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: dto.mime_type,
    });

    return { storage: 'gcp', uploadUrl, rutaGcs };
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

    return this.prisma.$transaction(async (tx) => {
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

      return documento;
    });
  }

  async confirmarCarga(usuarioId: string, rutaGcs: string, dto: VincularDocumentoDto) {
    return this.prisma.$transaction(async (tx) => {
      const cliente = await tx.clienteInstitucional.findUnique({
        where: { usuario_id: usuarioId },
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
          cargado_por: usuarioId,
        },
      });

      if (dto.orden_id && dto.tipo_documento === TipoDocumento.COMPROBANTE_PAGO) {
        await tx.orden.update({
          where: { id: dto.orden_id },
          data: { bloqueado_para_cliente: true },
        });
      }

      return documento;
    });
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

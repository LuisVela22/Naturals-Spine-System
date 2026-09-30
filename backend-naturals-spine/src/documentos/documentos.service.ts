import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
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

  async generarUrlSubida(usuario: { id: string; rol: Rol }, dto: VincularDocumentoDto) {
    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!tiposPermitidos.includes(dto.mime_type)) {
      throw new BadRequestException('RN03: Solo se admiten archivos PDF, JPEG o PNG');
    }

    const maxBytes = 5 * 1024 * 1024;
    if (dto.tamano_bytes > maxBytes) {
      throw new BadRequestException('RN03: El archivo supera el límite máximo permitido de 5MB');
    }

    // Restricción RF08: Solo ADMIN sube facturas y remisiones
    if (
      (dto.tipo_documento === TipoDocumento.FACTURA || dto.tipo_documento === TipoDocumento.REMISION) &&
      usuario.rol !== Rol.ADMIN
    ) {
      throw new ForbiddenException('RF08: Solo el personal de la empresa puede cargar facturas o remisiones');
    }

    // Regla RN05: Si ya cargó comprobante de pago, la orden se vuelve inmutable para el cliente
    if (dto.orden_id && dto.tipo_documento === TipoDocumento.COMPROBANTE_PAGO) {
      const orden = await this.prisma.orden.findUnique({ where: { id: dto.orden_id } });
      if (!orden) {
        throw new NotFoundException('Orden no encontrada');
      }
      if (orden.bloqueado_para_cliente && usuario.rol === Rol.CLIENTE) {
        throw new BadRequestException('RN05: La orden se encuentra inmutable tras la carga del comprobante');
      }
    }

    const rutaGcs = `documentos/${Date.now()}_${dto.nombre_archivo}`;
    const file = this.storage.bucket(this.bucketName).file(rutaGcs);

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: dto.mime_type,
    });

    return {
      uploadUrl,
      rutaGcs,
    };
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

      // RN05: Bloquear modificaciones del cliente si sube comprobante de pago
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
    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }

    const file = this.storage.bucket(this.bucketName).file(doc.url_gcs);
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 5 * 60 * 1000,
    });

    return {
      url: downloadUrl,
      nombre_archivo: doc.nombre_archivo,
      mime_type: doc.mime_type,
    };
  }
}
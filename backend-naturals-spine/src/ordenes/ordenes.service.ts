import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { CambiarEstadoOrdenDto } from './dto/cambiar-estado-orden.dto';
import { EstadoOrden, EstadoValidacion, Rol, TipoDocumento } from '@prisma/client';
import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import * as path from 'path';
import { DocumentosService } from '../documentos/documentos.service';

@Injectable()
export class OrdenesService {
  private readonly storage = new Storage();
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
    private documentosService: DocumentosService,
  ) {}

  async crear(usuarioId: string, dto: CrearOrdenDto) {
    const cliente = await this.prisma.clienteInstitucional.findUnique({ where: { usuario_id: usuarioId } });
    if (!cliente) throw new ForbiddenException('Solo los clientes institucionales pueden registrar órdenes');
    if (cliente.estado_validacion !== EstadoValidacion.APROBADO) {
      throw new ForbiddenException('La cuenta aún no está validada por la empresa.');
    }

    const ordenCreada = await this.prisma.$transaction(async (tx) => {
      const orden = await tx.orden.create({
        data: {
          cliente_id: cliente.id,
          tipo_orden: dto.tipo_orden,
          fecha_requerida: dto.fecha_requerida ? new Date(`${dto.fecha_requerida}T12:00:00-06:00`) : null,
          hora_requerida: dto.hora_requerida,
          ubicacion: dto.ubicacion,
          descripcion_equipo: dto.medico_cirujano?.trim()
            ? `${dto.descripcion_equipo.trim()}\nMédico cirujano: ${dto.medico_cirujano.trim()}`
            : dto.descripcion_equipo,
          monto_total: dto.monto_total,
          estado: EstadoOrden.EN_REVISION,
        },
      });

      await tx.orderLog.create({
        data: {
          orden_id: orden.id,
          usuario_id: usuarioId,
          estado_anterior: EstadoOrden.EN_REVISION,
          estado_nuevo: EstadoOrden.EN_REVISION,
          comentario: 'Apertura inicial de orden médica',
        },
      });
      return orden;
    });

    const clienteConUsuario = await this.prisma.clienteInstitucional.findUnique({
      where: { id: cliente.id },
      include: { usuario: true },
    });
    if (clienteConUsuario?.usuario?.correo_electronico) {
      await this.notificacionesService.enviarConfirmacionOrden(
        clienteConUsuario.usuario.correo_electronico,
        cliente.razon_social,
        ordenCreada,
      );
    }
    await this.notificacionesService.notificarPersonalNuevaOrden(ordenCreada, cliente.razon_social);
    return ordenCreada;
  }

  async transicionarEstado(ordenId: string, usuarioId: string, dto: CambiarEstadoOrdenDto) {
    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
      include: { documentos: true, cliente: { include: { usuario: true } } },
    });
    if (!orden) throw new NotFoundException('Orden no encontrada');

    const estadoActual = orden.estado;
    const nuevoEstado = dto.nuevo_estado;
    const comentario = dto.comentario?.trim();

    const transicionesValidas: Record<EstadoOrden, EstadoOrden[]> = {
      [EstadoOrden.EN_REVISION]: [EstadoOrden.APROBADA, EstadoOrden.CONCLUIDA],
      [EstadoOrden.APROBADA]: [EstadoOrden.EN_ENVIO, EstadoOrden.CONCLUIDA],
      [EstadoOrden.EN_ENVIO]: [EstadoOrden.CONCLUIDA],
      [EstadoOrden.CONCLUIDA]: [],
    };

    if (!transicionesValidas[estadoActual].includes(nuevoEstado)) {
      throw new BadRequestException(`Transición inválida: de ${estadoActual} a ${nuevoEstado}`);
    }

    const tieneRemision = orden.documentos.some((doc) => doc.tipo_documento === TipoDocumento.REMISION);
    const tieneFacturaORemision = orden.documentos.some(
      (doc) => doc.tipo_documento === TipoDocumento.FACTURA || doc.tipo_documento === TipoDocumento.REMISION,
    );
    const tieneComprobantePago = orden.documentos.some(
      (doc) => doc.tipo_documento === TipoDocumento.COMPROBANTE_PAGO,
    );

    if (estadoActual === EstadoOrden.EN_REVISION && nuevoEstado === EstadoOrden.APROBADA && !tieneRemision) {
      throw new BadRequestException('No se puede aceptar la orden sin haber cargado primero la remisión.');
    }

    if (estadoActual === EstadoOrden.EN_REVISION && nuevoEstado === EstadoOrden.CONCLUIDA && !comentario) {
      throw new BadRequestException('Debe indicar el motivo por el que se rechaza la solicitud.');
    }

    if (estadoActual === EstadoOrden.APROBADA && nuevoEstado === EstadoOrden.EN_ENVIO && !tieneComprobantePago) {
      throw new BadRequestException(
        'No se puede pasar la orden a Envío hasta recibir y verificar el comprobante de pago.',
      );
    }

    if (estadoActual === EstadoOrden.APROBADA && nuevoEstado === EstadoOrden.CONCLUIDA && !comentario) {
      throw new BadRequestException('Debe indicar el motivo del rechazo de continuidad de la orden.');
    }

    if (nuevoEstado === EstadoOrden.CONCLUIDA && estadoActual === EstadoOrden.EN_ENVIO && !tieneFacturaORemision) {
      throw new BadRequestException('No se puede concluir la orden sin factura o remisión vinculada.');
    }

    const ordenActualizada = await this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.orden.update({
        where: { id: ordenId },
        data: { estado: nuevoEstado, notificacion_pendiente: true, alerta_24h_enviada: false },
      });

      await tx.orderLog.create({
        data: {
          orden_id: ordenId,
          usuario_id: usuarioId,
          estado_anterior: estadoActual,
          estado_nuevo: nuevoEstado,
          comentario: comentario || 'Actualización de estado por administración',
        },
      });
      return actualizada;
    });

    await this.notificacionesService.procesarAlertasPendientes();
    const correoCliente = orden.cliente?.usuario?.correo_electronico;
    if (correoCliente) {
      await this.notificacionesService.enviarCambioEstadoOrden(
        correoCliente,
        orden.cliente.razon_social,
        { ...ordenActualizada, documentos: orden.documentos },
        estadoActual,
        nuevoEstado,
        comentario,
      );
    }
    return ordenActualizada;
  }

  async consultarHistorial(usuario: any) {
    if (usuario.rol === Rol.ADMIN) {
      return this.prisma.orden.findMany({
        include: {
          cliente: true,
          order_logs: { orderBy: { fecha_cambio: 'desc' }, take: 1, include: { usuario: { select: { personal: { select: { nombre_completo: true } }, cliente: { select: { nombre_contacto: true } }, correo_electronico: true } } } },
          documentos: true,
        },
        orderBy: { fecha_creacion: 'desc' },
      });
    }

    const cliente = await this.prisma.clienteInstitucional.findUnique({ where: { usuario_id: usuario.id } });
    if (!cliente) throw new NotFoundException('Cliente no localizado');

    return this.prisma.orden.findMany({
      where: { cliente_id: cliente.id },
      include: {
        order_logs: { orderBy: { fecha_cambio: 'desc' }, take: 1, include: { usuario: { select: { personal: { select: { nombre_completo: true } }, cliente: { select: { nombre_contacto: true } }, correo_electronico: true } } } },
        documentos: true,
      },
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async consultarNotificaciones() {
    return this.prisma.orderLog.findMany({
      take: 10,
      orderBy: { fecha_cambio: 'desc' },
      include: {
        orden: { select: { id: true, tipo_orden: true, descripcion_equipo: true } },
        usuario: { select: { correo_electronico: true, personal: { select: { nombre_completo: true } }, cliente: { select: { nombre_contacto: true } } } },
      },
    });
  }

  async eliminarConcluida(ordenId: string, usuario: { id: string; rol: Rol }) {
    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
      include: { documentos: true, cliente: true },
    });
    if (!orden) throw new NotFoundException('Orden no encontrada');
    if (orden.estado !== EstadoOrden.CONCLUIDA) {
      throw new BadRequestException('Solo se pueden eliminar órdenes concluidas.');
    }
    if (usuario.rol !== Rol.ADMIN) {
      const cliente = await this.prisma.clienteInstitucional.findUnique({ where: { usuario_id: usuario.id } });
      if (!cliente || cliente.id !== orden.cliente_id) throw new ForbiddenException('No tienes acceso a esta orden.');
    }

    const localDir = path.resolve(process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'storage', 'documentos'));
    const bucket = this.storage.bucket(process.env.GCP_STORAGE_BUCKET_NAME || 'naturals-spine-docs-bucket');
    await Promise.all(orden.documentos.map(async (doc) => {
      try {
        if (doc.url_gcs.startsWith('local/')) {
          await fs.unlink(path.join(localDir, path.basename(doc.url_gcs)));
        } else {
          await bucket.file(doc.url_gcs).delete({ ignoreNotFound: true });
        }
      } catch {
        // La eliminación de la orden no debe dejarse a medias por un objeto ya ausente.
      }
    }));
    await this.prisma.orden.delete({ where: { id: ordenId } });
    return { eliminado: true };
  }

  async enviarAclaracionRenta(ordenId: string, usuarioId: string, detalles: string, file?: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    const orden = await this.prisma.orden.findUnique({ where: { id: ordenId }, include: { cliente: { include: { usuario: true } } } });
    if (!orden) throw new NotFoundException('Orden no encontrada');
    if (orden.tipo_orden !== 'RENTA' || orden.estado !== EstadoOrden.EN_ENVIO) throw new BadRequestException('Las aclaraciones solo aplican a órdenes de renta en envío.');
    if (orden.aclaracion_renta_enviada) throw new BadRequestException('La aclaración de esta orden ya fue enviada.');
    if (!detalles?.trim()) throw new BadRequestException('Escribe las observaciones del equipo rentado.');
    if (file && (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype) || file.size > 5 * 1024 * 1024)) throw new BadRequestException('Adjunta un PDF, JPG o PNG de máximo 5 MB.');
    const personal = await this.prisma.personalEmpresa.findUnique({ where: { usuario_id: usuarioId }, include: { usuario: true } });
    const correoPersonal = personal?.usuario.correo_electronico || '';
    await this.notificacionesService.enviarAclaracionRenta(orden.cliente.usuario.correo_electronico, orden.cliente.razon_social, orden, detalles.trim(), correoPersonal, file);
    if (file) await this.documentosService.guardarAclaracionRenta(usuarioId, ordenId, file);
    return this.prisma.orden.update({ where: { id: ordenId }, data: { detalles_renta: detalles.trim(), archivo_detalles_renta: file?.originalname || null, aclaracion_renta_enviada: true } });
  }
}

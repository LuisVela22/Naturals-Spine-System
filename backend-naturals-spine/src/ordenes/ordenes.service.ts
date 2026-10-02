import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { CambiarEstadoOrdenDto } from './dto/cambiar-estado-orden.dto';
import { EstadoOrden, EstadoValidacion, Rol, TipoDocumento } from '@prisma/client';

@Injectable()
export class OrdenesService {
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
  ) {}

  async crear(usuarioId: string, dto: CrearOrdenDto) {
    const cliente = await this.prisma.clienteInstitucional.findUnique({ where: { usuario_id: usuarioId } });
    if (!cliente) throw new ForbiddenException('Solo los clientes institucionales pueden registrar órdenes');
    if (cliente.estado_validacion !== EstadoValidacion.APROBADO) {
      throw new ForbiddenException('La cuenta no está validada por la empresa (RN01)');
    }

    return this.prisma.$transaction(async (tx) => {
      const orden = await tx.orden.create({
        data: {
          cliente_id: cliente.id,
          tipo_orden: dto.tipo_orden,
          descripcion_equipo: dto.descripcion_equipo,
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
  }

  async transicionarEstado(ordenId: string, usuarioId: string, dto: CambiarEstadoOrdenDto) {
    const orden = await this.prisma.orden.findUnique({
      where: { id: ordenId },
      include: { documentos: true },
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
      throw new BadRequestException('RN-ORDEN: No se puede aceptar la orden sin haber cargado primero la remisión.');
    }

    if (estadoActual === EstadoOrden.EN_REVISION && nuevoEstado === EstadoOrden.CONCLUIDA && !comentario) {
      throw new BadRequestException('Debe indicar el motivo por el que se rechaza la solicitud.');
    }

    if (estadoActual === EstadoOrden.APROBADA && nuevoEstado === EstadoOrden.EN_ENVIO && !tieneComprobantePago) {
      throw new BadRequestException(
        'RN-PAGO: No se puede pasar la orden a Envío hasta recibir y verificar el comprobante de pago.',
      );
    }

    if (estadoActual === EstadoOrden.APROBADA && nuevoEstado === EstadoOrden.CONCLUIDA && !comentario) {
      throw new BadRequestException('Debe indicar el motivo del rechazo de continuidad de la orden.');
    }

    if (nuevoEstado === EstadoOrden.CONCLUIDA && estadoActual === EstadoOrden.EN_ENVIO && !tieneFacturaORemision) {
      throw new BadRequestException('RN04: No se puede concluir la orden sin factura o remisión vinculada');
    }

    const ordenActualizada = await this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.orden.update({
        where: { id: ordenId },
        data: { estado: nuevoEstado, notificacion_pendiente: true },
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
    return ordenActualizada;
  }

  async consultarHistorial(usuario: any) {
    if (usuario.rol === Rol.ADMIN) {
      return this.prisma.orden.findMany({
        include: {
          cliente: true,
          order_logs: { orderBy: { fecha_cambio: 'desc' } },
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
        order_logs: { orderBy: { fecha_cambio: 'desc' } },
        documentos: true,
      },
      orderBy: { fecha_creacion: 'desc' },
    });
  }
}

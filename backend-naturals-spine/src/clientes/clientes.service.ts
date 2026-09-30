import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ValidarClienteDto } from './dto/validar-cliente.dto';
import { EstadoValidacion } from '@prisma/client';

@Injectable()
export class ClientesService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  async listarPendientes() {
    return this.prisma.clienteInstitucional.findMany({
      where: { estado_validacion: EstadoValidacion.PENDIENTE },
      include: {
        usuario: { select: { correo_electronico: true, creado_en: true } },
        documentos: true,
      },
    });
  }

  async resolverValidacion(clienteId: string, dto: ValidarClienteDto) {
    const cliente = await this.prisma.clienteInstitucional.findUnique({
      where: { id: clienteId },
      include: { usuario: true },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente institucional no encontrado');
    }

    if (dto.estado_validacion === EstadoValidacion.RECHAZADO && !dto.motivo_rechazo) {
      throw new BadRequestException('Es obligatorio documentar el motivo del rechazo');
    }

    const clienteActualizado = await this.prisma.$transaction(async (tx) => {
      const cli = await tx.clienteInstitucional.update({
        where: { id: clienteId },
        data: {
          estado_validacion: dto.estado_validacion,
          motivo_rechazo: dto.estado_validacion === EstadoValidacion.RECHAZADO ? dto.motivo_rechazo : null,
        },
      });

      await tx.usuario.update({
        where: { id: cliente.usuario_id },
        data: {
          activo: dto.estado_validacion === EstadoValidacion.APROBADO,
        },
      });

      return cli;
    });

    // Envío del correo en segundo plano
    if (dto.estado_validacion === EstadoValidacion.RECHAZADO) {
      this.notificaciones.enviarNotificacionRechazo(
        cliente.usuario.correo_electronico,
        cliente.razon_social,
        dto.motivo_rechazo!,
      );
    } else if (dto.estado_validacion === EstadoValidacion.APROBADO) {
      this.notificaciones.enviarNotificacionAprobacion(
        cliente.usuario.correo_electronico,
        cliente.razon_social,
      );
    }

    return clienteActualizado;
  }

  async obtenerEstadisticasAdmin() {
    const [totalDocumentos, clientesPendientesCount] = await Promise.all([
      this.prisma.documento.count(),
      this.prisma.clienteInstitucional.count({
        where: { estado_validacion: EstadoValidacion.PENDIENTE },
      }),
    ]);

    return { totalDocumentos, clientesPendientesCount };
  }
}
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { LoginDto } from './dto/login.dto';
import { RegistroClienteDto } from './dto/registro-cliente.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Rol, EstadoValidacion } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificacionesService: NotificacionesService,
  ) {}

  async registrarCliente(dto: RegistroClienteDto) {
    const existeUsuario = await this.prisma.usuario.findUnique({
      where: { correo_electronico: dto.correo_electronico },
    });
    if (existeUsuario) {
      throw new BadRequestException('El correo electrónico ya se encuentra registrado');
    }

    const existeRfc = await this.prisma.clienteInstitucional.findUnique({
      where: { rfc: dto.rfc },
    });
    if (existeRfc) {
      throw new BadRequestException('El RFC ya está registrado en el sistema');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          correo_electronico: dto.correo_electronico,
          password_hash,
          rol: Rol.CLIENTE,
          activo: false,
        },
      });

      const cliente = await tx.clienteInstitucional.create({
        data: {
          usuario_id: usuario.id,
          rfc: dto.rfc,
          razon_social: dto.razon_social,
          nombre_contacto: dto.nombre_contacto,
          telefono: dto.telefono,
          direccion_fiscal: dto.direccion_fiscal,
          estado_validacion: EstadoValidacion.PENDIENTE,
        },
      });

      if (dto.documentos_ids && dto.documentos_ids.length > 0) {
        await tx.documento.updateMany({
          where: { id: { in: dto.documentos_ids } },
          data: { cliente_id: cliente.id },
        });
      }

      return {
        mensaje: 'Solicitud de registro enviada. En espera de validación administrativa por Naturals & Spine.',
        cliente_id: cliente.id,
        estado: EstadoValidacion.PENDIENTE,
      };
    });
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo_electronico: dto.correo_electronico },
      include: { cliente: true, personal: true },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const match = await bcrypt.compare(dto.password, usuario.password_hash);
    if (!match) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (usuario.rol === Rol.CLIENTE) {
      if (!usuario.cliente || usuario.cliente.estado_validacion === EstadoValidacion.PENDIENTE) {
        throw new UnauthorizedException('Su cuenta institucional aún no ha sido aprobada por la empresa');
      }

      if (usuario.cliente.estado_validacion === EstadoValidacion.RECHAZADO) {
        const motivo = usuario.cliente.motivo_rechazo || 'Consulte al personal administrativo';
        throw new UnauthorizedException(`Su solicitud de registro fue rechazada. Motivo: ${motivo}`);
      }
    }

    const payload = {
      sub: usuario.id,
      email: usuario.correo_electronico,
      rol: usuario.rol,
    };

    return {
      access_token: this.jwtService.sign(payload),
      rol: usuario.rol,
      usuario: {
        id: usuario.id,
        correo: usuario.correo_electronico,
        cliente: usuario.cliente,
        personal: usuario.personal,
      },
    };
  }

  async solicitarRecuperacionPassword(correo: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo_electronico: correo },
    });

    if (!usuario) {
      return { mensaje: 'Si el correo está registrado, se ha enviado un enlace de recuperación.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + 3600000); // 1 hora de validez

    await this.prisma.passwordResetToken.create({
      data: {
        token,
        usuario_id: usuario.id,
        expira_en: expiraEn,
      },
    });

    await this.notificacionesService.enviarRecuperacionPassword(correo, token);

    return { mensaje: 'Si el correo está registrado, se ha enviado un enlace de recuperación.' };
  }

  async restablecerPassword(token: string, nuevaPassword: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { usuario: true },
    });

    if (!resetToken || resetToken.expira_en < new Date()) {
      throw new BadRequestException('El enlace de recuperación es inválido o ha expirado');
    }

    const password_hash = await bcrypt.hash(nuevaPassword, 10);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: resetToken.usuario_id },
        data: { password_hash },
      }),
      this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return { mensaje: 'Contraseña actualizada correctamente.' };
  }
}
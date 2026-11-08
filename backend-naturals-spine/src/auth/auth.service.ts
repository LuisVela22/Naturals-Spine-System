import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { LoginDto } from './dto/login.dto';
import { RegistroClienteDto } from './dto/registro-cliente.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Rol, EstadoValidacion, TipoDocumento } from '@prisma/client';
import { Storage } from '@google-cloud/storage';
import { nombreObjetoDocumento } from '../documentos/storage-path';

@Injectable()
export class AuthService {
  private storage = new Storage();
  private bucketName = process.env.GCP_STORAGE_BUCKET_NAME || 'naturals-spine-docs-bucket';

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificacionesService: NotificacionesService,
  ) {}

  async registrarCliente(dto: RegistroClienteDto, files: Array<{ fieldname: string; originalname: string; mimetype: string; size: number; buffer: Buffer }> = []) {
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

    const tipoPorCampo: Record<string, TipoDocumento> = {
      documento_rfc: TipoDocumento.RFC,
      documento_ine: TipoDocumento.INE,
      documento_domicilio: TipoDocumento.COMPROBANTE_DOMICILIO,
    };
    const archivos = files.filter((file) => Boolean(tipoPorCampo[file.fieldname]));
    const requeridos = Object.keys(tipoPorCampo);
    if (requeridos.some((campo) => archivos.filter((file) => file.fieldname === campo).length !== 1)) {
      throw new BadRequestException('Adjunte exactamente una constancia fiscal, identificación oficial y comprobante de domicilio.');
    }
    for (const file of archivos) {
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype) || file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Los documentos deben ser PDF, JPEG o PNG y pesar máximo 5 MB.');
      }
    }

    const password_hash = await bcrypt.hash(dto.password, 10);
    const usuarioId = crypto.randomUUID();
    const clienteId = crypto.randomUUID();
    const local = (process.env.STORAGE_PROVIDER || 'local').toLowerCase() === 'local';
    const localDir = path.resolve(process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'storage', 'documentos'));
    const objetosSubidos: string[] = [];
    const documentos = archivos.map((file) => ({
      file,
      tipo: tipoPorCampo[file.fieldname],
      ruta: local
        ? `local/${Date.now()}_${crypto.randomBytes(6).toString('hex')}_${path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')}`
        : nombreObjetoDocumento(dto.rfc, tipoPorCampo[file.fieldname], file.originalname),
    }));

    try {
      for (const documento of documentos) {
        if (local) {
          await fs.mkdir(localDir, { recursive: true });
          await fs.writeFile(path.join(localDir, path.basename(documento.ruta)), documento.file.buffer);
        } else {
          await this.storage.bucket(this.bucketName).file(documento.ruta).save(documento.file.buffer, {
            resumable: false,
            metadata: { contentType: documento.file.mimetype },
          });
        }
        objetosSubidos.push(documento.ruta);
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.usuario.create({
          data: {
            id: usuarioId,
            correo_electronico: dto.correo_electronico,
            password_hash,
            rol: Rol.CLIENTE,
            activo: false,
          },
        });
        await tx.clienteInstitucional.create({
          data: {
            id: clienteId,
            usuario_id: usuarioId,
            rfc: dto.rfc,
            razon_social: dto.razon_social,
            nombre_contacto: dto.nombre_contacto,
            telefono: dto.telefono,
            direccion_fiscal: dto.direccion_fiscal,
            estado_validacion: EstadoValidacion.PENDIENTE,
          },
        });
        for (const documento of documentos) {
          await tx.documento.create({
            data: {
              cliente_id: clienteId,
              tipo_documento: documento.tipo,
              nombre_archivo: documento.file.originalname,
              url_gcs: documento.ruta,
              mime_type: documento.file.mimetype,
              tamano_bytes: documento.file.size,
              cargado_por: usuarioId,
            },
          });
        }
      });
    } catch (error) {
      await Promise.all(objetosSubidos.map(async (ruta) => {
        try {
          if (local) await fs.unlink(path.join(localDir, path.basename(ruta)));
          else await this.storage.bucket(this.bucketName).file(ruta).delete({ ignoreNotFound: true });
        } catch {}
      }));
      throw error;
    }

    return {
      mensaje: 'Solicitud de registro enviada. En espera de validación administrativa por Naturals & Spine.',
      cliente_id: clienteId,
      estado: EstadoValidacion.PENDIENTE,
    };
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
        modo_oscuro: usuario.modo_oscuro,
      },
    };
  }

  async actualizarModoOscuro(usuarioId: string, modoOscuro: boolean) {
    return this.prisma.usuario.update({ where: { id: usuarioId }, data: { modo_oscuro: modoOscuro }, select: { modo_oscuro: true } });
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

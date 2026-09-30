import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class NotificacionesService implements OnModuleInit {
  private readonly logger = new Logger(NotificacionesService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const user = process.env.MAIL_USER || 'naturals.spine.notificaciones@gmail.com';
    const pass = process.env.MAIL_PASS || 'pziodsgzetdjglaj';

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // Verifica la conexión con Gmail apenas arranca NestJS
  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log('Conexión con el servidor de Gmail establecida y verificada con éxito.');
    } catch (error) {
      this.logger.error('Error al conectar con Gmail SMTP:', error);
    }
  }

  async procesarAlertasPendientes() {
    this.logger.log('Procesando cola de eventos y alertas pendientes...');
    return { procesadas: true };
  }

  async enviarNotificacionRechazo(destinatario: string, razonSocial: string, motivo: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0a2540; padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0;">Naturals & Spine System</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #93c5fd;">Actualización de Solicitud de Registro</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <p>Estimado equipo de <strong>${razonSocial}</strong>,</p>
          <p>Le informamos que tras evaluar la documentación fiscal enviada, su solicitud de cuenta institucional ha sido <strong style="color: #dc2626;">RECHAZADA</strong> (Regla RN01).</p>
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; font-weight: bold; color: #991b1b;">Motivo reportado por Operaciones:</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #7f1d1d;">${motivo}</p>
          </div>
        </div>
      </div>
    `;
    return this.enviarMail(destinatario, 'Actualización sobre su Solicitud de Registro - Naturals & Spine', html);
  }

  async enviarNotificacionAprobacion(destinatario: string, razonSocial: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0a2540; padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0;">Naturals & Spine System</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #93c5fd;">Cuenta Institucional Validada</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <p>Estimado equipo de <strong>${razonSocial}</strong>,</p>
          <p>Su institución ha sido <strong style="color: #16a34a;">APROBADA</strong> exitosamente en nuestra plataforma.</p>
        </div>
      </div>
    `;
    return this.enviarMail(destinatario, '¡Bienvenido! Su cuenta ha sido aprobada - Naturals & Spine', html);
  }

  async enviarRecuperacionPassword(destinatario: string, token: string) {
    const enlace = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0a2540; padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0;">Naturals & Spine System</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #93c5fd;">Recuperación de Contraseña</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <p>Hemos recibido una solicitud para restablecer la contraseña de su cuenta institucional.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${enlace}" style="background-color: #0066cc; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Restablecer Contraseña</a>
          </div>
          <p style="font-size: 12px; color: #64748b;">Si no solicitó este cambio, ignore este mensaje.</p>
        </div>
      </div>
    `;
    return this.enviarMail(destinatario, 'Restablecer su Contraseña - Naturals & Spine', html);
  }

  private async enviarMail(to: string, subject: string, html: string) {
    try {
      this.logger.log(`Iniciando envío de correo a: ${to}...`);
      const info = await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'Naturals & Spine <naturals.spine.notificaciones@gmail.com>',
        to,
        subject,
        html,
      });
      this.logger.log(`Correo enviado exitosamente a ${to}. ID: ${info.messageId}`);
      return info;
    } catch (err: any) {
      this.logger.error(`Error enviando correo a ${to}: ${err.message}`, err.stack);
      throw err;
    }
  }
}
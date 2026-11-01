import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

dotenv.config();

@Injectable()
export class NotificacionesService implements OnModuleInit {
  private readonly logger = new Logger(NotificacionesService.name);
  private transporter: nodemailer.Transporter;
  private alertaTimer: ReturnType<typeof setInterval>;

  constructor(private readonly prisma: PrismaService) {
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
    this.alertaTimer = setInterval(() => { void this.procesarAlertasPendientes(); }, 15 * 60 * 1000);
    try {
      await this.transporter.verify();
      this.logger.log('Conexión con el servidor de Gmail establecida y verificada con éxito.');
    } catch (error) {
      this.logger.error('Error al conectar con Gmail SMTP:', error);
    }
  }

  async procesarAlertasPendientes() {
    const vencimiento = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ordenes = await this.prisma.orden.findMany({ where: { estado: { not: 'CONCLUIDA' }, alerta_24h_enviada: false, fecha_actualizacion: { lte: vencimiento } }, include: { cliente: true } });
    const personal = await this.prisma.personalEmpresa.findMany({ include: { usuario: true } });
    const destinatarios = personal.map((p) => p.usuario.correo_electronico).filter(Boolean).join(',');
    if (!destinatarios) return { procesadas: 0 };
    for (const orden of ordenes) {
      const html = this.plantillaCorreo('Seguimiento de orden pendiente', `<p>La orden <strong>#${orden.id}</strong> de <strong>${this.escapeHtml(orden.cliente.razon_social)}</strong> no ha tenido cambios de estado durante más de 24 horas.</p><p>Estado actual: ${this.etiquetaEstado(orden.estado)}</p><p>Revise la orden desde el panel de gestión.</p>`);
      try {
        await this.enviarMail(destinatarios, `Revisar orden sin cambios por 24 horas #${orden.id}`, html);
        await this.prisma.orden.update({ where: { id: orden.id }, data: { alerta_24h_enviada: true } });
      } catch (error: any) { this.logger.error(`No se pudo enviar alerta de orden ${orden.id}: ${error.message}`); }
    }
    const conFecha = await this.prisma.orden.findMany({ where: { estado: { not: 'CONCLUIDA' }, fecha_requerida: { not: null } }, include: { cliente: true } });
    let prioridadesNotificadas = 0;
    for (const orden of conFecha) {
      const prioridad = this.calcularPrioridad(orden.fecha_requerida!);
      const nivel: Record<string, number> = { BAJA: 0, MEDIA: 1, ALTA: 2 };
      if (nivel[prioridad] <= nivel[orden.prioridad_notificada]) continue;
      const html = this.plantillaCorreo('Cambio de prioridad de orden', `<p>La orden <strong>#${orden.id}</strong> de <strong>${this.escapeHtml(orden.cliente.razon_social)}</strong> requiere una atención más pronta.</p><p>La prioridad cambió de ${orden.prioridad_notificada.toLowerCase()} a <strong>${prioridad.toLowerCase()}</strong>.</p><p>Fecha requerida: ${this.fechaHoraCDMX(orden.fecha_requerida!)}</p>`);
      try {
        await this.enviarMail(destinatarios, `Nueva prioridad ${prioridad.toLowerCase()} - Orden #${orden.id}`, html);
        await this.prisma.orden.update({ where: { id: orden.id }, data: { prioridad_notificada: prioridad } });
        prioridadesNotificadas++;
      } catch (error: any) { this.logger.error(`No se pudo enviar aviso de prioridad de la orden ${orden.id}: ${error.message}`); }
    }
    return { procesadas: ordenes.length, prioridadesNotificadas };
  }

  private calcularPrioridad(fecha: Date) {
    const dias = (fecha.getTime() - Date.now()) / 86400000;
    return dias > 7 ? 'BAJA' : dias >= 3 ? 'MEDIA' : 'ALTA';
  }

  onModuleDestroy() { clearInterval(this.alertaTimer); }

  async notificarPersonalNuevaOrden(orden: any, razonSocial: string) {
    const personal = await this.prisma.personalEmpresa.findMany({ include: { usuario: true } });
    const destinatarios = personal.map((persona) => persona.usuario.correo_electronico).filter(Boolean);
    if (!destinatarios.length) return;
    const html = this.plantillaCorreo('Nueva orden recibida', `<p>Se recibió una nueva solicitud de <strong>${this.escapeHtml(razonSocial)}</strong>.</p><div style="background:#f8fafc;padding:16px;border-radius:8px"><p><strong>Orden:</strong> #${orden.id}</p><p><strong>Operación:</strong> ${orden.tipo_orden === 'RENTA' ? 'Renta' : 'Compra'}</p><p><strong>Estado:</strong> En revisión</p><p><strong>Equipo:</strong> ${this.escapeHtml(orden.descripcion_equipo)}</p><p><strong>Fecha y hora:</strong> ${this.fechaHoraCDMX(orden.fecha_creacion)}</p></div><p>Ingrese al panel para gestionar la solicitud.</p>`);
    return this.enviarMail(destinatarios.join(','), `Nueva orden #${orden.id} pendiente de revisión - Naturals & Spine`, html);
  }

  async notificarPersonalComprobante(ordenId: string) {
    const orden = await this.prisma.orden.findUnique({ where: { id: ordenId }, include: { cliente: true } });
    if (!orden) return;
    const personal = await this.prisma.personalEmpresa.findMany({ include: { usuario: true } });
    const destinatarios = personal.map((persona) => persona.usuario.correo_electronico).filter(Boolean);
    if (!destinatarios.length) return;
    const html = this.plantillaCorreo('Comprobante de pago recibido', `<p>El cliente <strong>${this.escapeHtml(orden.cliente.razon_social)}</strong> adjuntó un comprobante para la orden <strong>#${orden.id}</strong>.</p><p>Revise el archivo desde el panel de gestión para confirmar el pago.</p><p><strong>Fecha y hora:</strong> ${this.fechaHoraCDMX(new Date())}</p>`);
    return this.enviarMail(destinatarios.join(','), `Comprobante recibido para la orden #${orden.id} - Naturals & Spine`, html);
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
          <p>Le informamos que tras evaluar la documentación fiscal enviada, su solicitud de cuenta institucional ha sido <strong style="color: #dc2626;">rechazada</strong>.</p>
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

  async enviarConfirmacionOrden(destinatario: string, razonSocial: string, orden: any) {
    const html = this.plantillaCorreo('Solicitud recibida', `<p>Hola, equipo de <strong>${this.escapeHtml(razonSocial)}</strong>.</p><p>Recibimos su solicitud de orden <strong>#${orden.id}</strong>.</p><div style="background:#f8fafc;padding:16px;border-radius:8px"><p><strong>Tipo:</strong> ${orden.tipo_orden === 'RENTA' ? 'Renta' : 'Compra'}</p><p><strong>Equipo:</strong> ${this.escapeHtml(orden.descripcion_equipo)}</p><p><strong>Estado:</strong> En revisión</p><p><strong>Fecha y hora:</strong> ${this.fechaHoraCDMX(orden.fecha_creacion)}</p></div><p>Le notificaremos cuando el personal actualice el estado de su solicitud.</p>`);
    return this.enviarMail(destinatario, `Confirmación de orden #${orden.id} - Naturals & Spine`, html);
  }

  async enviarCambioEstadoOrden(destinatario: string, razonSocial: string, orden: any, estadoAnterior: string, estadoNuevo: string, comentario?: string) {
    const detalles: Record<string, string> = {
      EN_REVISION: 'La solicitud fue recibida y está pendiente de revisión administrativa.',
      APROBADA: 'La empresa aceptó la orden y adjunta la remisión correspondiente. Revise el documento y los detalles de pago desde su cuenta.',
      EN_ENVIO: 'El pago fue verificado y la orden se encuentra en proceso de envío.',
      CONCLUIDA: comentario ? `La orden fue concluida.` : 'La orden fue concluida por el personal de la empresa.',
    };
    const docs = (orden.documentos || []).filter((d: any) =>
      ['REMISION', 'FACTURA'].includes(d.tipo_documento) &&
      (estadoNuevo === 'APROBADA' ? d.tipo_documento === 'REMISION' : estadoNuevo === 'CONCLUIDA' ? d.tipo_documento === 'FACTURA' : false)
    );
    const attachments: Array<{ filename: string; content: Buffer }> = [];
    const localDir = path.resolve(process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'storage', 'documentos'));
    const storage = new Storage();
    for (const doc of docs) {
      try {
        let content: Buffer;
        if (doc.url_gcs.startsWith('local/')) {
          content = await fs.readFile(path.join(localDir, path.basename(doc.url_gcs)));
        } else {
          const bucket = process.env.GCP_STORAGE_BUCKET_NAME || 'naturals-spine-docs-bucket';
          const [bytes] = await storage.bucket(bucket).file(doc.url_gcs).download();
          content = bytes;
        }
        attachments.push({ filename: doc.nombre_archivo, content });
      } catch (error: any) {
        this.logger.warn(`No se pudo adjuntar ${doc.nombre_archivo} a la notificación: ${error.message}`);
      }
    }
    const anterior = this.etiquetaEstado(estadoAnterior);
    const actual = this.etiquetaEstado(estadoNuevo);
    const html = this.plantillaCorreo('Actualización de orden', `<p>Hola, equipo de <strong>${this.escapeHtml(razonSocial)}</strong>.</p><p>El personal actualizó su orden <strong>#${orden.id}</strong>.</p><div style="background:#f8fafc;padding:16px;border-radius:8px"><p><strong>Estado anterior:</strong> ${anterior}</p><p><strong>Estado actual:</strong> ${actual}</p><p><strong>Fecha y hora:</strong> ${this.fechaHoraCDMX(new Date())}</p></div><p>${detalles[estadoNuevo] || 'Consulte el portal para revisar los detalles de su orden.'}</p>${comentario ? `<p><strong>Observación:</strong> ${this.escapeHtml(comentario)}</p>` : ''}${attachments.length ? `<p>Se adjuntan ${attachments.map(a => this.escapeHtml(a.filename)).join(', ')}.</p>` : ''}<p>Puede consultar la trazabilidad y los documentos disponibles en el portal institucional.</p>`);
    return this.enviarMail(destinatario, `Actualización de orden #${orden.id}: ${actual} - Naturals & Spine`, html, attachments);
  }

  async enviarAclaracionRenta(destinatario: string, razonSocial: string, orden: any, detalles: string, correoPersonal: string, file?: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    const datosTransferencia = '<div style="background:#f8fafc;padding:16px;border-radius:8px"><p><strong>Banco:</strong> Banco Nacional de Pruebas</p><p><strong>Beneficiario:</strong> Naturals &amp; Spine System S.A. de C.V.</p><p><strong>Cuenta:</strong> 1234567890</p><p><strong>CLABE:</strong> 012345678901234567</p><p><strong>Concepto:</strong> Pago por daños de la orden ' + orden.id.substring(0, 8) + '</p></div>';
    const html = this.plantillaCorreo('Información sobre equipo rentado', `<p>Hola, equipo de <strong>${this.escapeHtml(razonSocial)}</strong>.</p><p>Con relación a su orden de renta <strong>#${orden.id}</strong>, el equipo de Naturals &amp; Spine reporta las siguientes observaciones:</p><blockquote style="background:#f8fafc;border-left:4px solid #0066cc;padding:12px">${this.escapeHtml(detalles)}</blockquote><p>Si corresponde un pago por daños, puede realizar la transferencia con estos datos:</p>${datosTransferencia}<p>Para enviar el comprobante o dar seguimiento, contacte directamente a <a href="mailto:${this.escapeHtml(correoPersonal)}">${this.escapeHtml(correoPersonal || 'personal de la empresa')}</a>.</p>`);
    const attachments = file ? [{ filename: file.originalname, content: file.buffer }] : [];
    return this.enviarMail(destinatario, `Aclaración de equipo rentado - Orden #${orden.id}`, html, attachments);
  }

  private etiquetaEstado(estado: string) {
    return ({ EN_REVISION: 'En revisión', APROBADA: 'Aprobada', EN_ENVIO: 'En envío', CONCLUIDA: 'Concluida' } as Record<string, string>)[estado] || estado;
  }
  private fechaHoraCDMX(fecha: Date | string) { return new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'long', timeStyle: 'short' }).format(new Date(fecha)); }
  private escapeHtml(value: string) { return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!); }
  private plantillaCorreo(titulo: string, contenido: string) { return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;color:#334155"><div style="background:#0a2540;padding:24px;text-align:center;color:white"><h2 style="margin:0">Naturals &amp; Spine System</h2><p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${titulo}</p></div><div style="padding:24px;line-height:1.6">${contenido}<p style="font-size:12px;color:#64748b;margin-top:24px">Este mensaje fue enviado por Naturals &amp; Spine System.</p></div></div>`; }

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

  private async enviarMail(to: string, subject: string, html: string, attachments: Array<{ filename: string; content: Buffer }> = []) {
    try {
      this.logger.log(`Iniciando envío de correo a: ${to}...`);
      const info = await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'Naturals & Spine <naturals.spine.notificaciones@gmail.com>',
        to,
        subject,
        html,
        attachments,
      });
      this.logger.log(`Correo enviado exitosamente a ${to}. ID: ${info.messageId}`);
      return info;
    } catch (err: any) {
      this.logger.error(`Error enviando correo a ${to}: ${err.message}`, err.stack);
      throw err;
    }
  }
}

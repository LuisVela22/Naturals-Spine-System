import * as crypto from 'crypto';
import * as path from 'path';
import { TipoDocumento } from '@prisma/client';

const CARPETAS_DOCUMENTOS: Record<TipoDocumento, string> = {
  RFC: 'documentación oficial',
  INE: 'documentación oficial',
  COMPROBANTE_DOMICILIO: 'documentación oficial',
  CONTRATO: 'documentos de respaldo',
  COMPROBANTE_PAGO: 'comprobantes de pago',
  REMISION: 'remisiones',
  FACTURA: 'facturas',
};

const ETIQUETAS_ARCHIVO: Record<TipoDocumento, string> = {
  RFC: 'RFC',
  INE: 'INE',
  COMPROBANTE_DOMICILIO: 'COMPROBANTE-DOMICILIO',
  CONTRATO: 'ORDEN-DE-REFERENCIA',
  COMPROBANTE_PAGO: 'COMPROBANTE-PAGO',
  REMISION: 'REMISION',
  FACTURA: 'FACTURA',
};

function marcaTiempoCDMX() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).reduce<Record<string, string>>((resultado, parte) => {
    if (parte.type !== 'literal') resultado[parte.type] = parte.value;
    return resultado;
  }, {});
  return partes.year + '-' + partes.month + '-' + partes.day + '_' +
    partes.hour + '-' + partes.minute + '-' + partes.second;
}

function rfcSeguro(rfc: string) {
  return rfc.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, '') || 'SIN-RFC';
}

function extensionSegura(nombreOriginal: string) {
  return path.extname(nombreOriginal).toLowerCase();
}

export function carpetaDeDocumento(tipo: TipoDocumento) {
  return CARPETAS_DOCUMENTOS[tipo];
}

export function nombreObjetoDocumento(rfc: string, tipo: TipoDocumento, nombreOriginal: string) {
  const sufijoUnico = crypto.randomBytes(3).toString('hex');
  return CARPETAS_DOCUMENTOS[tipo] + '/' + rfcSeguro(rfc) + '_' +
    ETIQUETAS_ARCHIVO[tipo] + '_' + marcaTiempoCDMX() + '_' + sufijoUnico +
    extensionSegura(nombreOriginal);
}

export function nombreObjetoAclaracion(rfc: string, nombreOriginal: string) {
  const sufijoUnico = crypto.randomBytes(3).toString('hex');
  return 'documentos de aclaraciones/' + rfcSeguro(rfc) + '_ACLARACION_' +
    marcaTiempoCDMX() + '_' + sufijoUnico + extensionSegura(nombreOriginal);
}

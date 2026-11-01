export const etiquetasEstado: Record<string, string> = {
  EN_REVISION: 'En revisión',
  APROBADA: 'Aprobada',
  EN_ENVIO: 'En envío',
  CONCLUIDA: 'Concluida',
};

export const fechaHoraCDMX = (fecha?: string) => fecha
  ? new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short', hour12: true }).format(new Date(fecha))
  : '';

export const normalizarBusqueda = (valor: unknown) => String(valor ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');

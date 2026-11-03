export const etiquetasEstado: Record<string, string> = {
  EN_REVISION: 'En revisión',
  APROBADA: 'Aprobada',
  EN_ENVIO: 'En envío',
  CONCLUIDA: 'Concluida',
  CANCELADA: 'Cancelada',
};

export const fechaHoraCDMX = (fecha?: string) => fecha
  ? new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short', hour12: true }).format(new Date(fecha))
  : '';

export const normalizarBusqueda = (valor: unknown) => String(valor ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');

export const separarDetalleEquipo = (descripcion: string, responsable?: string | null) => {
  const match = descripcion.match(/\n(?:Médico cirujano|Responsable de recibir el equipo):\s*(.+)$/i);
  return { equipo: descripcion.replace(/\n(?:Médico cirujano|Responsable de recibir el equipo):\s*.+$/i, '').trim(), responsable: responsable || match?.[1]?.trim() || '' };
};

export const prioridadOrden = (fecha: string | Date | null | undefined, hora: string | null | undefined, estado: string, ahora = Date.now()) => {
  if (estado === 'CONCLUIDA' || estado === 'CANCELADA') return { color: 'bg-blue-600', etiqueta: 'Sin prioridad', restante: '' };
  if (!fecha) return { color: 'bg-slate-300', etiqueta: 'Sin fecha', restante: '' };
  const solicitud = new Date(fecha);
  if (hora) { const [h, m] = hora.split(':').map(Number); solicitud.setHours(h, m, 0, 0); }
  const ms = solicitud.getTime() - ahora;
  if (ms <= 0 && estado !== 'EN_ENVIO') return { color: 'bg-slate-400', etiqueta: 'Vencida', restante: '' };
  const restante = ms <= 0 ? '' : ms >= 86400000 ? `${Math.floor(ms / 86400000)} d` : `${Math.floor(ms / 3600000)} h ${Math.floor((ms % 3600000) / 60000)} min`;
  const dias = ms / 86400000;
  return { color: dias > 7 ? 'bg-emerald-500' : dias >= 3 ? 'bg-amber-400' : 'bg-red-600', etiqueta: dias > 7 ? 'Baja' : dias >= 3 ? 'Media' : 'Alta', restante };
};

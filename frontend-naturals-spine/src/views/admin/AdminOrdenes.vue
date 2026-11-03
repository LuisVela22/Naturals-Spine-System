<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '../../api/axios';
import { cargarDocumento } from '../../utils/documentos';
import { etiquetasEstado, fechaHoraCDMX, normalizarBusqueda, prioridadOrden, separarDetalleEquipo } from '../../utils/orden';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Truck,
  Upload,
  X,
  XCircle,
} from 'lucide-vue-next';

type Documento = {
  id: string;
  tipo_documento: string;
  nombre_archivo: string;
  mime_type: string;
  tamano_bytes: number;
  fecha_carga?: string;
};

type Orden = {
  id: string;
  tipo_orden: 'COMPRA' | 'RENTA';
  descripcion_equipo: string;
  estado: 'EN_REVISION' | 'APROBADA' | 'EN_ENVIO' | 'CONCLUIDA' | 'CANCELADA';
  monto_total?: number | string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  concluida_en?: string | null;
  oculta_admin?: boolean;
  responsable_recepcion?: string | null;
  cliente?: { id: string; razon_social: string; rfc: string; nombre_contacto: string };
  documentos?: Documento[];
  order_logs?: Array<{ estado_anterior: string; estado_nuevo: string; fecha_cambio: string; comentario?: string | null; usuario?: { rol: string; personal?: { nombre_completo: string } | null; correo_electronico: string } }>;
  fecha_requerida?: string | null;
  hora_requerida?: string | null;
  ubicacion?: string | null;
  detalles_renta?: string | null;
  archivo_detalles_renta?: string | null;
  aclaracion_renta_enviada?: boolean;
};

const ordenes = ref<Orden[]>([]);
const route = useRoute();
const loading = ref(true);
const errorMsg = ref('');
const search = ref('');
const modalOrden = ref<Orden | null>(null);
const comentario = ref('');
const archivo = ref<File | null>(null);
const tipoDocumento = ref<'REMISION' | 'FACTURA'>('REMISION');
const loadingAccion = ref(false);
const mensaje = ref('');
const accionError = ref('');
const detallesRenta = ref('');
const archivoRenta = ref<File | null>(null);
const opcionDetallesRenta = ref<'SIN_DETALLES' | 'CON_DETALLES'>('SIN_DETALLES');
const pagina = ref(1);
const reloj = ref(Date.now());
watch(search, () => { pagina.value = 1; });
const eliminarCuenta = ref(3);
const ordenEliminar = ref<Orden | null>(null);
let timerEliminar: ReturnType<typeof setInterval> | undefined;

const estadoLabel: Record<string, string> = {
  ...etiquetasEstado,
};

const estadoClass: Record<string, string> = {
  EN_REVISION: 'bg-amber-100 text-amber-700',
  APROBADA: 'bg-blue-100 text-blue-700',
  EN_ENVIO: 'bg-sky-100 text-sky-700',
  CONCLUIDA: 'bg-emerald-100 text-emerald-700',
  CANCELADA: 'bg-slate-100 text-slate-700',
};

const documentos = computed(() => modalOrden.value?.documentos || []);
const etiquetaDocumento = (tipo: string) => tipo === 'CONTRATO' ? 'ORDEN_DE_REFERENCIA' : tipo.replaceAll('_', ' ');
const remision = computed(() => documentos.value.find((d) => d.tipo_documento === 'REMISION'));
const comprobantePago = computed(() => documentos.value.find((d) => d.tipo_documento === 'COMPROBANTE_PAGO'));

const cargarOrdenes = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const { data } = await api.get('/ordenes');
    ordenes.value = data;
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'No fue posible consultar las órdenes.';
  } finally {
    loading.value = false;
  }
};

let refresco: ReturnType<typeof setInterval>;
let relojTimer: ReturnType<typeof setInterval>;
const abrirOrdenDeRuta = () => {
  const id = String(route.query.orden || '');
  const orden = ordenes.value.find((o) => o.id === id);
  if (orden) abrirOrden(orden);
};
watch(() => route.query.orden, abrirOrdenDeRuta);
onMounted(async () => {
  await cargarOrdenes();
  abrirOrdenDeRuta();
  refresco = setInterval(async () => { try { const { data } = await api.get('/ordenes'); ordenes.value = data; if (modalOrden.value) modalOrden.value = data.find((o: Orden) => o.id === modalOrden.value?.id) || null; } catch {} }, 15000);
  relojTimer = setInterval(() => { reloj.value = Date.now(); }, 30000);
});
onBeforeUnmount(() => { clearInterval(refresco); clearInterval(relojTimer); clearInterval(timerEliminar); });

const ordenesFiltradas = computed(() => {
  const term = normalizarBusqueda(search.value.trim());
  if (!term) return ordenes.value;
  return ordenes.value.filter((orden) =>
    [orden.id, orden.descripcion_equipo, orden.tipo_orden, orden.estado, estadoLabel[orden.estado], orden.cliente?.razon_social || '', orden.cliente?.rfc || '']
      .some((value) => normalizarBusqueda(value).includes(term)),
  );
});
const paginasTotales = computed(() => Math.max(1, Math.ceil(ordenesFiltradas.value.length / 10)));
const ordenesPagina = computed(() => ordenesFiltradas.value.slice((pagina.value - 1) * 10, pagina.value * 10));
const prioridad = (orden: Orden) => prioridadOrden(orden.fecha_requerida, orden.hora_requerida, orden.estado, reloj.value);
const cumpleRetencion = (orden: Orden) => {
  if (orden.estado !== 'CONCLUIDA') return false;
  const concluida = new Date(orden.concluida_en || orden.fecha_actualizacion);
  const limite = new Date(); limite.setFullYear(limite.getFullYear() - 2);
  return concluida <= limite;
};
const responsableEstado = (orden: Orden) => [...(orden.order_logs || [])].reverse().find((log) => log.usuario?.rol === 'ADMIN' && log.estado_anterior !== log.estado_nuevo)?.usuario?.personal?.nombre_completo || '';
const detalleEquipo = (orden: Orden) => separarDetalleEquipo(orden.descripcion_equipo, orden.responsable_recepcion);
const solicitarEliminarOrden = async (orden: Orden) => {
  if (orden.estado === 'CANCELADA') { await eliminarOrdenConfirmada(orden); return; }
  if (!cumpleRetencion(orden)) return;
  ordenEliminar.value = orden; eliminarCuenta.value = 3; clearInterval(timerEliminar);
  timerEliminar = setInterval(() => { eliminarCuenta.value--; if (eliminarCuenta.value <= 0) clearInterval(timerEliminar); }, 1000);
};
const cancelarEliminacion = () => { ordenEliminar.value = null; clearInterval(timerEliminar); };
const eliminarOrdenConfirmada = async (orden: Orden) => {
  if (orden.estado !== 'CANCELADA' && eliminarCuenta.value > 0) return;
  try { await api.delete(`/ordenes/${orden.id}`); cancelarEliminacion(); await cargarOrdenes(); pagina.value = Math.min(pagina.value, paginasTotales.value); }
  catch (err: any) { errorMsg.value = err.response?.data?.message || 'No fue posible archivar la orden.'; }
};

const abrirOrden = (orden: Orden) => {
  modalOrden.value = orden;
  comentario.value = '';
  archivo.value = null;
  tipoDocumento.value = orden.estado === 'EN_REVISION' ? 'REMISION' : 'FACTURA';
  mensaje.value = '';
  accionError.value = '';
  detallesRenta.value = orden.detalles_renta || '';
  archivoRenta.value = null;
  opcionDetallesRenta.value = orden.detalles_renta ? 'CON_DETALLES' : 'SIN_DETALLES';
};

const cerrarOrden = () => {
  modalOrden.value = null;
  archivo.value = null;
  comentario.value = '';
  mensaje.value = '';
  accionError.value = '';
};

const seleccionarArchivo = (event: Event) => {
  const input = event.target as HTMLInputElement;
  archivo.value = input.files?.[0] || null;
  if (archivo.value && (!['application/pdf', 'image/jpeg', 'image/png'].includes(archivo.value.type) || archivo.value.size > 5 * 1024 * 1024)) {
    accionError.value = 'Adjunta un PDF, JPG o PNG de máximo 5 MB.'; archivo.value = null; input.value = '';
  }
};

const enviarAclaracionRenta = async () => {
  if (!modalOrden.value || !detallesRenta.value.trim()) { accionError.value = 'Escribe las observaciones del equipo rentado.'; return; }
  if (!window.confirm(`Confirma enviar las aclaraciones de la orden${archivoRenta.value ? ` junto con ${archivoRenta.value.name}` : ''}.`)) return;
  const payload = new FormData(); payload.append('detalles', detallesRenta.value.trim());
  if (archivoRenta.value) payload.append('file', archivoRenta.value);
  loadingAccion.value = true; accionError.value = '';
  try {
    const { data } = await api.post(`/ordenes/${modalOrden.value.id}/aclaracion-renta`, payload);
    modalOrden.value.detalles_renta = data.detalles_renta;
    modalOrden.value.archivo_detalles_renta = data.archivo_detalles_renta;
    modalOrden.value.aclaracion_renta_enviada = true;
    mensaje.value = 'Aclaración enviada al correo asociado a la orden.';
  } catch (err: any) { accionError.value = err.response?.data?.message || 'No fue posible enviar la aclaración.'; }
  finally { loadingAccion.value = false; }
};

const subirDocumento = async () => {
  if (!modalOrden.value || !archivo.value) return;
  if (!window.confirm(`Confirma adjuntar ${archivo.value.name} como ${tipoDocumento.value === 'REMISION' ? 'remisión' : 'factura'} a esta orden.`)) return;
  loadingAccion.value = true;
  accionError.value = '';
  mensaje.value = '';

  try {
    await cargarDocumento(archivo.value, tipoDocumento.value, modalOrden.value.id);
    mensaje.value = `${tipoDocumento.value === 'REMISION' ? 'Remisión' : 'Factura'} vinculada correctamente.`;
    archivo.value = null;
    await cargarOrdenes();
    modalOrden.value = ordenes.value.find((o) => o.id === modalOrden.value?.id) || null;
  } catch (err: any) {
    accionError.value = err.response?.data?.message || err.message || 'No fue posible cargar el documento.';
  } finally {
    loadingAccion.value = false;
  }
};

const cambiarEstado = async (nuevoEstado: 'APROBADA' | 'EN_ENVIO' | 'CONCLUIDA') => {
  if (!modalOrden.value) return;
  if (nuevoEstado === 'CONCLUIDA' && !comentario.value.trim()) {
    accionError.value = 'Escribe el motivo antes de rechazar o cerrar la orden.';
    return;
  }

  loadingAccion.value = true;
  accionError.value = '';
  mensaje.value = '';

  try {
    await api.patch(`/ordenes/${modalOrden.value.id}/estado`, {
      nuevo_estado: nuevoEstado,
      comentario: comentario.value.trim() || undefined,
    });
    mensaje.value = nuevoEstado === 'APROBADA'
      ? 'Orden aceptada. La remisión quedó registrada y ahora el cliente puede confirmar el pago.'
      : nuevoEstado === 'EN_ENVIO'
        ? 'Pago verificado. La orden pasó a En envío.'
        : 'La continuidad de la orden fue rechazada y quedó Concluida.';
    comentario.value = '';
    await cargarOrdenes();
    modalOrden.value = ordenes.value.find((o) => o.id === modalOrden.value?.id) || null;
  } catch (err: any) {
    accionError.value = err.response?.data?.message || 'No fue posible actualizar el estado.';
  } finally {
    loadingAccion.value = false;
  }
};

const descargarDocumento = async (documento: Documento) => {
  try {
    const { data } = await api.get(`/documentos/${documento.id}/descarga`);

    if (data.storage === 'local') {
      const localUrl = data.url.startsWith('/api/')
        ? data.url.substring(4)
        : data.url;

      const response = await api.get(localUrl, {
        responseType: 'blob',
      });

      const url = URL.createObjectURL(response.data);

      window.open(url, '_blank', 'noopener,noreferrer');

      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
      window.open(data.url, '_blank', 'noopener,noreferrer');
    }
  } catch (err: any) {
    accionError.value = err.response?.data?.message || 'No fue posible descargar el documento.';
  }
};

const historialResponsables = (orden: Orden) => (orden.order_logs || []).filter((log) => log.usuario?.rol === 'ADMIN' && log.estado_anterior !== log.estado_nuevo);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-slate-800">Gestión de Órdenes</h1>
        <p class="text-xs text-slate-500 mt-1">Seguimiento, remisiones, comprobantes y estados logísticos.</p>
      </div>
      <div class="flex gap-2 w-full sm:w-auto">
        <div class="relative w-full sm:w-72">
          <Search class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input v-model="search" type="search" placeholder="Buscar orden, cliente o equipo..." class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white" />
        </div>
        <button @click="cargarOrdenes" class="p-2 border border-slate-300 bg-white text-slate-600 rounded-lg"><RefreshCw class="w-4 h-4" /></button>
      </div>
    </div>

    <div v-if="errorMsg" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex gap-2">
      <AlertCircle class="w-4 h-4 shrink-0" /> {{ errorMsg }}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
      <div v-if="loading" class="py-10 text-center text-xs text-slate-400">Consultando órdenes...</div>
      <div v-else-if="ordenesFiltradas.length === 0" class="py-10 text-center text-xs text-slate-400">No hay órdenes.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-xs">
          <thead><tr class="text-slate-400 border-b border-slate-100"><th class="pb-3">ID / Fecha</th><th class="pb-3">Cliente</th><th class="pb-3">Equipo / Tipo</th><th class="pb-3 text-center">Prioridad</th><th class="pb-3">Estado</th><th class="pb-3 text-right">Acción</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="orden in ordenesPagina" :key="orden.id">
              <td class="py-3.5"><p class="font-bold text-blue-600">#{{ orden.id.substring(0, 8) }}</p><p class="text-[10px] text-slate-400 mt-1">{{ fechaHoraCDMX(orden.fecha_creacion) }}</p></td>
              <td class="py-3.5"><p class="font-semibold text-slate-800">{{ orden.cliente?.razon_social || 'Cliente' }}</p><p class="text-[10px] text-slate-400">{{ orden.cliente?.rfc }}</p></td>
              <td class="py-3.5"><p class="max-w-[280px] text-slate-700 whitespace-pre-line">{{ detalleEquipo(orden).equipo }}</p><p v-if="detalleEquipo(orden).responsable" class="text-[10px] text-slate-500 mt-1">Recibe: {{ detalleEquipo(orden).responsable }}</p><span class="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">{{ orden.tipo_orden === 'COMPRA' ? 'Compra' : 'Renta' }}</span><div class="flex gap-1 mt-2" aria-label="Progreso de la orden"><span v-for="paso in ['EN_REVISION','APROBADA','EN_ENVIO','CONCLUIDA']" :key="paso" :title="estadoLabel[paso]" class="h-1.5 flex-1 rounded-full" :class="['EN_REVISION','APROBADA','EN_ENVIO','CONCLUIDA'].indexOf(paso) <= ['EN_REVISION','APROBADA','EN_ENVIO','CONCLUIDA'].indexOf(orden.estado) ? 'bg-blue-500' : 'bg-slate-200'"></span><span v-if="orden.estado === 'CANCELADA'" class="h-1.5 flex-1 rounded-full bg-slate-500" :title="estadoLabel.CANCELADA"></span></div></td>
              <td class="py-3.5 text-center"><div class="flex flex-col items-center"><span class="inline-block w-3 h-3 rounded-full" :class="prioridad(orden).color" :title="`Prioridad ${prioridad(orden).etiqueta}`"></span><span v-if="prioridad(orden).restante" class="mt-1 text-[10px] text-slate-500 whitespace-nowrap">{{ prioridad(orden).restante }}</span></div></td>
              <td class="py-3.5"><span :class="estadoClass[orden.estado]" class="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap">{{ estadoLabel[orden.estado] }}</span><p v-if="responsableEstado(orden)" class="mt-1 text-[10px] text-slate-400">{{ responsableEstado(orden) }}</p></td>
              <td class="py-3.5 text-right"><div class="flex justify-end gap-2"><button @click="abrirOrden(orden)" class="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold">Gestionar</button><button v-if="orden.estado === 'CANCELADA' || cumpleRetencion(orden)" @click="solicitarEliminarOrden(orden)" class="px-2 py-1 border border-red-200 text-red-700 rounded">{{ orden.estado === 'CANCELADA' ? 'Eliminar cancelación' : 'Archivar' }}</button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!loading" class="flex justify-center items-center gap-2 mt-4 text-xs"><button @click="pagina = 1" :disabled="pagina === 1" class="px-2 py-1 border rounded disabled:opacity-40">&lt;&lt;</button><button @click="pagina = Math.max(1, pagina - 1)" :disabled="pagina === 1" class="px-2 py-1 border rounded disabled:opacity-40">&lt;</button><span class="font-semibold text-slate-600">{{ pagina }} / {{ paginasTotales }}</span><button @click="pagina = Math.min(paginasTotales, pagina + 1)" :disabled="pagina === paginasTotales" class="px-2 py-1 border rounded disabled:opacity-40">&gt;</button><button @click="pagina = paginasTotales" :disabled="pagina === paginasTotales" class="px-2 py-1 border rounded disabled:opacity-40">&gt;&gt;</button></div>
    </div>

    <div v-if="modalOrden" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div class="bg-[#0a2540] text-white px-5 py-4 flex justify-between items-center">
          <div><p class="text-xs font-bold">Gestión de Orden #{{ modalOrden.id.substring(0, 8) }}</p><p class="text-[10px] text-slate-300">{{ modalOrden.cliente?.razon_social }}</p></div>
          <button @click="cerrarOrden"><X class="w-5 h-5" /></button>
        </div>

        <div class="p-5 space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="bg-slate-50 rounded-xl p-3"><p class="text-[10px] text-slate-400">Estado</p><span :class="estadoClass[modalOrden.estado]" class="inline-block mt-1 px-2 py-1 rounded-full text-[10px] font-bold">{{ estadoLabel[modalOrden.estado] }}</span></div>
            <div class="bg-slate-50 rounded-xl p-3"><p class="text-[10px] text-slate-400">Operación</p><p class="font-bold text-xs mt-1">{{ modalOrden.tipo_orden === 'COMPRA' ? 'Compra' : 'Renta' }}</p></div>
          </div>

          <div class="bg-slate-50 rounded-xl p-4"><p class="text-[10px] text-slate-400">Solicitud</p><p class="text-xs font-semibold text-slate-800 mt-1 whitespace-pre-line">{{ detalleEquipo(modalOrden).equipo }}</p><p v-if="detalleEquipo(modalOrden).responsable" class="text-[11px] text-slate-500 mt-2">Responsable de recibir: {{ detalleEquipo(modalOrden).responsable }}</p></div>
          <div v-if="modalOrden.fecha_requerida || modalOrden.ubicacion" class="grid sm:grid-cols-2 gap-3 text-xs"><div v-if="modalOrden.fecha_requerida" class="bg-blue-50 rounded-xl p-3"><p class="text-[10px] text-blue-500">Fecha y hora requeridas</p><p class="font-semibold mt-1">{{ new Date(modalOrden.fecha_requerida).toLocaleDateString('es-MX',{timeZone:'America/Mexico_City'}) }} {{ modalOrden.hora_requerida || '' }}</p></div><div v-if="modalOrden.ubicacion" class="bg-blue-50 rounded-xl p-3"><p class="text-[10px] text-blue-500">Ubicación</p><p class="font-semibold mt-1">{{ modalOrden.ubicacion }}</p></div></div>
          <section v-if="modalOrden.estado === 'EN_ENVIO'" class="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
            <div><h2 class="text-xs font-bold text-indigo-900">Detalles del equipo médico rentado</h2><p class="text-[10px] text-slate-500 mt-1">La selección queda disponible para órdenes de renta.</p></div>
            <div class="flex gap-4 text-xs"><label class="flex items-center gap-2"><input v-model="opcionDetallesRenta" type="radio" value="SIN_DETALLES" :disabled="modalOrden.tipo_orden !== 'RENTA' || modalOrden.aclaracion_renta_enviada" /> Sin detalles</label><label class="flex items-center gap-2"><input v-model="opcionDetallesRenta" type="radio" value="CON_DETALLES" :disabled="modalOrden.tipo_orden !== 'RENTA' || modalOrden.aclaracion_renta_enviada" /> Con detalles</label><span v-if="modalOrden.tipo_orden === 'COMPRA'" class="text-[10px] text-slate-400">No aplica para compra</span></div>
            <div v-if="opcionDetallesRenta === 'CON_DETALLES'" class="grid sm:grid-cols-[1fr_auto] gap-3 items-end"><div class="space-y-2"><textarea v-model="detallesRenta" rows="4" :disabled="modalOrden.tipo_orden !== 'RENTA' || modalOrden.aclaracion_renta_enviada" placeholder="Indica duración del uso, estado del equipo al salir y al regresar, y cualquier daño o percance durante la renta." class="w-full text-xs p-2.5 border border-slate-300 rounded-lg disabled:bg-slate-100"></textarea><div class="flex flex-wrap items-center gap-2"><input type="file" accept=".pdf,image/jpeg,image/png" :disabled="modalOrden.tipo_orden !== 'RENTA' || modalOrden.aclaracion_renta_enviada" @change="(e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; archivoRenta = f && f.size <= 5*1024*1024 && ['application/pdf','image/jpeg','image/png'].includes(f.type) ? f : null; if (f && !archivoRenta) accionError = 'Adjunta PDF, JPG o PNG de máximo 5 MB.' }" class="text-xs file:mr-2 file:rounded file:border-0 file:bg-indigo-100 file:px-3 file:py-2" /><span v-if="archivoRenta" class="text-[10px] text-slate-500">{{ archivoRenta.name }}</span><span v-else-if="modalOrden.archivo_detalles_renta" class="text-[10px] text-slate-500">{{ modalOrden.archivo_detalles_renta }}</span></div></div><button @click="enviarAclaracionRenta" :disabled="modalOrden.tipo_orden !== 'RENTA' || modalOrden.estado !== 'EN_ENVIO' || modalOrden.aclaracion_renta_enviada || loadingAccion || !detallesRenta.trim()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">{{ modalOrden.aclaracion_renta_enviada ? 'Aclaración enviada' : 'Enviar aclaraciones' }}</button></div>
            <p v-if="modalOrden.aclaracion_renta_enviada" class="text-[10px] text-emerald-700">Enviada. Observaciones: {{ modalOrden.detalles_renta }}</p>
          </section>

          <div v-if="mensaje" class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex gap-2"><CheckCircle2 class="w-4 h-4 shrink-0" /> {{ mensaje }}</div>
          <div v-if="accionError" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex gap-2"><AlertCircle class="w-4 h-4 shrink-0" /> {{ accionError }}</div>

          <section>
            <h2 class="text-xs font-bold text-slate-800 mb-3">Documentos de la orden</h2>
            <div v-if="!documentos.length" class="border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">No hay documentos vinculados.</div>
            <div v-else class="space-y-2">
              <div v-for="doc in documentos" :key="doc.id" class="flex items-center justify-between gap-3 border border-slate-200 rounded-xl p-3">
                <div class="min-w-0"><p class="text-xs font-semibold text-slate-700 truncate">{{ doc.nombre_archivo }}</p><p class="text-[10px] text-slate-400">{{ etiquetaDocumento(doc.tipo_documento) }} · {{ Math.ceil(doc.tamano_bytes / 1024) }} KB</p></div>
                <button @click="descargarDocumento(doc)" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-semibold">Descargar</button>
              </div>
            </div>
          </section>

          <section v-if="modalOrden.estado === 'EN_REVISION'">
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h2 class="text-xs font-bold text-amber-800">1. Remisión obligatoria antes de aceptar</h2>
              <p class="text-[11px] text-amber-700 mt-1">La remisión contiene los productos comprados/rentados y el total que se presentará al cliente.</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mt-3">
              <input type="file" accept=".pdf,image/jpeg,image/png" @change="seleccionarArchivo" class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700" />
              <button @click="subirDocumento" :disabled="!archivo || loadingAccion" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"><Upload class="inline w-4 h-4 mr-1" /> Cargar remisión</button>
            </div>
            <div v-if="remision" class="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">Remisión lista: <strong>{{ remision.nombre_archivo }}</strong>. Ya puedes aceptar la orden.</div>

            <textarea v-model="comentario" rows="2" placeholder="Motivo si vas a rechazar la solicitud..." class="mt-4 w-full text-xs p-2.5 border border-slate-300 rounded-lg"></textarea>
            <div class="flex flex-wrap justify-end gap-2 mt-3">
              <button @click="cambiarEstado('CONCLUIDA')" :disabled="loadingAccion || !comentario.trim()" class="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"><XCircle class="inline w-4 h-4 mr-1" /> Rechazar solicitud</button>
              <button @click="cambiarEstado('APROBADA')" :disabled="loadingAccion || !remision" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"><CheckCircle2 class="inline w-4 h-4 mr-1" /> Aceptar orden</button>
            </div>
          </section>

          <section v-else-if="modalOrden.estado === 'APROBADA'">
            <div class="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h2 class="text-xs font-bold text-blue-800">2. Verificación del comprobante de pago</h2>
              <p class="text-[11px] text-blue-700 mt-1">El cliente debe recibir la remisión, elegir un método de pago y adjuntar un comprobante válido.</p>
            </div>
            <div v-if="comprobantePago" class="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p class="text-xs font-bold text-emerald-800">Comprobante recibido</p>
              <p class="text-[11px] text-emerald-700 mt-1">{{ comprobantePago.nombre_archivo }}</p>
              <p class="text-[10px] text-emerald-700 mt-1">Descárgalo y verifica que el importe y los datos sean correctos antes de liberar el envío.</p>
              <button @click="descargarDocumento(comprobantePago)" class="mt-2 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-[11px] font-bold">Ver comprobante</button>
            </div>
            <div v-else class="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">Aún no se ha recibido un comprobante de pago.</div>

            <textarea v-model="comentario" rows="2" placeholder="Comentario de verificación o motivo de rechazo..." class="mt-4 w-full text-xs p-2.5 border border-slate-300 rounded-lg"></textarea>
            <div class="flex flex-wrap justify-end gap-2 mt-3">
              <button @click="cambiarEstado('CONCLUIDA')" :disabled="loadingAccion || !comentario.trim()" class="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"><XCircle class="inline w-4 h-4 mr-1" /> Rechazar continuidad</button>
              <button @click="cambiarEstado('EN_ENVIO')" :disabled="loadingAccion || !comprobantePago" class="px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"><Truck class="inline w-4 h-4 mr-1" /> Confirmar pago y Envío</button>
            </div>
          </section>

          <section v-else-if="modalOrden.estado === 'EN_ENVIO'">
            <h2 class="text-xs font-bold text-slate-800 mb-2">3. Seguimiento de entrega</h2>
            <p class="text-[11px] text-slate-500 mb-3">La orden ya fue liberada para envío. Puedes cargar factura si corresponde y posteriormente concluirla.</p>
            <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <input type="file" accept=".pdf,image/jpeg,image/png" @change="seleccionarArchivo" class="w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" />
              <button @click="subirDocumento" :disabled="!archivo || loadingAccion" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">Cargar documento</button>
            </div>
            <textarea v-model="comentario" rows="2" placeholder="Comentario de cierre..." class="mt-4 w-full text-xs p-2.5 border border-slate-300 rounded-lg"></textarea>
            <div class="flex justify-end mt-3"><button @click="cambiarEstado('CONCLUIDA')" :disabled="loadingAccion || !comentario.trim()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">Concluir orden</button></div>
          </section>

          <section v-else class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">{{ modalOrden.estado === 'CANCELADA' ? 'El cliente canceló esta orden. Puedes eliminarla del control de órdenes.' : 'La orden está concluida. El historial y los documentos permanecen disponibles para consulta.' }}</section>

          <section class="border-t border-slate-200 pt-4"><h2 class="text-xs font-bold text-slate-800 mb-3">Historial de responsables de estado</h2><div v-if="!historialResponsables(modalOrden).length" class="text-xs text-slate-400">Aún no hay cambios de estado realizados por el personal.</div><ol v-else class="space-y-2"><li v-for="(log, index) in historialResponsables(modalOrden)" :key="index" class="flex items-start justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2"><div><p class="text-xs font-semibold text-slate-700">{{ etiquetasEstado[log.estado_anterior] }} → {{ etiquetasEstado[log.estado_nuevo] }}</p><p class="text-[10px] text-slate-500 mt-1">{{ log.usuario?.personal?.nombre_completo || 'Personal de la empresa' }}</p></div><time class="shrink-0 text-[10px] text-slate-400">{{ fechaHoraCDMX(log.fecha_cambio) }}</time></li></ol></section>

          <div class="flex justify-end pt-2 border-t border-slate-100"><button @click="cerrarOrden" class="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold">Cerrar</button></div>
        </div>
      </div>
    </div>
    <div v-if="ordenEliminar" class="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"><section class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"><h2 class="text-base font-bold text-slate-800">Archivar orden del historial</h2><p class="text-xs text-slate-600">¿Estás seguro de ocultar la orden <strong>#{{ ordenEliminar.id.substring(0,8) }}</strong> de tu control? La orden se conserva para trazabilidad hasta que ambas partes la archiven.</p><div class="flex justify-end gap-2"><button @click="cancelarEliminacion" class="px-4 py-2 border rounded-lg text-xs font-semibold">Cancelar</button><button @click="eliminarOrdenConfirmada(ordenEliminar)" :disabled="eliminarCuenta > 0" class="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">{{ eliminarCuenta > 0 ? `Confirmar (${eliminarCuenta})` : 'Confirmar archivo' }}</button></div></section></div>
  </div>
</template>

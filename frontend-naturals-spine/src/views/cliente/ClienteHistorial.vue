<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import api from '../../api/axios';
import { cargarDocumento } from '../../utils/documentos';
import { AlertCircle, CheckCircle2, Download, Eye, FileText, FolderOpen, Search, Upload, X } from 'lucide-vue-next';

type Documento = {
  id: string;
  tipo_documento: string;
  nombre_archivo: string;
  mime_type: string;
  tamano_bytes: number;
  fecha_carga: string;
};

type Orden = {
  id: string;
  tipo_orden: 'COMPRA' | 'RENTA';
  descripcion_equipo: string;
  estado: 'EN_REVISION' | 'APROBADA' | 'EN_ENVIO' | 'CONCLUIDA';
  bloqueado_para_cliente: boolean;
  monto_total?: number | string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  documentos?: Documento[];
};

const ordenes = ref<Orden[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const search = ref('');
const modalOrden = ref<Orden | null>(null);
const documentos = ref<Documento[]>([]);
const loadingDocs = ref(false);

// Ventana de confirmación/pago de una orden aprobada.
const pagoModal = ref<Orden | null>(null);
const archivoPago = ref<File | null>(null);
const loadingPago = ref(false);
const pagoMsg = ref('');
const pagoError = ref('');
const metodoPago = ref<'TRANSFERENCIA' | 'DEPOSITO'>('TRANSFERENCIA');

const estadoLabel: Record<string, string> = {
  EN_REVISION: 'Pendiente de revisión',
  APROBADA: 'Aprobada / Pendiente de pago',
  EN_ENVIO: 'En envío',
  CONCLUIDA: 'Concluida',
};
const estadoClass: Record<string, string> = {
  EN_REVISION: 'bg-amber-100 text-amber-700',
  APROBADA: 'bg-blue-100 text-blue-700',
  EN_ENVIO: 'bg-sky-100 text-sky-700',
  CONCLUIDA: 'bg-emerald-100 text-emerald-700',
};
const tipoLabel: Record<string, string> = { COMPRA: 'Compra', RENTA: 'Renta' };

const cargarHistorial = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const { data } = await api.get('/ordenes');
    ordenes.value = data;
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'No fue posible consultar el historial de órdenes.';
  } finally {
    loading.value = false;
  }
};

onMounted(cargarHistorial);

const ordenesFiltradas = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return ordenes.value;
  return ordenes.value.filter((orden) =>
    [orden.id, orden.descripcion_equipo, orden.tipo_orden, orden.estado]
      .some((value) => String(value).toLowerCase().includes(term)),
  );
});

const abrirRepositorio = async (orden: Orden) => {
  modalOrden.value = orden;
  documentos.value = [];
  loadingDocs.value = true;
  try {
    const { data } = await api.get(`/documentos/orden/${orden.id}`);
    documentos.value = data;
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'No fue posible consultar los documentos.';
  } finally {
    loadingDocs.value = false;
  }
};

const cerrarRepositorio = () => {
  modalOrden.value = null;
  documentos.value = [];
};

const descargarDocumento = async (documento: Documento) => {
  try {
    const { data } = await api.get(`/documentos/${documento.id}/descarga`);
    if (data.storage === 'local') {
      const response = await api.get(data.url, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
      window.open(data.url, '_blank', 'noopener,noreferrer');
    }
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'No fue posible descargar el documento.';
  }
};

const abrirConfirmacionPago = async (orden: Orden) => {
  pagoModal.value = orden;
  archivoPago.value = null;
  pagoMsg.value = '';
  pagoError.value = '';
  metodoPago.value = 'TRANSFERENCIA';

  // Actualiza documentos para que la ventana muestre la remisión vigente.
  try {
    const { data } = await api.get(`/documentos/orden/${orden.id}`);
    const actualizada = ordenes.value.find((o) => o.id === orden.id);
    if (actualizada) actualizada.documentos = data;
  } catch {
    // La orden puede seguir mostrándose con la información ya disponible.
  }
};

const cerrarConfirmacionPago = () => {
  pagoModal.value = null;
  archivoPago.value = null;
  pagoMsg.value = '';
  pagoError.value = '';
};

const remisionPago = computed(() =>
  pagoModal.value?.documentos?.find((doc) => doc.tipo_documento === 'REMISION') || null,
);

const seleccionarPago = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] || null;
  archivoPago.value = null;
  pagoError.value = '';

  if (!file) return;
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
    pagoError.value = 'El comprobante debe ser PDF, JPEG o PNG.';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    pagoError.value = 'El comprobante no puede superar los 5 MB.';
    return;
  }
  archivoPago.value = file;
};

const enviarComprobantePago = async () => {
  if (!pagoModal.value || !archivoPago.value) {
    pagoError.value = 'Adjunta un comprobante válido antes de enviarlo.';
    return;
  }

  loadingPago.value = true;
  pagoMsg.value = '';
  pagoError.value = '';

  try {
    await cargarDocumento(archivoPago.value, 'COMPROBANTE_PAGO', pagoModal.value.id);
    pagoMsg.value = 'Comprobante recibido. La empresa deberá verificarlo antes de liberar la orden a Envío.';
    archivoPago.value = null;
    await cargarHistorial();

    const actualizada = ordenes.value.find((o) => o.id === pagoModal.value?.id);
    if (actualizada) pagoModal.value = actualizada;
  } catch (err: any) {
    pagoError.value = err.response?.data?.message || err.message || 'No fue posible enviar el comprobante.';
  } finally {
    loadingPago.value = false;
  }
};

const puedePagar = (orden: Orden) =>
  orden.estado === 'APROBADA' && !orden.bloqueado_para_cliente;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

const monto = (orden: Orden) =>
  orden.monto_total != null
    ? `$${Number(orden.monto_total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`
    : 'Total indicado en la remisión';
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div><h1 class="text-xl font-bold text-slate-800">Historial y Documentos</h1><p class="text-xs text-slate-500 mt-1">Consulta la trazabilidad y el repositorio documental de tus órdenes.</p></div>
      <div class="relative w-full sm:w-72"><Search class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input v-model="search" type="search" placeholder="Buscar orden, equipo o estado..." class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white" /></div>
    </div>

    <div v-if="errorMsg" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex gap-2"><AlertCircle class="w-4 h-4 shrink-0" />{{ errorMsg }}</div>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
      <div v-if="loading" class="py-10 text-center text-xs text-slate-400">Consultando historial...</div>
      <div v-else-if="!ordenesFiltradas.length" class="py-10 text-center text-xs text-slate-400"><FolderOpen class="w-8 h-8 mx-auto text-slate-300 mb-2" />No se encontraron órdenes.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-xs">
          <thead><tr class="text-slate-400 border-b border-slate-100"><th class="pb-3">ID / Fecha</th><th class="pb-3">Equipo / Operación</th><th class="pb-3">Estado</th><th class="pb-3">Total</th><th class="pb-3 text-right">Acciones</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="orden in ordenesFiltradas" :key="orden.id">
              <td class="py-4"><p class="font-bold text-blue-600">#{{ orden.id.substring(0, 8) }}</p><p class="text-[10px] text-slate-400 mt-1">{{ formatDate(orden.fecha_creacion) }}</p></td>
              <td class="py-4 max-w-[320px]"><p class="font-semibold text-slate-800">{{ orden.descripcion_equipo }}</p><span class="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">{{ tipoLabel[orden.tipo_orden] }}</span></td>
              <td class="py-4"><span :class="estadoClass[orden.estado]" class="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap">{{ estadoLabel[orden.estado] }}</span></td>
              <td class="py-4 text-slate-600">{{ monto(orden) }}</td>
              <td class="py-4 text-right"><div class="flex justify-end gap-2">
                <button @click="abrirRepositorio(orden)" class="inline-flex items-center px-3 py-1.5 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg text-[11px] font-semibold"><Eye class="w-3.5 h-3.5 mr-1.5" /> Ver Docs</button>
                <button v-if="puedePagar(orden)" @click="abrirConfirmacionPago(orden)" class="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold"><CheckCircle2 class="w-3.5 h-3.5 mr-1.5" /> Confirmar y pagar</button>
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Repositorio documental -->
    <div v-if="modalOrden" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div class="bg-blue-600 text-white px-5 py-4 flex justify-between items-center"><div><p class="text-xs font-bold">Repositorio de la Orden</p><p class="text-[10px] text-blue-100">#{{ modalOrden.id.substring(0, 8) }}</p></div><button @click="cerrarRepositorio"><X class="w-5 h-5" /></button></div>
        <div class="p-5 space-y-5">
          <div class="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">{{ modalOrden.descripcion_equipo }}</div>
          <div><h2 class="text-xs font-bold text-slate-800 mb-3">Documentación disponible</h2>
            <div v-if="loadingDocs" class="py-5 text-center text-xs text-slate-400">Consultando documentos...</div>
            <div v-else-if="!documentos.length" class="py-5 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">No hay documentos vinculados.</div>
            <div v-else class="space-y-2">
              <div v-for="doc in documentos" :key="doc.id" class="flex items-center justify-between gap-3 border border-slate-200 rounded-xl p-3"><div class="min-w-0"><p class="text-xs font-semibold text-slate-700 truncate">{{ doc.nombre_archivo }}</p><p class="text-[10px] text-slate-400">{{ doc.tipo_documento }} · {{ Math.ceil(doc.tamano_bytes / 1024) }} KB</p></div><button @click="descargarDocumento(doc)" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-semibold"><Download class="inline w-3.5 h-3.5 mr-1" /> Descargar</button></div>
            </div>
          </div>
          <div class="flex justify-end"><button @click="cerrarRepositorio" class="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold">Cerrar</button></div>
        </div>
      </div>
    </div>

    <!-- Confirmación y métodos de pago -->
    <div v-if="pagoModal" class="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div class="bg-[#0a2540] text-white px-5 py-4 flex justify-between items-center"><div><p class="text-xs font-bold">Confirmación de Orden</p><p class="text-[10px] text-slate-300">#{{ pagoModal.id.substring(0, 8) }}</p></div><button @click="cerrarConfirmacionPago"><X class="w-5 h-5" /></button></div>
        <div class="p-5 space-y-5">
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4"><p class="text-xs font-bold text-blue-800">La empresa aceptó tu solicitud</p><p class="text-[11px] text-blue-700 mt-1">Revisa la remisión, verifica el total y realiza el pago mediante uno de los métodos indicados.</p></div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="bg-slate-50 rounded-xl p-3 sm:col-span-2"><p class="text-[10px] text-slate-400">Equipo / solicitud</p><p class="text-xs font-semibold text-slate-800 mt-1">{{ pagoModal.descripcion_equipo }}</p></div>
            <div class="bg-emerald-50 rounded-xl p-3"><p class="text-[10px] text-emerald-700">Total</p><p class="text-sm font-extrabold text-emerald-800 mt-1">{{ monto(pagoModal) }}</p></div>
          </div>

          <div class="border border-slate-200 rounded-xl p-4">
            <div class="flex items-center justify-between gap-3"><div><h2 class="text-xs font-bold text-slate-800">Remisión de la orden</h2><p class="text-[10px] text-slate-500 mt-1">Documento emitido por Naturals & Spine con el detalle de los productos y el total.</p></div><button v-if="remisionPago" @click="descargarDocumento(remisionPago)" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold"><Download class="inline w-3.5 h-3.5 mr-1" /> Ver remisión</button></div>
            <div v-if="remisionPago" class="mt-3 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{{ remisionPago.nombre_archivo }}</div>
            <div v-else class="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">La remisión todavía no está disponible. Contacta a la empresa antes de realizar el pago.</div>
          </div>

          <div class="border border-slate-200 rounded-xl p-4">
            <h2 class="text-xs font-bold text-slate-800 mb-3">Método de pago</h2>
            <div class="grid grid-cols-2 gap-2 mb-4"><button @click="metodoPago = 'TRANSFERENCIA'" :class="metodoPago === 'TRANSFERENCIA' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'" class="py-2 rounded-lg text-xs font-bold border border-slate-200">Transferencia</button><button @click="metodoPago = 'DEPOSITO'" :class="metodoPago === 'DEPOSITO' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'" class="py-2 rounded-lg text-xs font-bold border border-slate-200">Depósito</button></div>
            <div v-if="metodoPago === 'TRANSFERENCIA'" class="bg-slate-50 rounded-xl p-4 text-xs space-y-1"><p><strong>Banco:</strong> Banco Nacional de Pruebas</p><p><strong>Beneficiario:</strong> Naturals & Spine System S.A. de C.V.</p><p><strong>Cuenta:</strong> 1234567890</p><p><strong>CLABE:</strong> 012345678901234567</p><p><strong>Concepto:</strong> Orden #{{ pagoModal.id.substring(0, 8) }}</p></div>
            <div v-else class="bg-slate-50 rounded-xl p-4 text-xs space-y-1"><p><strong>Banco:</strong> Banco Nacional de Pruebas</p><p><strong>Beneficiario:</strong> Naturals & Spine System S.A. de C.V.</p><p><strong>Sucursal:</strong> 0001 - Centro</p><p><strong>Cuenta para depósito:</strong> 1234567890</p><p><strong>Referencia:</strong> NSP-{{ pagoModal.id.substring(0, 8).toUpperCase() }}</p></div>
            <p class="text-[10px] text-amber-700 mt-3">Datos ficticios para pruebas. Serán sustituidos por los datos reales antes de cualquier uso operativo.</p>
          </div>

          <div v-if="pagoMsg" class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex gap-2"><CheckCircle2 class="w-4 h-4 shrink-0" />{{ pagoMsg }}</div>
          <div v-if="pagoError" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex gap-2"><AlertCircle class="w-4 h-4 shrink-0" />{{ pagoError }}</div>

          <div class="border-t border-slate-100 pt-4">
            <h2 class="text-xs font-bold text-slate-800 mb-1">Comprobante de pago</h2>
            <p class="text-[10px] text-slate-500 mb-3">Solo se aceptan PDF, JPEG o PNG de máximo 5 MB.</p>
            <input type="file" accept=".pdf,image/jpeg,image/png" @change="seleccionarPago" class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700" />
            <p v-if="archivoPago" class="text-[10px] text-slate-500 mt-2">Seleccionado: {{ archivoPago.name }}</p>
          </div>

          <div class="flex justify-end gap-2 pt-2"><button @click="cerrarConfirmacionPago" class="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-semibold">Cerrar</button><button @click="enviarComprobantePago" :disabled="!archivoPago || loadingPago || !remisionPago || pagoModal.bloqueado_para_cliente" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"><Upload class="inline w-4 h-4 mr-1" />{{ loadingPago ? 'Enviando...' : 'Enviar comprobante a la empresa' }}</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

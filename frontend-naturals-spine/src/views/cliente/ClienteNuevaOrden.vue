<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/axios';
import { cargarDocumento } from '../../utils/documentos';
import { ArrowLeft, Send, ShoppingCart, CalendarDays, Stethoscope, MapPin, CheckCircle2, AlertCircle } from 'lucide-vue-next';

const router = useRouter();

const tipoOrden = ref<'COMPRA' | 'RENTA' | ''>('');
const descripcionEquipo = ref('');
const fechaRequerida = ref('');
const horaRequerida = ref('');
const responsableRecibir = ref('');
const ubicacion = ref('');
const documentoRespaldo = ref<File | null>(null);
const documentoInput = ref<HTMLInputElement | null>(null);

const loading = ref(false);
const exito = ref(false);
const errorMsg = ref('');
const ordenCreada = ref('');
const confirmarEnvio = ref(false);
const cuentaRegresiva = ref(3);
let temporizador: ReturnType<typeof setInterval> | undefined;
const direccionSugerencias = ref<string[]>([]);
let timerDireccion: ReturnType<typeof setTimeout> | undefined;
const direccionCargando = ref(false);
const fechaHoraVista = computed(() => `${fechaRequerida.value || 'Sin fecha'}${horaRequerida.value ? ` · ${horaRequerida.value}` : ''}`);

const buscarDireccion = () => {
  clearTimeout(timerDireccion);
  if (ubicacion.value.trim().length < 4) { direccionSugerencias.value = []; return; }
  timerDireccion = setTimeout(async () => {
    direccionCargando.value = true;
    try {
      const params = new URLSearchParams({ q: ubicacion.value, format: 'jsonv2', addressdetails: '1', countrycodes: 'mx', limit: '5' });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'es-MX' } });
      direccionSugerencias.value = (await res.json()).map((x: any) => x.display_name);
    } catch { direccionSugerencias.value = []; } finally { direccionCargando.value = false; }
  }, 350);
};
const elegirDireccion = (direccion: string) => { ubicacion.value = direccion; direccionSugerencias.value = []; };
onBeforeUnmount(() => { clearInterval(temporizador); clearTimeout(timerDireccion); });

const handleFile = (event: Event) => {
  const input = event.target as HTMLInputElement;
  documentoRespaldo.value = input.files?.[0] || null;
  if (documentoRespaldo.value && (documentoRespaldo.value.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(documentoRespaldo.value.type))) {
    errorMsg.value = 'Adjunta un PDF, JPG o PNG de máximo 5 MB.';
    documentoRespaldo.value = null;
    input.value = '';
  }
};

const handleSubmit = async () => {
  errorMsg.value = '';

  if (!tipoOrden.value || !descripcionEquipo.value.trim() || !fechaRequerida.value || !horaRequerida.value || !ubicacion.value.trim()) {
    errorMsg.value = 'Completa el tipo de operación, equipo, fecha, hora y ubicación requeridos.';
    return;
  }

  confirmarEnvio.value = true;
  cuentaRegresiva.value = 3;
  clearInterval(temporizador);
  temporizador = setInterval(() => {
    cuentaRegresiva.value -= 1;
    if (cuentaRegresiva.value <= 0) clearInterval(temporizador);
  }, 1000);
};

const enviarOrdenConfirmada = async () => {
  if (cuentaRegresiva.value > 0) return;
  confirmarEnvio.value = false;
  loading.value = true;

  try {
    const { data } = await api.post('/ordenes', {
      tipo_orden: tipoOrden.value,
      descripcion_equipo: descripcionEquipo.value.trim(),
      fecha_requerida: fechaRequerida.value || undefined,
      hora_requerida: horaRequerida.value || undefined,
      ubicacion: ubicacion.value.trim() || undefined,
      responsable_recepcion: responsableRecibir.value.trim() || undefined,
    });

    if (documentoRespaldo.value) {
      await cargarDocumento(documentoRespaldo.value, 'CONTRATO', data.id);
    }

    ordenCreada.value = data.id;
    exito.value = true;
  } catch (err: any) {
    errorMsg.value =
      err.response?.data?.message ||
      err.message ||
      'No fue posible registrar la orden.';
  } finally {
    loading.value = false;
  }
};
const cancelarConfirmacion = () => { confirmarEnvio.value = false; clearInterval(temporizador); };

const nuevaSolicitud = () => {
  tipoOrden.value = '';
  descripcionEquipo.value = '';
  fechaRequerida.value = '';
  horaRequerida.value = '';
  responsableRecibir.value = '';
  ubicacion.value = '';
  documentoRespaldo.value = null;
  if (documentoInput.value) documentoInput.value.value = '';
  ordenCreada.value = '';
  exito.value = false;
  errorMsg.value = '';
};
</script>

<template>
  <div class="space-y-6 max-w-5xl">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800">Registrar Orden</h1>
        <p class="text-xs text-slate-500 mt-1">
          Genera una nueva solicitud de compra o renta de equipo médico.
        </p>
      </div>
      <button
        type="button"
        @click="router.push('/cliente/dashboard')"
        class="inline-flex items-center px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
      >
        <ArrowLeft class="w-4 h-4 mr-1.5" />
        Volver al resumen
      </button>
    </div>

    <div
      v-if="exito"
      class="bg-emerald-50 border border-emerald-200 rounded-2xl p-6"
    >
      <div class="flex items-start gap-3">
        <CheckCircle2 class="w-6 h-6 text-emerald-600 shrink-0" />
        <div>
          <h2 class="font-bold text-emerald-800 text-sm">Solicitud registrada correctamente</h2>
          <p class="text-xs text-emerald-700 mt-1">
            La orden quedó <strong>En revisión</strong> para ser atendida por Naturals & Spine System.
          </p>
          <p class="text-[11px] text-emerald-700 mt-2">
            ID de orden: <strong>#{{ ordenCreada.substring(0, 8) }}</strong>
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-5">
        <button
          type="button"
          @click="router.push('/cliente/historial')"
          class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
        >
          Ver historial
        </button>
        <button
          type="button"
          @click="nuevaSolicitud"
          class="px-4 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-xs font-bold"
        >
          Registrar otra orden
        </button>
      </div>
    </div>

    <form
      v-else
      @submit.prevent="handleSubmit"
      class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div class="bg-blue-600 text-white px-5 py-3 flex items-center gap-2">
        <ShoppingCart class="w-4 h-4" />
        <span class="text-xs font-bold">Registrar Nueva Orden de Compra/Renta</span>
      </div>

      <div class="p-5 md:p-6 space-y-6">
        <div
          v-if="errorMsg"
          class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-start gap-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ errorMsg }}</span>
        </div>

        <p class="text-[11px] text-slate-500">
          Complete los datos para generar una nueva solicitud logística. La orden será enviada a revisión
          por el personal de Naturals & Spine System.
        </p>

        <section>
          <h2 class="text-xs font-bold text-blue-700 mb-3">Datos de la solicitud</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">
                Tipo de Operación *
              </label>
              <select
                v-model="tipoOrden"
                required
                class="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-600 focus:outline-none"
              >
                <option value="" disabled>Seleccione el tipo...</option>
                <option value="COMPRA">Compra</option>
                <option value="RENTA">Renta</option>
              </select>
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 mb-1">Equipo Médico Solicitado *</label>
              <textarea v-model="descripcionEquipo" required rows="5" placeholder="Describa el equipo médico solicitado, características y cantidad" class="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none resize-y"></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Fecha Requerida *</label>
              <div class="relative"><CalendarDays class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input v-model="fechaRequerida" type="date" required class="w-full pl-9 text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none" /></div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Hora requerida *</label>
              <input v-model="horaRequerida" type="time" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">
                Responsable de recibir el equipo
              </label>
              <div class="relative">
                <Stethoscope class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  v-model="responsableRecibir"
                  type="text"
                  placeholder="Nombre de quien recibirá el equipo"
                  class="w-full pl-9 text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 mb-1">
                Ubicación *
              </label>
              <div class="relative">
                <MapPin class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  v-model="ubicacion"
                  type="text"
                  required
                  @input="buscarDireccion"
                  placeholder="Dirección de entrega del equipo"
                  class="w-full pl-9 text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
                <div v-if="direccionCargando" class="absolute z-10 top-full bg-white border rounded-lg p-2 text-xs text-slate-400 w-full">Buscando direcciones…</div>
                <div v-else-if="direccionSugerencias.length" class="absolute z-20 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg w-full max-h-56 overflow-auto">
                  <button v-for="direccion in direccionSugerencias" :key="direccion" type="button" @click="elegirDireccion(direccion)" class="block text-left w-full px-3 py-2 text-xs text-slate-700 hover:bg-blue-50">{{ direccion }}</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h2 class="text-xs font-bold text-slate-700 mb-1">Documento de respaldo</h2>
          <p class="text-[11px] text-slate-500 mb-3">
            Se aceptan PDF, JPG o PNG de hasta 5 MB.
          </p>
          <input
            ref="documentoInput"
            @change="handleFile"
            type="file"
            accept=".pdf,image/jpeg,image/png"
            class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
          />
          <p v-if="documentoRespaldo" class="text-[10px] text-slate-500 mt-2">
            Seleccionado: {{ documentoRespaldo.name }}
            <button type="button" @click="documentoRespaldo = null; if (documentoInput) documentoInput.value = ''" class="ml-2 text-red-600 underline">Quitar archivo</button>
          </p>
        </section>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            @click="router.push('/cliente/dashboard')"
            class="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="inline-flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
          >
            <Send class="w-4 h-4 mr-2" />
            {{ loading ? 'Enviando Solicitud...' : 'Enviar Solicitud al Proveedor' }}
          </button>
        </div>
      </div>
    </form>
  </div>
  <div v-if="confirmarEnvio" class="fixed inset-0 z-[70] bg-slate-900/60 flex items-center justify-center p-4">
    <section class="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4">
      <h2 class="text-base font-bold text-slate-800">Revisa tu solicitud antes de enviarla</h2>
      <p class="text-xs text-slate-600">Verifica cuidadosamente los datos. Cancela si necesitas corregir algún campo.</p>
      <dl class="grid grid-cols-2 gap-3 text-xs"><div><dt class="text-slate-400">Operación</dt><dd class="font-semibold">{{ tipoOrden }}</dd></div><div><dt class="text-slate-400">Fecha y hora requerida</dt><dd class="font-semibold">{{ fechaHoraVista }}</dd></div><div class="col-span-2"><dt class="text-slate-400">Equipo solicitado</dt><dd class="font-semibold whitespace-pre-wrap">{{ descripcionEquipo }}</dd></div><div><dt class="text-slate-400">Responsable de recibir</dt><dd class="font-semibold">{{ responsableRecibir || 'No indicado' }}</dd></div><div><dt class="text-slate-400">Ubicación</dt><dd class="font-semibold">{{ ubicacion }}</dd></div></dl>
      <p v-if="documentoRespaldo" class="text-xs text-slate-600">Archivo adjunto: {{ documentoRespaldo.name }}</p>
      <div class="flex justify-end gap-2"><button type="button" @click="cancelarConfirmacion" class="px-4 py-2 border rounded-lg text-xs font-semibold">Cancelar y revisar</button><button type="button" @click="enviarOrdenConfirmada" :disabled="cuentaRegresiva > 0 || loading" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">{{ loading ? 'Enviando…' : cuentaRegresiva > 0 ? `Confirmar (${cuentaRegresiva})` : 'Confirmar y enviar orden' }}</button></div>
    </section>
  </div>
</template>

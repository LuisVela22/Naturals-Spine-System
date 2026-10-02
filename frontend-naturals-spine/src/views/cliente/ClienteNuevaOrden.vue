<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/axios';
import { ArrowLeft, Send, ShoppingCart, CalendarDays, Stethoscope, MapPin, CheckCircle2, AlertCircle } from 'lucide-vue-next';

const router = useRouter();

const tipoOrden = ref<'COMPRA' | 'RENTA' | ''>('');
const descripcionEquipo = ref('');
const fechaRequerida = ref('');
const medicoCirujano = ref('');
const ubicacion = ref('');
const documentoRespaldo = ref<File | null>(null);

const loading = ref(false);
const exito = ref(false);
const errorMsg = ref('');
const ordenCreada = ref('');

const handleFile = (event: Event) => {
  const input = event.target as HTMLInputElement;
  documentoRespaldo.value = input.files?.[0] || null;

  if (documentoRespaldo.value && documentoRespaldo.value.size > 5 * 1024 * 1024) {
    errorMsg.value = 'El documento supera el límite de 5 MB.';
    documentoRespaldo.value = null;
  }
};

const handleSubmit = async () => {
  errorMsg.value = '';

  if (!tipoOrden.value || !descripcionEquipo.value.trim()) {
    errorMsg.value = 'Completa el tipo de operación y la descripción del equipo.';
    return;
  }

  loading.value = true;

  try {
    /*
     * El DTO actual del backend solo acepta:
     * tipo_orden, descripcion_equipo y monto_total.
     * Para no enviar campos que NestJS rechazaría por forbidNonWhitelisted,
     * los datos contextuales del mockup se incorporan a la descripción.
     */
    const contexto = [
      `Equipo solicitado: ${descripcionEquipo.value.trim()}`,
      fechaRequerida.value ? `Fecha requerida: ${fechaRequerida.value}` : '',
      medicoCirujano.value ? `Médico cirujano: ${medicoCirujano.value.trim()}` : '',
      ubicacion.value ? `Ubicación/quirófano: ${ubicacion.value.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const { data } = await api.post('/ordenes', {
      tipo_orden: tipoOrden.value,
      descripcion_equipo: contexto,
    });

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

const nuevaSolicitud = () => {
  tipoOrden.value = '';
  descripcionEquipo.value = '';
  fechaRequerida.value = '';
  medicoCirujano.value = '';
  ubicacion.value = '';
  documentoRespaldo.value = null;
  ordenCreada.value = '';
  exito.value = false;
  errorMsg.value = '';
};
</script>

<template>
  <div class="space-y-6 max-w-5xl">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800">Registrar Orden (CU04)</h1>
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
            La orden quedó en estado <strong>EN_REVISION</strong> para ser atendida por Naturals & Spine System.
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

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">
                Equipo Médico Solicitado *
              </label>
              <input
                v-model="descripcionEquipo"
                required
                type="text"
                placeholder="Ej. Sistema de instrumentación lumbar"
                class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">
                Fecha Requerida
              </label>
              <div class="relative">
                <CalendarDays class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  v-model="fechaRequerida"
                  type="date"
                  class="w-full pl-9 text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">
                Médico Cirujano (Opcional)
              </label>
              <div class="relative">
                <Stethoscope class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  v-model="medicoCirujano"
                  type="text"
                  placeholder="Nombre del cirujano"
                  class="w-full pl-9 text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 mb-1">
                Ubicación / Quirófano (Opcional)
              </label>
              <div class="relative">
                <MapPin class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  v-model="ubicacion"
                  type="text"
                  placeholder="Ej. Quirófano 2, Hospital Ángeles del Sur"
                  class="w-full pl-9 text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        <section class="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h2 class="text-xs font-bold text-slate-700 mb-1">Documento de respaldo</h2>
          <p class="text-[11px] text-slate-500 mb-3">
            El mockup contempla adjuntar la orden institucional. El backend actual no define un tipo
            documental específico para "orden de compra"; por ello esta selección se conserva como parte
            de la interfaz, pero no se envía todavía a la API.
          </p>
          <input
            @change="handleFile"
            type="file"
            accept=".pdf"
            class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
          />
          <p v-if="documentoRespaldo" class="text-[10px] text-slate-500 mt-2">
            Seleccionado: {{ documentoRespaldo.name }}
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
</template>

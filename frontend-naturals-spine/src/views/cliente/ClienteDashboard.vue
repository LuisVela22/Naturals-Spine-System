<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '../../api/axios';
import { Bed, Truck, FileCheck, Bell } from 'lucide-vue-next';

const ordenes = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await api.get('/ordenes');
    ordenes.value = data;
  } catch (err) {
    console.error('Error al cargar órdenes del cliente:', err);
  } finally {
    loading.value = false;
  }
});

const equiposEnRenta = computed(() => {
  return ordenes.value.filter(
    (o) => o.tipo_orden === 'RENTA' && (o.estado === 'EN_ENVIO' || o.estado === 'APROBADA'),
  ).length;
});

const ordenesEnTramite = computed(() => {
  return ordenes.value.filter((o) => o.estado !== 'CONCLUIDA').length;
});

const facturasListas = computed(() => {
  return ordenes.value.reduce((total, ord) => {
    const docsFactura = ord.documentos?.filter((d: any) => d.tipo_documento === 'FACTURA') || [];
    return total + docsFactura.length;
  }, 0);
});
</script>

<template>
  <div class="space-y-6 w-full max-w-full">
    <h1 class="text-lg md:text-xl font-bold text-slate-800">Resumen Operativo</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div class="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-medium text-slate-500">Equipos Activos en Renta</p>
          <p class="text-xl md:text-2xl font-black text-slate-800 mt-1">
            {{ equiposEnRenta }}
          </p>
        </div>
        <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
          <Bed class="w-5 h-5" />
        </div>
      </div>

      <div class="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-medium text-slate-500">Órdenes en Trámite</p>
          <p class="text-xl md:text-2xl font-black text-slate-800 mt-1">
            {{ ordenesEnTramite }}
          </p>
        </div>
        <div class="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
          <Truck class="w-5 h-5" />
        </div>
      </div>

      <div class="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between sm:col-span-2 md:col-span-1">
        <div>
          <p class="text-xs font-medium text-slate-500">Facturas Listas para Descarga</p>
          <p class="text-xl md:text-2xl font-black text-slate-800 mt-1">
            {{ facturasListas }}
          </p>
        </div>
        <div class="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
          <FileCheck class="w-5 h-5" />
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
      <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
        <Bell class="w-4 h-4 mr-2 text-blue-600" /> Mis Pedidos Recientes
      </h2>

      <div v-if="loading" class="text-xs text-slate-400 py-6 text-center">
        Consultando información...
      </div>

      <div v-else class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <table class="w-full min-w-[500px] text-left text-xs">
          <thead>
            <tr class="text-slate-400 border-b border-slate-100">
              <th class="pb-3 font-semibold">ID Orden</th>
              <th class="pb-3 font-semibold">Detalle del Equipo</th>
              <th class="pb-3 font-semibold">Fecha Solicitud</th>
              <th class="pb-3 font-semibold text-right">Estado de Naturals & Spine</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="ordenes.length === 0">
              <td colspan="4" class="py-6 text-center text-slate-400">
                No tienes solicitudes u órdenes activas en el sistema.
              </td>
            </tr>
            <tr v-for="ord in ordenes" :key="ord.id">
              <td class="py-3.5 font-bold text-blue-600 whitespace-nowrap">#{{ ord.id.substring(0, 8) }}</td>
              <td class="py-3.5 font-medium text-slate-800">{{ ord.descripcion_equipo }} ({{ ord.tipo_orden }})</td>
              <td class="py-3.5 text-slate-500 whitespace-nowrap">{{ new Date(ord.fecha_creacion).toLocaleDateString() }}</td>
              <td class="py-3.5 text-right whitespace-nowrap">
                <span 
                  :class="{
                    'bg-amber-100 text-amber-700': ord.estado === 'EN_REVISION',
                    'bg-blue-100 text-blue-700': ord.estado === 'APROBADA',
                    'bg-sky-100 text-sky-700': ord.estado === 'EN_ENVIO',
                    'bg-emerald-100 text-emerald-700': ord.estado === 'CONCLUIDA'
                  }"
                  class="px-2.5 py-1 rounded-full text-[10px] font-bold"
                >
                  {{ ord.estado }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
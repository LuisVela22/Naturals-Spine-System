<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '../../api/axios';
import { 
  Clock, 
  Truck, 
  UserPlus, 
  Folder, 
  User, 
  Zap 
} from 'lucide-vue-next';

const ordenes = ref<any[]>([]);
const clientesPendientes = ref<any[]>([]);
const totalDocumentos = ref(0);
const loading = ref(true);

onMounted(async () => {
  try {
    const [resOrd, resCli, resStats] = await Promise.all([
      api.get('/ordenes'),
      api.get('/clientes/pendientes'),
      api.get('/clientes/estadisticas'),
    ]);
    ordenes.value = resOrd.data;
    clientesPendientes.value = resCli.data;
    totalDocumentos.value = resStats.data.totalDocumentos;
  } catch (err) {
    console.error('Error al cargar datos del dashboard de operador:', err);
  } finally {
    loading.value = false;
  }
});

const ordenesPendientes = computed(() => {
  return ordenes.value.filter((o) => o.estado === 'EN_REVISION').length;
});

const ordenesEnProceso = computed(() => {
  return ordenes.value.filter((o) => o.estado === 'APROBADA' || o.estado === 'EN_ENVIO').length;
});
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-bold text-slate-800">Dashboard del Operador</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-medium text-slate-500">Órdenes Pendientes</p>
          <p class="text-2xl font-black text-slate-800 mt-1">{{ ordenesPendientes }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
          <Clock class="w-5 h-5" />
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-medium text-slate-500">Órdenes en Proceso</p>
          <p class="text-2xl font-black text-slate-800 mt-1">{{ ordenesEnProceso }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
          <Truck class="w-5 h-5" />
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-medium text-slate-500">Nuevos Clientes</p>
          <p class="text-2xl font-black text-slate-800 mt-1">{{ clientesPendientes.length }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
          <UserPlus class="w-5 h-5" />
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-medium text-slate-500">Documentos Cargados</p>
          <p class="text-2xl font-black text-slate-800 mt-1">{{ totalDocumentos }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
          <Folder class="w-5 h-5" />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div class="flex justify-between items-center pb-2 border-b border-slate-100">
          <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
            <User class="w-4 h-4 mr-2 text-blue-600" /> Por Validar (CU03)
          </h2>
          <span class="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
            {{ clientesPendientes.length }} Ptes
          </span>
        </div>

        <div v-if="clientesPendientes.length === 0" class="text-xs text-slate-400 py-6 text-center">
          No hay solicitudes pendientes de validación.
        </div>

        <div v-for="cli in clientesPendientes" :key="cli.id" class="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-xs font-bold text-slate-800">{{ cli.razon_social }}</p>
              <p class="text-[10px] text-slate-400">RFC: {{ cli.rfc }}</p>
            </div>
            <span class="text-[10px] text-slate-400">Pendiente</span>
          </div>
          <router-link to="/admin/clientes" class="block w-full text-center text-xs py-1.5 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition">
            Revisar Documentación
          </router-link>
        </div>
      </div>

      <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center pb-2 border-b border-slate-100">
          <Zap class="w-4 h-4 mr-2 text-amber-500" /> Órdenes Activas Recientes
        </h2>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="text-slate-400 border-b border-slate-100">
                <th class="pb-3 font-semibold">ID Orden</th>
                <th class="pb-3 font-semibold">Cliente</th>
                <th class="pb-3 font-semibold">Estado Actual</th>
                <th class="pb-3 font-semibold text-right">Acción Rápida</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="ordenes.length === 0">
                <td colspan="4" class="py-6 text-center text-slate-400">
                  No hay órdenes registradas en la base de datos.
                </td>
              </tr>
              <tr v-for="ord in ordenes.slice(0, 5)" :key="ord.id">
                <td class="py-3 font-bold text-blue-600">#{{ ord.id.substring(0, 8) }}</td>
                <td class="py-3 text-slate-700">{{ ord.cliente?.razon_social || 'Cliente' }}</td>
                <td class="py-3">
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
                <td class="py-3 text-right">
                  <router-link to="/admin/ordenes" class="inline-block px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] shadow-sm">
                    Gestionar
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
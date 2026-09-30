<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../../api/axios';
import { RefreshCw, CheckCircle2 } from 'lucide-vue-next';

const ordenes = ref<any[]>([]);
const ordenSeleccionada = ref<any>(null);
const nuevoEstado = ref('');
const comentario = ref('');
const loading = ref(false);

const cargarOrdenes = async () => {
  const { data } = await api.get('/ordenes');
  ordenes.value = data;
};

onMounted(cargarOrdenes);

const actualizarEstado = async () => {
  if (!nuevoEstado.value) return;
  loading.value = true;
  try {
    await api.patch(`/ordenes/${ordenSeleccionada.value.id}/estado`, {
      nuevo_estado: nuevoEstado.value,
      comentario: comentario.value,
    });
    ordenSeleccionada.value = null;
    nuevoEstado.value = '';
    comentario.value = '';
    await cargarOrdenes();
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al cambiar estado');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-bold text-slate-800">Control de Órdenes</h1>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Control Integral de Solicitudes</h2>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="text-slate-400 border-b border-slate-100">
              <th class="pb-3 font-semibold">ID Orden</th>
              <th class="pb-3 font-semibold">Cliente Institucional</th>
              <th class="pb-3 font-semibold">Tipo</th>
              <th class="pb-3 font-semibold">Estado Actual</th>
              <th class="pb-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="ord in ordenes" :key="ord.id">
              <td class="py-3.5 font-bold text-blue-600">#{{ ord.id.substring(0, 8) }}</td>
              <td class="py-3.5">
                <p class="font-bold text-slate-800">{{ ord.cliente?.razon_social }}</p>
                <p class="text-[10px] text-slate-400">{{ ord.descripcion_equipo }}</p>
              </td>
              <td class="py-3.5">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  {{ ord.tipo_orden }}
                </span>
              </td>
              <td class="py-3.5">
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
              <td class="py-3.5 text-right">
                <button @click="ordenSeleccionada = ord" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-sm flex items-center space-x-1 ml-auto">
                  <RefreshCw class="w-3 h-3" /> <span>Estado (CU05)</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal CU05: Transición de Estados -->
    <div v-if="ordenSeleccionada" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <h3 class="text-base font-bold text-slate-800">Actualizar Estado de la Orden</h3>
        <p class="text-xs text-slate-500">Transición bajo la máquina de estados con registro en auditoría.</p>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Nuevo Estado:</label>
          <select v-model="nuevoEstado" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none">
            <option value="" disabled>Seleccione un estado...</option>
            <option value="APROBADA">APROBADA</option>
            <option value="EN_ENVIO">EN_ENVIO</option>
            <option value="CONCLUIDA">CONCLUIDA (Requiere Factura - RN04)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Comentario para Auditoría:</label>
          <input v-model="comentario" type="text" placeholder="Ej. Equipo liberado en almacén" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none" />
        </div>

        <div class="flex justify-end space-x-2 pt-2 border-t border-slate-100">
          <button @click="ordenSeleccionada = null" class="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-semibold">
            Cancelar
          </button>
          <button @click="actualizarEstado" :disabled="loading" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1">
            <CheckCircle2 class="w-4 h-4" /> <span>Confirmar Transición</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
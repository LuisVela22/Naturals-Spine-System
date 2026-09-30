<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../../api/axios';
import { CheckCircle, XCircle } from 'lucide-vue-next';

const pendientes = ref<any[]>([]);
const clienteSeleccionado = ref<any>(null);
const motivoRechazo = ref('');
const loading = ref(false);

const cargarClientes = async () => {
  const { data } = await api.get('/clientes/pendientes');
  pendientes.value = data;
};

onMounted(cargarClientes);

const resolverValidacion = async (estado: 'APROBADO' | 'RECHAZADO') => {
  if (estado === 'RECHAZADO' && !motivoRechazo.value) {
    alert('Debe especificar un motivo de rechazo');
    return;
  }
  loading.value = true;
  try {
    await api.patch(`/clientes/${clienteSeleccionado.value.id}/validacion`, {
      estado_validacion: estado,
      motivo_rechazo: estado === 'RECHAZADO' ? motivoRechazo.value : undefined,
    });
    clienteSeleccionado.value = null;
    motivoRechazo.value = '';
    await cargarClientes();
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al validar cliente');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-xl font-bold text-slate-800">Clientes / Hospitales</h1>
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Directorio Institucional (Pendientes de Validación)</h2>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="text-slate-400 border-b border-slate-100">
              <th class="pb-3 font-semibold">Razón Social / Institución</th>
              <th class="pb-3 font-semibold">RFC</th>
              <th class="pb-3 font-semibold">Contacto</th>
              <th class="pb-3 font-semibold">Estado</th>
              <th class="pb-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="cli in pendientes" :key="cli.id">
              <td class="py-3.5 font-bold text-slate-800">{{ cli.razon_social }}</td>
              <td class="py-3.5 text-slate-600 uppercase">{{ cli.rfc }}</td>
              <td class="py-3.5">
                <p class="font-medium text-slate-700">{{ cli.nombre_contacto }}</p>
                <p class="text-[10px] text-slate-400">{{ cli.usuario?.correo_electronico }}</p>
              </td>
              <td class="py-3.5">
                <span class="bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full text-[10px]">
                  {{ cli.estado_validacion }}
                </span>
              </td>
              <td class="py-3.5 text-right">
                <button @click="clienteSeleccionado = cli" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-sm">
                  Validar (CU03)
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal CU03: Validación Administrativa -->
    <div v-if="clienteSeleccionado" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <h3 class="text-base font-bold text-slate-800">Validación de Cliente: {{ clienteSeleccionado.razon_social }}</h3>
        <p class="text-xs text-slate-500">Revise la información y determine la activación de la cuenta (RN01).</p>

        <div class="bg-slate-50 p-4 rounded-xl text-xs space-y-1.5 border border-slate-100">
          <p><strong>RFC:</strong> {{ clienteSeleccionado.rfc }}</p>
          <p><strong>Dirección:</strong> {{ clienteSeleccionado.direccion_fiscal }}</p>
          <p><strong>Teléfono:</strong> {{ clienteSeleccionado.telefono }}</p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Motivo de Rechazo (Sólo si se rechaza):</label>
          <textarea v-model="motivoRechazo" placeholder="Especifique el motivo..." class="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none"></textarea>
        </div>

        <div class="flex justify-end space-x-2 pt-2 border-t border-slate-100">
          <button @click="clienteSeleccionado = null" class="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-semibold">
            Cancelar
          </button>
          <button @click="resolverValidacion('RECHAZADO')" :disabled="loading" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1">
            <XCircle class="w-4 h-4" /> <span>Rechazar</span>
          </button>
          <button @click="resolverValidacion('APROBADO')" :disabled="loading" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1">
            <CheckCircle class="w-4 h-4" /> <span>Aprobar Cliente</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
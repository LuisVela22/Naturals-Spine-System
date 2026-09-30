<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../api/axios';
import { Send, ShoppingCart } from 'lucide-vue-next';

const router = useRouter();

const form = ref({
  tipo_orden: 'RENTA',
  descripcion_equipo: '',
  monto_total: 25000,
});

const loading = ref(false);

const registrarOrden = async () => {
  loading.value = true;
  try {
    await api.post('/ordenes', form.value);
    alert('Orden registrada correctamente');
    router.push('/cliente/historial');
  } catch (err: any) {
    alert(err.response?.data?.message || 'Error al crear orden');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="w-full max-w-4xl mx-auto space-y-4 md:space-y-6">
    <h1 class="text-lg md:text-xl font-bold text-slate-800">Registrar Orden (CU04)</h1>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-8 space-y-6">
      <div class="pb-4 border-b border-slate-100">
        <h2 class="text-sm md:text-base font-bold text-blue-700 flex items-center">
          <ShoppingCart class="w-5 h-5 mr-2 text-blue-600" />
          Registrar Nueva Orden de Compra/Renta
        </h2>
        <p class="text-xs text-slate-500 mt-1">Complete los datos para generar una nueva solicitud logística en el sistema.</p>
      </div>

      <form @submit.prevent="registrarOrden" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Tipo de Operación *</label>
            <select v-model="form.tipo_orden" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none">
              <option value="RENTA">Renta de Instrumental / Equipo</option>
              <option value="COMPRA">Compra Definitiva</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Presupuesto Estimado ($MXN)</label>
            <input v-model.number="form.monto_total" type="number" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none" />
          </div>

          <div class="grid-cols-1 md:col-span-2">
            <label class="block text-xs font-semibold text-slate-600 mb-1">Descripción del Equipo Médico Solicitado *</label>
            <textarea v-model="form.descripcion_equipo" required rows="3" placeholder="Ej. Set Instrumental de Columna Lumbar, Motor Quirúrgico de Alta Velocidad..." class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none"></textarea>
          </div>
        </div>

        <div class="p-3 md:p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label class="block text-xs font-semibold text-slate-700">Adjuntar Orden de Compra Institucional (PDF)</label>
          <input type="file" accept=".pdf" class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </div>

        <div class="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
          <router-link to="/cliente/dashboard" class="w-full sm:w-auto text-center px-5 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50">
            Cancelar
          </router-link>
          <button type="submit" :disabled="loading" class="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center space-x-2">
            <Send class="w-4 h-4" /> <span>{{ loading ? 'Enviando...' : 'Enviar Solicitud al Proveedor' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
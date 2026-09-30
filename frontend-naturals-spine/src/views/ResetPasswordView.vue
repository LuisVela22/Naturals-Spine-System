<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api/axios';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft, KeyRound } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const token = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const exito = ref(false);
const errorMsg = ref('');

onMounted(() => {
  const tokenQuery = route.query.token as string;
  if (!tokenQuery) {
    errorMsg.value = 'El token de recuperación no está presente o es inválido.';
  } else {
    token.value = tokenQuery;
  }
});

const handleSubmit = async () => {
  errorMsg.value = '';

  if (password.value.length < 8) {
    errorMsg.value = 'La contraseña debe tener al menos 8 caracteres.';
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden.';
    return;
  }

  loading.value = true;
  try {
    await api.post('/auth/restablecer-password', {
      token: token.value,
      password: password.value,
    });
    exito.value = true;
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'Error al restablecer contraseña. El enlace pudo haber expirado.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 md:p-8 max-w-md w-full space-y-6">
      <div class="text-center space-y-2">
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <KeyRound class="w-6 h-6" />
        </div>
        <h2 class="text-xl font-bold text-slate-800">Restablecer Contraseña</h2>
        <p class="text-xs text-slate-500">
          Ingresa tu nueva contraseña para acceder a la plataforma Naturals & Spine.
        </p>
      </div>

      <div v-if="exito" class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
        <CheckCircle2 class="w-8 h-8 text-emerald-600 mx-auto" />
        <h3 class="text-sm font-bold text-emerald-800">¡Contraseña Actualizada!</h3>
        <p class="text-xs text-emerald-700">Tu contraseña ha sido modificada con éxito. Ya puedes iniciar sesión.</p>
        <button 
          @click="router.push('/login')" 
          class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
        >
          Ir al Inicio de Sesión
        </button>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <div v-if="errorMsg" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium flex items-start space-x-2">
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ errorMsg }}</span>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Nueva Contraseña</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock class="w-4 h-4" />
            </span>
            <input 
              v-model="password" 
              type="password" 
              required 
              minlength="8" 
              placeholder="Mínimo 8 caracteres" 
              class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" 
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Confirmar Nueva Contraseña</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock class="w-4 h-4" />
            </span>
            <input 
              v-model="confirmPassword" 
              type="password" 
              required 
              minlength="8" 
              placeholder="Repite la contraseña" 
              class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" 
            />
          </div>
        </div>

        <button 
          type="submit" 
          :disabled="loading || !token" 
          class="w-full bg-[#0066cc] hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow disabled:opacity-50"
        >
          {{ loading ? 'Actualizando...' : 'Guardar Nueva Contraseña' }}
        </button>

        <div class="text-center pt-2">
          <router-link to="/login" class="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center">
            <ArrowLeft class="w-3.5 h-3.5 mr-1" /> Volver al Login
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>
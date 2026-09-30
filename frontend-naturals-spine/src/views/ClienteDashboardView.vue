<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const handleLogout = () => {
  localStorage.clear();
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
    <div class="bg-white p-8 rounded-2xl shadow border border-slate-200 text-center max-w-md w-full space-y-4">
      <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
        ✓
      </div>
      <h2 class="text-xl font-bold text-slate-800">Panel del Cliente</h2>
      <p class="text-xs text-slate-500">Sesión iniciada correctamente con las nuevas credenciales.</p>
      <button 
        @click="handleLogout" 
        class="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition"
      >
        Cerrar Sesión
      </button>
    </div>
  </div>
</template>
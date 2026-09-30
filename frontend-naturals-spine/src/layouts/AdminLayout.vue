<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  LogOut, 
  Menu, 
  X, 
  Activity 
} from 'lucide-vue-next';

const router = useRouter();
const auth = useAuthStore();
const mobileOpen = ref(false);

const logout = () => {
  auth.logout();
  router.push('/login');
};
</script>

<template>
  <div class="flex h-screen bg-[#f1f5f9] overflow-hidden relative">
    <div 
      v-if="mobileOpen" 
      @click="mobileOpen = false" 
      class="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
    ></div>

    <aside 
      :class="[
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        'fixed md:static inset-y-0 left-0 w-64 bg-[#0a2540] text-slate-300 flex flex-col justify-between shrink-0 shadow-xl transition-transform duration-200 ease-in-out z-50'
      ]"
    >
      <div>
        <div class="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <Activity class="w-6 h-6 text-blue-400" />
            <span class="font-extrabold text-white text-base tracking-wide">Naturals & Spine</span>
          </div>
          <button @click="mobileOpen = false" class="md:hidden text-slate-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <nav class="p-4 space-y-1.5 text-xs font-semibold">
          <router-link 
            @click="mobileOpen = false"
            to="/admin/dashboard" 
            active-class="bg-blue-600/30 text-white border-l-4 border-blue-500" 
            class="flex items-center px-4 py-3 rounded-lg hover:bg-white/5 transition"
          >
            <LayoutDashboard class="w-4 h-4 mr-3" /> Panel Principal
          </router-link>
          <router-link 
            @click="mobileOpen = false"
            to="/admin/clientes" 
            active-class="bg-blue-600/30 text-white border-l-4 border-blue-500" 
            class="flex items-center px-4 py-3 rounded-lg hover:bg-white/5 transition"
          >
            <Users class="w-4 h-4 mr-3" /> Clientes / Hospitales
          </router-link>
          <router-link 
            @click="mobileOpen = false"
            to="/admin/ordenes" 
            active-class="bg-blue-600/30 text-white border-l-4 border-blue-500" 
            class="flex items-center px-4 py-3 rounded-lg hover:bg-white/5 transition"
          >
            <ShoppingCart class="w-4 h-4 mr-3" /> Control de Órdenes
          </router-link>
        </nav>
      </div>

      <div class="p-4 border-t border-slate-700/50">
        <button @click="logout" class="flex items-center text-xs font-bold text-red-400 hover:text-red-300 w-full px-4 py-2 transition">
          <LogOut class="w-4 h-4 mr-3" /> Cerrar Sesión
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <header class="bg-white border-b border-slate-200 px-4 md:px-8 py-3.5 flex justify-between items-center shadow-sm shrink-0">
        <button @click="mobileOpen = true" class="md:hidden text-slate-700 p-1 rounded-lg hover:bg-slate-100">
          <Menu class="w-6 h-6" />
        </button>

        <div class="flex items-center space-x-3 ml-auto">
          <div class="text-right">
            <p class="text-xs font-bold text-slate-800 leading-tight">
              {{ auth.user?.personal?.nombre_completo || 'Administrador' }}
            </p>
            <p class="text-[10px] text-slate-500 leading-tight">Operaciones / Logística</p>
          </div>
          <div class="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-800 text-white font-bold flex items-center justify-center text-xs shadow-inner shrink-0">
            RA
          </div>
        </div>
      </header>

      <main class="p-4 md:p-8">
        <router-view />
      </main>
    </div>
  </div>
</template>
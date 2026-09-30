<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../api/axios';
import { 
  FileText, 
  Truck, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Building2,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-vue-next';

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMsg = ref('');
const loading = ref(false);

const router = useRouter();
const auth = useAuthStore();

// Modal de Recuperación de Contraseña
const modalRecuperar = ref(false);
const emailRecuperar = ref('');
const loadingRecuperar = ref(false);
const mensajeRecuperar = ref('');
const errorRecuperar = ref('');

const handleLogin = async () => {
  errorMsg.value = '';
  loading.value = true;
  try {
    const res = await auth.login(email.value, password.value);
    if (res.rol === 'ADMIN') {
      router.push('/admin/dashboard');
    } else {
      router.push('/cliente/dashboard');
    }
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'Error al iniciar sesión';
  } finally {
    loading.value = false;
  }
};

const solicitarRecuperacion = async () => {
  if (!emailRecuperar.value) return;
  loadingRecuperar.value = true;
  errorRecuperar.value = '';
  mensajeRecuperar.value = '';

  try {
    const { data } = await api.post('/auth/olvide-password', {
      correo: emailRecuperar.value,
    });
    mensajeRecuperar.value = data.mensaje || 'Si el correo está registrado, recibirás un enlace.';
  } catch (err: any) {
    errorRecuperar.value = err.response?.data?.message || 'Error al procesar la solicitud.';
  } finally {
    loadingRecuperar.value = false;
  }
};

const loginDemo = async (rol: 'admin' | 'cliente') => {
  if (rol === 'admin') {
    email.value = 'admin@naturalsspine.com';
    password.value = 'Password123!';
  } else {
    email.value = 'contacto@hospitalangeles.com';
    password.value = 'Password123!';
  }
  await handleLogin();
};
</script>

<template>
  <div class="min-h-screen flex flex-col md:flex-row bg-slate-50">
    <!-- Columna Izquierda Corporativa -->
    <div class="md:w-1/2 bg-[#0066cc] flex flex-col justify-center items-center text-white p-8 md:p-12 relative overflow-hidden">
      <div class="max-w-md space-y-6 md:space-y-8 z-10 text-center md:text-left">
        <div class="flex justify-center md:justify-start items-center space-x-3">
          <div class="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
            <Activity class="w-8 h-8 text-white" />
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">Naturals & Spine System</h1>
        </div>
        
        <p class="text-blue-100 text-sm md:text-base leading-relaxed">
          Plataforma integral B2B para la automatización, logística y trazabilidad de equipo médico de alta especialidad en neurocirugía y columna.
        </p>

        <div class="space-y-4 md:space-y-6 pt-4 border-t border-white/20">
          <div class="flex items-start space-x-4">
            <div class="p-2 bg-white/10 rounded-lg shrink-0">
              <FileText class="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 class="font-bold text-white text-sm md:text-base">Repositorio Documental</h3>
              <p class="text-blue-100 text-xs md:text-sm">Consulta y vinculación centralizada de facturas, remisiones y comprobantes fiscales.</p>
            </div>
          </div>

          <div class="flex items-start space-x-4">
            <div class="p-2 bg-white/10 rounded-lg shrink-0">
              <Truck class="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 class="font-bold text-white text-sm md:text-base">Trazabilidad en Tiempo Real</h3>
              <p class="text-blue-100 text-xs md:text-sm">Seguimiento punto a punto de órdenes de compra y renta de instrumental quirúrgico.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Columna Derecha Formulario Login -->
    <div class="md:w-1/2 flex items-center justify-center p-6 md:p-8">
      <div class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8 w-full max-w-md">
        <div class="mb-6">
          <h2 class="text-xl md:text-2xl font-bold text-slate-800">Iniciar Sesión</h2>
          <p class="text-slate-500 text-xs md:text-sm mt-1">Ingresa con tus credenciales institucionales o de operador.</p>
        </div>

        <div v-if="errorMsg" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
          {{ errorMsg }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail class="w-4 h-4" />
              </span>
              <input 
                v-model="email" 
                type="email" 
                required 
                placeholder="correo@hospital.com" 
                class="w-full pl-9 pr-3 py-2 text-xs md:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" 
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Contraseña</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock class="w-4 h-4" />
              </span>
              <input 
                v-model="password" 
                :type="showPassword ? 'text' : 'password'" 
                required 
                placeholder="••••••••" 
                class="w-full pl-9 pr-10 py-2 text-xs md:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" 
              />
              <button 
                type="button" 
                @click="showPassword = !showPassword" 
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs">
            <label class="flex items-center text-slate-600 cursor-pointer">
              <input type="checkbox" class="rounded border-slate-300 text-blue-600 mr-2" />
              Recordar cuenta
            </label>
            <button 
              type="button" 
              @click="modalRecuperar = true; mensajeRecuperar = ''; errorRecuperar = '';" 
              class="text-blue-600 hover:underline font-semibold"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button 
            type="submit" 
            :disabled="loading"
            class="w-full bg-[#0066cc] hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-xs md:text-sm transition shadow flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{{ loading ? 'Validando...' : 'Ingresar al Sistema' }}</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </form>

        <div class="mt-6 pt-6 border-t border-slate-100 text-center">
          <p class="text-xs text-slate-500 mb-2">¿Tu institución médica aún no es cliente?</p>
          <router-link 
            to="/registro" 
            class="w-full inline-block py-2 px-4 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Solicitar Registro Institucional
          </router-link>
        </div>

        <div class="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
          <p class="text-[11px] font-bold text-amber-800 text-center uppercase tracking-wider">Modo Prototipo (Accesos Rápidos)</p>
          <button 
            @click="loginDemo('admin')" 
            class="w-full text-xs py-1.5 px-3 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-lg transition inline-flex items-center justify-center space-x-2"
          >
            <ShieldCheck class="w-4 h-4" />
            <span>Dashboard Empresa (Admin)</span>
          </button>
          <button 
            @click="loginDemo('cliente')" 
            class="w-full text-xs py-1.5 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-lg transition inline-flex items-center justify-center space-x-2"
          >
            <Building2 class="w-4 h-4" />
            <span>Dashboard Hospital (Cliente)</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Recuperar Contraseña -->
    <div v-if="modalRecuperar" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div class="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 class="text-sm font-bold text-slate-800 flex items-center">
            <Mail class="w-4 h-4 mr-2 text-blue-600" /> Recuperar Acceso
          </h3>
          <button @click="modalRecuperar = false" class="text-slate-400 hover:text-slate-600">
            <X class="w-4 h-4" />
          </button>
        </div>

        <p class="text-xs text-slate-500">
          Escribe el correo institucional registrado. Te enviaremos un correo con un enlace seguro para restablecer tu contraseña.
        </p>

        <div v-if="mensajeRecuperar" class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-start space-x-2">
          <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{{ mensajeRecuperar }}</span>
        </div>

        <div v-if="errorRecuperar" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2">
          <AlertCircle class="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{{ errorRecuperar }}</span>
        </div>

        <div v-if="!mensajeRecuperar" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico</label>
            <input 
              v-model="emailRecuperar" 
              type="email" 
              placeholder="contacto@hospital.com" 
              class="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600" 
            />
          </div>

          <div class="flex justify-end space-x-2 pt-2">
            <button @click="modalRecuperar = false" class="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs font-semibold">
              Cancelar
            </button>
            <button 
              @click="solicitarRecuperacion" 
              :disabled="loadingRecuperar || !emailRecuperar" 
              class="px-4 py-1.5 bg-[#0066cc] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {{ loadingRecuperar ? 'Enviando...' : 'Enviar Correo' }}
            </button>
          </div>
        </div>

        <div v-else class="text-right pt-2">
          <button @click="modalRecuperar = false" class="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold">
            Entendido
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
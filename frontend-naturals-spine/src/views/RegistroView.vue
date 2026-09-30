<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/axios';
import { 
  ArrowLeft, 
  Send, 
  Building2, 
  UserCheck, 
  FileText, 
  Activity 
} from 'lucide-vue-next';

const router = useRouter();

const form = ref({
  razon_social: '',
  rfc: '',
  direccion_fiscal: '',
  nombre_contacto: '',
  correo_electronico: '',
  telefono: '',
  password: '',
});

const files = ref<{ [key: string]: File | null }>({
  rfc: null,
  ine: null,
  domicilio: null,
});

const loading = ref(false);
const exito = ref(false);
const errorMsg = ref('');

const handleFile = (e: any, key: string) => {
  files.value[key] = e.target.files[0] || null;
};

const handleSubmit = async () => {
  errorMsg.value = '';
  loading.value = true;
  try {
    await api.post('/auth/registro-cliente', form.value);
    exito.value = true;
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'Error al enviar el registro';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <header class="bg-[#0066cc] text-white py-4 px-8 flex justify-between items-center shadow-md">
      <div class="flex items-center space-x-3">
        <Activity class="w-6 h-6 text-white" />
        <div>
          <h1 class="font-bold text-lg leading-tight">Naturals & Spine System</h1>
          <p class="text-xs text-blue-100">Portal de Alta Institucional B2B</p>
        </div>
      </div>
    </header>

    <main class="max-w-3xl mx-auto py-8 px-4">
      <div class="flex justify-between items-center mb-6">
        <router-link to="/login" class="inline-flex items-center text-xs font-semibold text-slate-600 bg-white border border-slate-300 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50">
          <ArrowLeft class="w-3.5 h-3.5 mr-1" /> Volver al Inicio
        </router-link>
        <span class="text-xs bg-blue-600 text-white font-semibold px-3 py-1 rounded-full shadow-sm">Paso Único de Registro</span>
      </div>

      <div class="bg-white rounded-2xl shadow border border-slate-200 p-8">
        <div class="text-center mb-8 pb-4 border-b border-slate-100">
          <h2 class="text-2xl font-extrabold text-slate-800">Solicitud de Registro como Cliente</h2>
          <p class="text-xs text-slate-500 mt-1 max-w-xl mx-auto">
            Complete los datos de su institución de salud. Su cuenta será validada por nuestro equipo antes de poder operar (Regla de Negocio RN01).
          </p>
        </div>

        <div v-if="exito" class="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
          <h3 class="text-lg font-bold text-emerald-800">Solicitud Enviada con Éxito</h3>
          <p class="text-xs text-emerald-700 leading-relaxed">
            Su expediente ha quedado en estado <strong>PENDIENTE</strong>. Nuestro equipo administrativo revisará sus datos fiscales y se le notificará cuando su cuenta esté activada.
          </p>
          <router-link to="/login" class="inline-block mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow hover:bg-emerald-700">
            Regresar al Login
          </router-link>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-6">
          <div v-if="errorMsg" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-semibold">
            {{ errorMsg }}
          </div>

          <!-- Sección 1 -->
          <div>
            <h3 class="text-sm font-bold text-blue-700 flex items-center mb-3">
              <Building2 class="w-4 h-4 mr-2" /> 1. Datos Institucionales y Fiscales
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Nombre de la Institución / Razón Social *</label>
                <input v-model="form.razon_social" required type="text" placeholder="Ej. Hospital Ángeles del Sur S.A. de C.V." class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">RFC *</label>
                <input v-model="form.rfc" required type="text" maxlength="13" placeholder="HAS980715XX1" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg uppercase focus:ring-1 focus:ring-blue-600 focus:outline-none" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-slate-600 mb-1">Dirección Fiscal Completa *</label>
                <input v-model="form.direccion_fiscal" required type="text" placeholder="Calle, Número, Colonia, Alcaldía/Municipio, C.P., Estado" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none" />
              </div>
            </div>
          </div>

          <!-- Sección 2 -->
          <div>
            <h3 class="text-sm font-bold text-blue-700 flex items-center mb-3">
              <UserCheck class="w-4 h-4 mr-2" /> 2. Datos de Contacto Principal y Acceso
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-slate-600 mb-1">Nombre Completo del Responsable *</label>
                <input v-model="form.nombre_contacto" required type="text" placeholder="Ej. Dr. Fernando Ruiz" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Correo Electrónico Institucional *</label>
                <input v-model="form.correo_electronico" required type="email" placeholder="compras@hospital.com" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Teléfono de Contacto *</label>
                <input v-model="form.telefono" required type="tel" placeholder="55 1234 5678" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-slate-600 mb-1">Contraseña de Acceso (mínimo 8 caracteres) *</label>
                <input v-model="form.password" required type="password" minlength="8" placeholder="••••••••" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none" />
              </div>
            </div>
          </div>

          <!-- Sección 3 -->
          <div>
            <h3 class="text-sm font-bold text-blue-700 flex items-center mb-1">
              <FileText class="w-4 h-4 mr-2" /> 3. Documentación Oficial
            </h3>
            <p class="text-[11px] text-slate-400 mb-3">Adjunte los archivos requeridos en PDF o Imagen (Máx. 5MB cada uno).</p>
            <div class="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Constancia de Situación Fiscal (Alta SAT) *</label>
                <input @change="handleFile($event, 'rfc')" type="file" accept=".pdf,image/*" class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Identificación Oficial del Representante Legal *</label>
                <input @change="handleFile($event, 'ine')" type="file" accept=".pdf,image/*" class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Comprobante de Domicilio de la Institución *</label>
                <input @change="handleFile($event, 'domicilio')" type="file" accept=".pdf,image/*" class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            :disabled="loading"
            class="w-full bg-[#0066cc] hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition shadow flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Send class="w-4 h-4" />
            <span>{{ loading ? 'Enviando Información...' : 'Enviar Solicitud de Registro' }}</span>
          </button>
        </form>
      </div>
    </main>
  </div>
</template>
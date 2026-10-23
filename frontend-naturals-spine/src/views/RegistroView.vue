<script setup lang="ts">
import { ref, computed } from 'vue';
import api from '../api/axios';
import { 
  ArrowLeft, 
  Send, 
  Building2, 
  UserCheck, 
  FileText, 
  Activity,
  X
} from 'lucide-vue-next';


const form = ref({
  razon_social: '',
  rfc: '',
  direccion_fiscal: '',
  nombre_contacto: '',
  correo_electronico: '',
  lada: '+52',
  telefono: '',
  password: '',
});

const files = ref<{ [key: string]: File | null }>({
  rfc: null,
  ine: null,
  domicilio: null,
});

const loading = ref(false);
const fileInputs = ref<Record<string, HTMLInputElement | null>>({ rfc: null, ine: null, domicilio: null });
const ladaOptions = [
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+1', country: 'Estados Unidos / Canadá', flag: '🇺🇸' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '+509', country: 'Haití', flag: '🇭🇹' },
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '+33', country: 'Francia', flag: '🇫🇷' },
  { code: '+49', country: 'Alemania', flag: '🇩🇪' },
  { code: '+39', country: 'Italia', flag: '🇮🇹' },
  { code: '+81', country: 'Japón', flag: '🇯🇵' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+82', country: 'Corea del Sur', flag: '🇰🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
];
const rfcRegex = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordStrength = computed(() => {
  const p = form.value.password;
  if (!p) return { score: 0, label: 'Sin contraseña', color: 'bg-slate-200' };
  const checks = [/[a-z]/.test(p), /[A-Z]/.test(p), /\d/.test(p), /[.,\/@&_$-]/.test(p), p.length >= 8];
  const score = checks.filter(Boolean).length;
  if (score <= 2) return { score, label: 'Débil', color: 'bg-red-500' };
  if (score === 3) return { score, label: 'Moderada', color: 'bg-amber-500' };
  if (score === 4) return { score, label: 'Adecuada', color: 'bg-blue-500' };
  return { score, label: 'Fuerte', color: 'bg-emerald-500' };
});
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.,\/@&_$-])[A-Za-z\d.,\/@&_$-]{8,}$/;
const exito = ref(false);
const errorMsg = ref('');

const handleFile = (e: Event, key: string) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0] || null;
  if (file && file.size > 5 * 1024 * 1024) { errorMsg.value = 'Cada documento debe pesar máximo 5 MB.'; input.value = ''; files.value[key] = null; return; }
  if (file && !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { errorMsg.value = 'Solo se admiten PDF, JPEG o PNG.'; input.value = ''; files.value[key] = null; return; }
  errorMsg.value = ''; files.value[key] = file;
};
const removeFile = (key: string) => { files.value[key] = null; if (fileInputs.value[key]) fileInputs.value[key]!.value = ''; };
const validForm = () => {
  form.value.rfc = form.value.rfc.trim().toUpperCase();
  form.value.correo_electronico = form.value.correo_electronico.trim().toLowerCase();
  if (!rfcRegex.test(form.value.rfc)) { errorMsg.value = 'El RFC debe tener formato válido de persona física (13) o moral (12) caracteres.'; return false; }
  if (!emailRegex.test(form.value.correo_electronico)) { errorMsg.value = 'Ingrese un correo electrónico válido.'; return false; }
  if (!/^\d{10}$/.test(form.value.telefono)) { errorMsg.value = 'El teléfono debe contener exactamente 10 dígitos.'; return false; }
  if (!passwordRegex.test(form.value.password)) { errorMsg.value = 'La contraseña debe tener mínimo 8 caracteres, minúscula, mayúscula, número y un carácter permitido: . , / @ & - _ $'; return false; }
  if (Object.values(files.value).some(f => !f)) { errorMsg.value = 'Adjunte los tres documentos oficiales requeridos.'; return false; }
  return true;
};

const handleSubmit = async () => {
  errorMsg.value = '';
  if (!validForm()) return;
  loading.value = true;
  try {
    const payload = { ...form.value, telefono: `${form.value.lada}${form.value.telefono}` };
    delete (payload as any).lada;

    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => formData.append(key, String(value)));
    const fileFieldNames: Record<string, string> = {
      rfc: 'documento_rfc',
      ine: 'documento_ine',
      domicilio: 'documento_domicilio',
    };
    Object.entries(files.value).forEach(([key, file]) => {
      if (file) formData.append(fileFieldNames[key], file);
    });

    await api.post('/auth/registro-cliente', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
                <input v-model="form.rfc" required type="text" maxlength="13" pattern="[A-Za-z&Ññ]{3,4}[0-9]{6}[A-Za-z0-9]{3}" @input="form.rfc = form.rfc.toUpperCase().replace(/[^A-Z&Ñ0-9]/g, '').slice(0,13)" placeholder="HAS980715XX1" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg uppercase focus:ring-1 focus:ring-blue-600 focus:outline-none" />
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
                <input v-model="form.correo_electronico" required type="email" @blur="form.correo_electronico = form.correo_electronico.trim().toLowerCase()" placeholder="compras@hospital.com" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Teléfono de Contacto *</label>
                <div class="flex gap-2"><select v-model="form.lada" aria-label="Código internacional de país" class="max-w-[190px] text-xs p-2.5 border border-slate-300 rounded-lg bg-white">
                  <option v-for="lada in ladaOptions" :key="lada.code" :value="lada.code">{{ lada.flag }} {{ lada.code }} · {{ lada.country }}</option>
                </select>
                <input v-model="form.telefono" required type="tel" inputmode="numeric" maxlength="15" pattern="[0-9]{7,15}" @input="form.telefono = form.telefono.replace(/\D/g, '').slice(0,15)" placeholder="Número nacional" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none" /></div><p class="text-[10px] text-slate-400 mt-1">Selecciona el código internacional y escribe entre 7 y 15 dígitos nacionales. Solo números.</p>
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-slate-600 mb-1">Contraseña de Acceso (mínimo 8 caracteres) *</label>
                <input v-model="form.password" required type="password" minlength="8" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[.,/@&_$-])[A-Za-z0-9.,/@&_$-]{8,}" placeholder="••••••••" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none" /><div class="mt-2"><div class="h-2 rounded bg-slate-100 overflow-hidden"><div class="h-full transition-all" :class="passwordStrength.color" :style="{ width: `${passwordStrength.score * 20}%` }"></div></div><p class="text-[11px] mt-1 text-slate-500">Fortaleza: <strong>{{ passwordStrength.label }}</strong></p><p class="text-[10px] text-slate-400">Usa minúscula, mayúscula, número y uno de estos caracteres: . , / @ &amp; - _ $ (mínimo 8 caracteres).</p></div>
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
                <input :ref="el => fileInputs['rfc'] = el as HTMLInputElement" @change="handleFile($event, 'rfc')" type="file" accept=".pdf,image/*" class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <div v-if="files.rfc" class="mt-1 flex items-center justify-between text-xs bg-white border rounded p-2"><span class="truncate">{{ files.rfc!.name }}</span><button type="button" class="inline-flex items-center gap-1 ml-2 px-2.5 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold transition" @click="removeFile('rfc')"><X class="w-3.5 h-3.5" /> Quitar</button></div>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Identificación Oficial del Representante Legal *</label>
                <input :ref="el => fileInputs['ine'] = el as HTMLInputElement" @change="handleFile($event, 'ine')" type="file" accept=".pdf,image/*" class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <div v-if="files.ine" class="mt-1 flex items-center justify-between text-xs bg-white border rounded p-2"><span class="truncate">{{ files.ine!.name }}</span><button type="button" class="inline-flex items-center gap-1 ml-2 px-2.5 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold transition" @click="removeFile('ine')"><X class="w-3.5 h-3.5" /> Quitar</button></div>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Comprobante de Domicilio de la Institución *</label>
                <input :ref="el => fileInputs['domicilio'] = el as HTMLInputElement" @change="handleFile($event, 'domicilio')" type="file" accept=".pdf,image/*" class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <div v-if="files.domicilio" class="mt-1 flex items-center justify-between text-xs bg-white border rounded p-2"><span class="truncate">{{ files.domicilio!.name }}</span><button type="button" class="inline-flex items-center gap-1 ml-2 px-2.5 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold transition" @click="removeFile('domicilio')"><X class="w-3.5 h-3.5" /> Quitar</button></div>
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
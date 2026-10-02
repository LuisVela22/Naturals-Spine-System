<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../../api/axios';
import {
  Search,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  X,
  AlertCircle,
} from 'lucide-vue-next';

type Documento = {
  id: string;
  tipo_documento: string;
  nombre_archivo: string;
  mime_type: string;
  tamano_bytes: number;
};

type Cliente = {
  id: string;
  rfc: string;
  razon_social: string;
  nombre_contacto: string;
  telefono: string;
  direccion_fiscal: string;
  estado_validacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  creado_en: string;
  usuario?: {
    correo_electronico: string;
    creado_en: string;
  };
  documentos?: Documento[];
};

const clientes = ref<Cliente[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const search = ref('');

const modalCliente = ref<Cliente | null>(null);
const motivoRechazo = ref('');
const loadingAccion = ref(false);
const accionMsg = ref('');
const accionError = ref('');

const cargarClientes = async () => {
  loading.value = true;
  errorMsg.value = '';

  try {
    const { data } = await api.get('/clientes/pendientes');
    clientes.value = data;
  } catch (err: any) {
    errorMsg.value =
      err.response?.data?.message ||
      'No fue posible consultar las solicitudes de clientes.';
  } finally {
    loading.value = false;
  }
};

onMounted(cargarClientes);

const clientesFiltrados = () => {
  const term = search.value.trim().toLowerCase();
  if (!term) return clientes.value;

  return clientes.value.filter((cliente) =>
    [cliente.razon_social, cliente.rfc, cliente.nombre_contacto]
      .some((value) => value.toLowerCase().includes(term)),
  );
};

const abrirCliente = (cliente: Cliente) => {
  modalCliente.value = cliente;
  motivoRechazo.value = '';
  accionMsg.value = '';
  accionError.value = '';
};

const cerrarCliente = () => {
  modalCliente.value = null;
  motivoRechazo.value = '';
  accionMsg.value = '';
  accionError.value = '';
};

const validarCliente = async (estado: 'APROBADO' | 'RECHAZADO') => {
  if (!modalCliente.value) return;

  if (estado === 'RECHAZADO' && !motivoRechazo.value.trim()) {
    accionError.value = 'Debes indicar el motivo del rechazo.';
    return;
  }

  loadingAccion.value = true;
  accionMsg.value = '';
  accionError.value = '';

  try {
    await api.patch(`/clientes/${modalCliente.value.id}/validacion`, {
      estado_validacion: estado,
      ...(estado === 'RECHAZADO'
        ? { motivo_rechazo: motivoRechazo.value.trim() }
        : {}),
    });

    accionMsg.value =
      estado === 'APROBADO'
        ? 'Cliente aprobado correctamente. La cuenta ya puede iniciar sesión.'
        : 'Cliente rechazado y motivo registrado.';

    await cargarClientes();

    setTimeout(() => {
      cerrarCliente();
    }, 900);
  } catch (err: any) {
    accionError.value =
      err.response?.data?.message ||
      'No fue posible actualizar la validación.';
  } finally {
    loadingAccion.value = false;
  }
};

const descargarDocumento = async (documento: Documento) => {
  try {
    const { data } = await api.get(`/documentos/${documento.id}/descarga`);
    window.open(data.url, '_blank', 'noopener,noreferrer');
  } catch (err: any) {
    accionError.value =
      err.response?.data?.message ||
      'No fue posible generar el enlace de descarga.';
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-slate-800">Clientes / Hospitales</h1>
        <p class="text-xs text-slate-500 mt-1">
          Revisión y validación de solicitudes institucionales (CU03).
        </p>
      </div>

      <div class="relative w-full sm:w-72">
        <Search class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          v-model="search"
          type="search"
          placeholder="Buscar razón social o RFC..."
          class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-600 focus:outline-none"
        />
      </div>
    </div>

    <div class="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-800">
      <strong>Nota:</strong> el backend actual expone únicamente las instituciones
      pendientes mediante <code>/clientes/pendientes</code>. Por ello esta vista funciona
      como bandeja de validación; todavía no existe un endpoint para listar todo el directorio
      de clientes aprobados/rechazados.
    </div>

    <div
      v-if="errorMsg"
      class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex gap-2"
    >
      <AlertCircle class="w-4 h-4 shrink-0" />
      {{ errorMsg }}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <Users class="w-4 h-4 mr-2 text-blue-600" />
          Directorio de solicitudes pendientes
        </h2>
        <span class="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded-full">
          {{ clientesFiltrados().length }} pendientes
        </span>
      </div>

      <div v-if="loading" class="py-10 text-center text-xs text-slate-400">
        Consultando clientes...
      </div>

      <div v-else-if="clientesFiltrados().length === 0" class="py-10 text-center">
        <Users class="w-8 h-8 mx-auto text-slate-300" />
        <p class="text-xs text-slate-400 mt-2">No hay solicitudes pendientes.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-xs">
          <thead>
            <tr class="text-slate-400 border-b border-slate-100">
              <th class="pb-3 font-semibold">Razón Social / Institución</th>
              <th class="pb-3 font-semibold">RFC</th>
              <th class="pb-3 font-semibold">Contacto</th>
              <th class="pb-3 font-semibold">Fecha de Alta</th>
              <th class="pb-3 font-semibold">Estado</th>
              <th class="pb-3 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="cliente in clientesFiltrados()" :key="cliente.id">
              <td class="py-3.5 font-semibold text-slate-800">{{ cliente.razon_social }}</td>
              <td class="py-3.5 text-slate-500">{{ cliente.rfc }}</td>
              <td class="py-3.5">
                <p class="text-slate-700">{{ cliente.nombre_contacto }}</p>
                <p class="text-[10px] text-slate-400">{{ cliente.usuario?.correo_electronico }}</p>
              </td>
              <td class="py-3.5 text-slate-500">
                {{ new Date(cliente.creado_en).toLocaleDateString('es-MX') }}
              </td>
              <td class="py-3.5">
                <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                  Pendiente
                </span>
              </td>
              <td class="py-3.5 text-right">
                <button
                  type="button"
                  @click="abrirCliente(cliente)"
                  class="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-semibold"
                >
                  <FileText class="w-3.5 h-3.5 mr-1.5" />
                  Validar (CU03)
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de validación -->
    <div
      v-if="modalCliente"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="bg-[#0a2540] text-white px-5 py-4 flex justify-between items-center">
          <div>
            <p class="text-xs font-bold">Validación de Cliente Institucional</p>
            <p class="text-[10px] text-slate-300 mt-0.5">{{ modalCliente.razon_social }}</p>
          </div>
          <button type="button" @click="cerrarCliente" class="p-1 hover:bg-white/10 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-5 space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="bg-slate-50 rounded-xl p-3">
              <p class="text-[10px] text-slate-400">RFC</p>
              <p class="font-semibold text-slate-800 mt-1">{{ modalCliente.rfc }}</p>
            </div>
            <div class="bg-slate-50 rounded-xl p-3">
              <p class="text-[10px] text-slate-400">Contacto</p>
              <p class="font-semibold text-slate-800 mt-1">{{ modalCliente.nombre_contacto }}</p>
            </div>
            <div class="bg-slate-50 rounded-xl p-3">
              <p class="text-[10px] text-slate-400">Correo</p>
              <p class="font-semibold text-slate-800 mt-1">{{ modalCliente.usuario?.correo_electronico }}</p>
            </div>
            <div class="bg-slate-50 rounded-xl p-3">
              <p class="text-[10px] text-slate-400">Teléfono</p>
              <p class="font-semibold text-slate-800 mt-1">{{ modalCliente.telefono }}</p>
            </div>
            <div class="md:col-span-2 bg-slate-50 rounded-xl p-3">
              <p class="text-[10px] text-slate-400">Dirección fiscal</p>
              <p class="font-semibold text-slate-800 mt-1">{{ modalCliente.direccion_fiscal }}</p>
            </div>
          </div>

          <div>
            <h3 class="text-xs font-bold text-slate-800 mb-3">Documentación recibida</h3>

            <div
              v-if="!modalCliente.documentos?.length"
              class="p-4 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 text-center"
            >
              No hay documentos vinculados a esta solicitud.
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="documento in modalCliente.documentos"
                :key="documento.id"
                class="flex items-center justify-between gap-3 border border-slate-200 rounded-xl p-3"
              >
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-slate-700 truncate">{{ documento.nombre_archivo }}</p>
                  <p class="text-[10px] text-slate-400">{{ documento.tipo_documento }}</p>
                </div>
                <button
                  type="button"
                  @click="descargarDocumento(documento)"
                  class="shrink-0 inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-semibold"
                >
                  <Download class="w-3.5 h-3.5 mr-1.5" />
                  Descargar
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="accionMsg"
            class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex gap-2"
          >
            <CheckCircle2 class="w-4 h-4 shrink-0" />
            {{ accionMsg }}
          </div>

          <div
            v-if="accionError"
            class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex gap-2"
          >
            <AlertCircle class="w-4 h-4 shrink-0" />
            {{ accionError }}
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">
              Motivo de rechazo (solo si corresponde)
            </label>
            <textarea
              v-model="motivoRechazo"
              rows="3"
              placeholder="Documenta el motivo de rechazo..."
              class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:outline-none"
            ></textarea>
          </div>

          <div class="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              @click="cerrarCliente"
              class="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-semibold"
            >
              Cerrar
            </button>
            <button
              type="button"
              :disabled="loadingAccion"
              @click="validarCliente('RECHAZADO')"
              class="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
            >
              <XCircle class="w-4 h-4 mr-1.5" />
              Rechazar
            </button>
            <button
              type="button"
              :disabled="loadingAccion"
              @click="validarCliente('APROBADO')"
              class="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
            >
              <CheckCircle2 class="w-4 h-4 mr-1.5" />
              Aprobar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

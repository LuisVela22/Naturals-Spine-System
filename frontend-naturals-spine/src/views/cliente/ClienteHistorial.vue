<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../../api/axios';
import { 
  FileText, 
  Download, 
  X, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-vue-next';

const ordenes = ref<any[]>([]);
const ordenDocsModal = ref<any>(null);
const ordenPagoModal = ref<any>(null);
const documentos = ref<any[]>([]);

const archivoPago = ref<File | null>(null);
const subiendoPago = ref(false);
const errorPago = ref('');

const cargarOrdenes = async () => {
  try {
    const { data } = await api.get('/ordenes');
    ordenes.value = data;
  } catch (err) {
    console.error('Error al cargar órdenes:', err);
  }
};

onMounted(cargarOrdenes);

const verDocumentos = async (ord: any) => {
  ordenDocsModal.value = ord;
  try {
    const { data } = await api.get(`/documentos/orden/${ord.id}`);
    documentos.value = data;
  } catch (err) {
    documentos.value = [];
  }
};

const abrirModalPago = (ord: any) => {
  ordenPagoModal.value = ord;
  archivoPago.value = null;
  errorPago.value = '';
};

const handleArchivoPago = (e: any) => {
  const file = e.target.files[0];
  if (!file) return;

  const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!tiposPermitidos.includes(file.type)) {
    errorPago.value = 'RN03: Solo se admiten archivos PDF, JPEG o PNG.';
    archivoPago.value = null;
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    errorPago.value = 'RN03: El archivo excede el tamaño máximo permitido de 5MB.';
    archivoPago.value = null;
    return;
  }

  errorPago.value = '';
  archivoPago.value = file;
};

const enviarComprobantePago = async () => {
  if (!archivoPago.value || !ordenPagoModal.value) return;

  subiendoPago.value = true;
  errorPago.value = '';

  try {
    const rutaGcsSimulada = `documentos/pagos/${Date.now()}_${archivoPago.value.name}`;
    
    await api.post('/documentos/confirmar', {
      rutaGcs: rutaGcsSimulada,
      dto: {
        tipo_documento: 'COMPROBANTE_PAGO',
        orden_id: ordenPagoModal.value.id,
        nombre_archivo: archivoPago.value.name,
        mime_type: archivoPago.value.type,
        tamano_bytes: archivoPago.value.size,
      },
    });

    ordenPagoModal.value = null;
    archivoPago.value = null;
    await cargarOrdenes();
  } catch (err: any) {
    errorPago.value = err.response?.data?.message || 'Error al vincular el comprobante de pago';
  } finally {
    subiendoPago.value = false;
  }
};
</script>

<template>
  <div class="space-y-6 w-full max-w-full">
    <h1 class="text-lg md:text-xl font-bold text-slate-800">Historial y Repositorio Documental</h1>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
      <h2 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
        <FileSpreadsheet class="w-4 h-4 mr-2 text-blue-600" />
        Historial de Órdenes e Intercambio Documental
      </h2>

      <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <table class="w-full min-w-[650px] text-left text-xs">
          <thead>
            <tr class="text-slate-400 border-b border-slate-100">
              <th class="pb-3 font-semibold">ID / Fecha</th>
              <th class="pb-3 font-semibold">Equipo / Operación</th>
              <th class="pb-3 font-semibold">Estado Actual</th>
              <th class="pb-3 font-semibold text-right">Acciones de Trazabilidad</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="ordenes.length === 0">
              <td colspan="4" class="py-6 text-center text-slate-400">No hay registros de órdenes.</td>
            </tr>
            <tr v-for="ord in ordenes" :key="ord.id">
              <td class="py-3.5 whitespace-nowrap">
                <p class="font-bold text-blue-600">#{{ ord.id.substring(0, 8) }}</p>
                <p class="text-[10px] text-slate-400">{{ new Date(ord.fecha_creacion).toLocaleDateString() }}</p>
              </td>
              <td class="py-3.5 font-medium text-slate-800">
                {{ ord.descripcion_equipo }}
                <span class="ml-1 text-[10px] text-slate-500 font-bold uppercase">({{ ord.tipo_orden }})</span>
              </td>
              <td class="py-3.5 whitespace-nowrap">
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
              <td class="py-3.5 text-right whitespace-nowrap space-x-2">
                <!-- Botón de Pago: Según estado y regla RN05 -->
                <button 
                  v-if="!ord.bloqueado_para_cliente"
                  @click="abrirModalPago(ord)"
                  class="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-bold text-[11px] inline-flex items-center space-x-1"
                >
                  <UploadCloud class="w-3.5 h-3.5 mr-1" />
                  <span>Subir Pago</span>
                </button>

                <span 
                  v-else
                  class="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-bold text-[10px] inline-flex items-center"
                >
                  <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 mr-1" />
                  Pagado (Inmutable)
                </span>

                <button 
                  @click="verDocumentos(ord)" 
                  class="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-bold text-[11px] inline-flex items-center"
                >
                  <FileText class="w-3.5 h-3.5 mr-1" />
                  Ver Docs
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Repositorio Documental -->
    <div v-if="ordenDocsModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div class="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 class="text-xs md:text-sm font-bold text-slate-800 flex items-center">
            <FileText class="w-4 h-4 mr-2 text-blue-600 shrink-0" /> Repositorio #{{ ordenDocsModal.id.substring(0, 8) }}
          </h3>
          <button @click="ordenDocsModal = null" class="text-slate-400 hover:text-slate-600 p-1">
            <X class="w-4 h-4" />
          </button>
        </div>

        <p class="text-xs text-slate-500">Documentos oficiales vinculados y disponibles para descarga.</p>

        <div v-if="documentos.length === 0" class="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-xl">
          No hay documentos vinculados a esta orden todavía.
        </div>

        <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
          <div v-for="doc in documentos" :key="doc.id" class="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div class="flex items-center space-x-2 overflow-hidden">
              <span class="text-blue-600 font-bold text-[10px] shrink-0 border border-blue-200 bg-blue-50 px-1 py-0.5 rounded">DOC</span>
              <span class="text-xs text-slate-700 font-medium truncate">{{ doc.nombre_archivo }}</span>
            </div>
            <button class="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg shrink-0">
              <Download class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="pt-2 text-right">
          <button @click="ordenDocsModal = null" class="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Subir Comprobante de Pago (CU07 / RN05) -->
    <div v-if="ordenPagoModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div class="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 class="text-xs md:text-sm font-bold text-slate-800 flex items-center">
            <UploadCloud class="w-4 h-4 mr-2 text-emerald-600 shrink-0" /> Subir Comprobante de Pago
          </h3>
          <button @click="ordenPagoModal = null" class="text-slate-400 hover:text-slate-600 p-1">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] p-3 rounded-xl flex items-start space-x-2">
          <AlertCircle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Regla RN05:</strong> Al registrar el comprobante de pago, los datos de esta orden quedarán inmutables para el cliente.
          </p>
        </div>

        <div v-if="errorPago" class="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
          {{ errorPago }}
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Seleccionar comprobante (PDF o Imagen, máx. 5MB) *</label>
          <input 
            type="file" 
            accept=".pdf,image/jpeg,image/png" 
            @change="handleArchivoPago"
            class="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" 
          />
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
          <button @click="ordenPagoModal = null" class="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-semibold">
            Cancelar
          </button>
          <button 
            @click="enviarComprobantePago" 
            :disabled="!archivoPago || subiendoPago" 
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 inline-flex items-center space-x-1"
          >
            <span>{{ subiendoPago ? 'Procesando...' : 'Confirmar y Vincular' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
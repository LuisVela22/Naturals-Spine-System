import api from '../api/axios';

export type TipoDocumento =
  | 'RFC'
  | 'INE'
  | 'COMPROBANTE_DOMICILIO'
  | 'FACTURA'
  | 'REMISION'
  | 'CONTRATO'
  | 'COMPROBANTE_PAGO';

const validarArchivo = (file: File) => {
  const permitidos = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!permitidos.includes(file.type)) {
    throw new Error('Solo se admiten archivos PDF, JPEG o PNG.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('El archivo supera el límite máximo de 5 MB.');
  }
};

export async function cargarDocumento(file: File, tipo_documento: TipoDocumento, orden_id?: string) {
  validarArchivo(file);

  const storageMode = String(import.meta.env.VITE_STORAGE_MODE || 'local').toLowerCase();

  // Modo local de pruebas: no requiere GCP ni credenciales de Google.
  if (storageMode === 'local') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo_documento', tipo_documento);
    if (orden_id) formData.append('orden_id', orden_id);

    const token = localStorage.getItem('token');
    const baseURL = api.defaults.baseURL || 'http://localhost:3000/api';
    const response = await fetch(`${baseURL}/documentos/subir-local`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      let message = 'No fue posible guardar el archivo localmente.';
      try {
        const data = await response.json();
        message = Array.isArray(data.message) ? data.message.join(', ') : data.message || message;
      } catch {
        // Mantener mensaje genérico.
      }
      throw new Error(message);
    }

    return response.json();
  }

  // Modo GCP: conserva el flujo original de URL firmada.
  const payload = {
    tipo_documento,
    ...(orden_id ? { orden_id } : {}),
    nombre_archivo: file.name,
    mime_type: file.type,
    tamano_bytes: file.size,
  };

  const { data } = await api.post('/documentos/solicitar-subida', payload);

  const uploadResponse = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('No fue posible subir el archivo al almacenamiento GCP.');
  }

  const confirmado = await api.post('/documentos/confirmar', {
    ...payload,
    rutaGcs: data.rutaGcs,
  });

  return confirmado.data;
}

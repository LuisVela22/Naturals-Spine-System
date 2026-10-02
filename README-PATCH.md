# Patch de vistas faltantes - Naturals & Spine System

Este paquete contiene cambios para el frontend del repositorio:
https://github.com/LuisVela22/Naturals-Spine-System

## Archivos

- `src/router/index.ts` — reemplazo del router actual. Registra las rutas de ADMIN y las dos vistas faltantes del cliente y agrega control de rol.
- `src/views/cliente/ClienteNuevaOrden.vue` — CU04, registro de orden de compra/renta.
- `src/views/cliente/ClienteHistorial.vue` — CU06/CU07/CU09, historial, repositorio y comprobante de pago.
- `src/views/admin/AdminClientes.vue` — CU03, validación de clientes pendientes.
- `src/views/admin/AdminOrdenes.vue` — CU05/CU08, actualización de estados y carga de factura/remisión.
- `src/utils/documentos.ts` — helper para el flujo de URL firmada de Google Cloud Storage.

## Dependencias

No se agregan dependencias npm nuevas. Se utilizan Vue Router, Axios y lucide-vue-next, que ya existen en el `package.json` actual.

## Instalación del patch

1. Haz una copia de seguridad de:
   `frontend-naturals-spine/src/router/index.ts`
2. Copia el contenido de `src/` de este paquete sobre:
   `frontend-naturals-spine/src/`
3. Conserva los archivos existentes del proyecto que no aparecen en el paquete.
4. Desde `frontend-naturals-spine` ejecuta:
   `npm run build`
5. Si compila correctamente:
   `npm run dev`

## Rutas agregadas

Cliente:
- `/cliente/dashboard`
- `/cliente/nueva-orden`
- `/cliente/historial`

Administrador:
- `/admin/dashboard`
- `/admin/clientes`
- `/admin/ordenes`

## Compatibilidad con el backend actual

El DTO `CrearOrdenDto` del backend acepta únicamente:
- `tipo_orden`
- `descripcion_equipo`
- `monto_total` (opcional)

Por eso, la vista de nueva orden muestra fecha requerida, médico y quirófano para respetar el mockup, pero actualmente concatena esos datos dentro de `descripcion_equipo` para no enviar campos que el backend rechazaría.

El mockup contempla adjuntar una "Orden de Compra Institucional", pero el enum actual `TipoDocumento` no tiene un valor específico para ese documento. Por seguridad semántica, la vista permite seleccionarlo pero no lo envía todavía.

El comprobante de pago sí está implementado mediante `COMPROBANTE_PAGO`.

## Google Cloud Storage

Las cargas de documentos requieren que el backend tenga configuradas las credenciales de Google Cloud y `GCP_STORAGE_BUCKET_NAME`. Si GCS no está configurado, la interfaz puede mostrar el formulario, pero la carga real fallará en `/documentos/solicitar-subida`.

## Pruebas

No se incluye una base de datos ni secretos. La prueba de integración debe ejecutarse en la máquina donde están corriendo:
- PostgreSQL/Docker
- NestJS en `localhost:3000`
- Vue/Vite en `localhost:5173`

Después de copiar el patch, realizar:
1. Login ADMIN.
2. Abrir `/admin/dashboard`.
3. Abrir `/admin/clientes` y validar una solicitud pendiente.
4. Abrir `/admin/ordenes`.
5. Login CLIENTE.
6. Abrir `/cliente/dashboard`.
7. Crear una orden en `/cliente/nueva-orden`.
8. Comprobar que aparece en `/cliente/historial`.
9. Como ADMIN, avanzar EN_REVISION -> APROBADA -> EN_ENVIO.
10. Cargar factura/remisión.
11. Concluir la orden.
12. Como CLIENTE, consultar documentos y, si corresponde, cargar comprobante de pago.

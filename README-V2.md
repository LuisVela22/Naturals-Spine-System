# Patch V2 - flujo de órdenes y almacenamiento local

Este patch implementa dos cambios para las pruebas locales del Trabajo Terminal:

1. Almacenamiento temporal local de documentos, sin GCP.
2. Flujo de orden: EN_REVISION -> APROBADA (requiere REMISION) -> EN_ENVIO (requiere COMPROBANTE_PAGO) -> CONCLUIDA. También permite rechazar una solicitud/continuidad pasando a CONCLUIDA con motivo.

## 1. Archivos a copiar

### Backend
Copiar:
- `backend/src/documentos/documentos.service.ts` -> `backend-naturals-spine/src/documentos/documentos.service.ts`
- `backend/src/documentos/documentos.controller.ts` -> `backend-naturals-spine/src/documentos/documentos.controller.ts`
- `backend/src/ordenes/ordenes.service.ts` -> `backend-naturals-spine/src/ordenes/ordenes.service.ts`

No se requiere migración de Prisma para estos cambios porque se reutilizan `REMISION`, `COMPROBANTE_PAGO`, `CONCLUIDA` y los campos existentes.

### Frontend
Copiar:
- `frontend/src/utils/documentos.ts` -> `frontend-naturals-spine/src/utils/documentos.ts`
- `frontend/src/views/admin/AdminOrdenes.vue` -> `frontend-naturals-spine/src/views/admin/AdminOrdenes.vue`
- `frontend/src/views/cliente/ClienteHistorial.vue` -> `frontend-naturals-spine/src/views/cliente/ClienteHistorial.vue`

## 2. Activar almacenamiento local

Backend `.env`:

    STORAGE_PROVIDER=local
    LOCAL_STORAGE_DIR=storage/documentos

Frontend `.env.local`:

    VITE_STORAGE_MODE=local

Después de modificar `.env` de Vite, reiniciar `npm run dev`.

Los archivos quedarán físicamente en:

    backend-naturals-spine/storage/documentos/

No deben subirse a Git. Agregar `/storage/documentos` al `.gitignore` del backend.

## 3. Flujo de prueba

1. Cliente crea una orden -> `EN_REVISION`.
2. Admin abre Gestión de Órdenes.
3. Admin intenta aceptar sin remisión -> el backend debe rechazarlo.
4. Admin carga una REMISION PDF/JPEG/PNG <= 5 MB.
5. Admin acepta -> `APROBADA`.
6. Cliente ve `APROBADA / Pendiente de pago` y abre `Confirmar y pagar`.
7. Cliente consulta la remisión y ve métodos de pago ficticios.
8. Sin archivo válido, el botón de envío del comprobante permanece deshabilitado.
9. Cliente adjunta comprobante válido -> se guarda localmente y la orden queda bloqueada para modificaciones del cliente.
10. Admin abre la orden y descarga/verifica el comprobante.
11. Admin intenta `Envío` sin comprobante -> el backend lo rechaza.
12. Con comprobante -> `EN_ENVIO`.
13. Si el comprobante no cumple, Admin puede `Rechazar continuidad`, escribir el motivo y pasar a `CONCLUIDA`.
14. Desde `EN_ENVIO`, Admin puede cargar factura/remisión y posteriormente concluir.

## 4. Regresar a GCP

Cambiar:

    STORAGE_PROVIDER=gcp

y en frontend:

    VITE_STORAGE_MODE=gcp

Luego reiniciar backend y frontend.

El flujo original de URL firmada de Google Cloud Storage se conserva.

## 5. Nota sobre el modelo actual

El modelo de Prisma no tiene un estado `RECHAZADA`. Por eso, para no alterar todavía el esquema, el rechazo se registra como `CONCLUIDA` y el motivo queda en `OrderLog.comentario`. Si posteriormente se requiere distinguir formalmente `RECHAZADA` de `CONCLUIDA`, conviene agregar un estado nuevo mediante migración.

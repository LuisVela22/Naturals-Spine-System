-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('CLIENTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "EstadoValidacion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoOrden" AS ENUM ('COMPRA', 'RENTA');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('EN_REVISION', 'APROBADA', 'EN_ENVIO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('RFC', 'INE', 'COMPROBANTE_DOMICILIO', 'FACTURA', 'REMISION', 'CONTRATO', 'COMPROBANTE_PAGO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "correo_electronico" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes_institucionales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "rfc" VARCHAR(13) NOT NULL,
    "razon_social" VARCHAR(255) NOT NULL,
    "nombre_contacto" VARCHAR(255) NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,
    "direccion_fiscal" TEXT NOT NULL,
    "estado_validacion" "EstadoValidacion" NOT NULL DEFAULT 'PENDIENTE',
    "motivo_rechazo" TEXT,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_institucionales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_empresa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "numero_empleado" VARCHAR(20) NOT NULL,
    "nombre_completo" VARCHAR(255) NOT NULL,
    "departamento" VARCHAR(100),

    CONSTRAINT "personal_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "tipo_orden" "TipoOrden" NOT NULL,
    "descripcion_equipo" TEXT NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'EN_REVISION',
    "bloqueado_para_cliente" BOOLEAN NOT NULL DEFAULT false,
    "notificacion_pendiente" BOOLEAN NOT NULL DEFAULT false,
    "monto_total" DECIMAL(12,2),
    "fecha_creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP NOT NULL,

    CONSTRAINT "ordenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orden_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "estado_anterior" "EstadoOrden" NOT NULL,
    "estado_nuevo" "EstadoOrden" NOT NULL,
    "comentario" TEXT,
    "fecha_cambio" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID,
    "orden_id" UUID,
    "tipo_documento" "TipoDocumento" NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "url_gcs" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "fecha_carga" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cargado_por" UUID NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_electronico_key" ON "usuarios"("correo_electronico");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_institucionales_usuario_id_key" ON "clientes_institucionales"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_institucionales_rfc_key" ON "clientes_institucionales"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX "personal_empresa_usuario_id_key" ON "personal_empresa"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_empresa_numero_empleado_key" ON "personal_empresa"("numero_empleado");

-- AddForeignKey
ALTER TABLE "clientes_institucionales" ADD CONSTRAINT "clientes_institucionales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_empresa" ADD CONSTRAINT "personal_empresa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes_institucionales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_logs" ADD CONSTRAINT "order_logs_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_logs" ADD CONSTRAINT "order_logs_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes_institucionales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_cargado_por_fkey" FOREIGN KEY ("cargado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

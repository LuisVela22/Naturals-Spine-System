ALTER TABLE "ordenes"
  ADD COLUMN "fecha_requerida" TIMESTAMP(3),
  ADD COLUMN "hora_requerida" VARCHAR(5),
  ADD COLUMN "ubicacion" TEXT,
  ADD COLUMN "detalles_renta" TEXT,
  ADD COLUMN "archivo_detalles_renta" VARCHAR(255),
  ADD COLUMN "aclaracion_renta_enviada" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "alerta_24h_enviada" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "prioridad_notificada" VARCHAR(10) NOT NULL DEFAULT 'BAJA';

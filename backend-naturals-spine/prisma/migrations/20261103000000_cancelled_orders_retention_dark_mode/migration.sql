ALTER TYPE "EstadoOrden" ADD VALUE 'CANCELADA';

ALTER TABLE "usuarios"
  ADD COLUMN "modo_oscuro" BOOLEAN DEFAULT NULL;

ALTER TABLE "ordenes"
  ADD COLUMN "responsable_recepcion" VARCHAR(255),
  ADD COLUMN "concluida_en" TIMESTAMP(3),
  ADD COLUMN "oculta_cliente" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "oculta_admin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ultima_alerta_sin_cambio" TIMESTAMP(3);

UPDATE "ordenes"
SET "concluida_en" = "fecha_actualizacion"
WHERE "estado" = 'CONCLUIDA';

-- WEB-0D.1B-P0B2-R1 -- columna ADITIVA nullable: instante EXACTO en que
-- una OutboxEventDelivery se volvio terminal para su consumidor. Resuelve
-- Issue 1 de la revision P0B2 (createdAt como proxy de "terminal FAILED"
-- podia causar un purgado prematuro si los reintentos se agotaron mucho
-- despues de created_at -- backend detenido, scheduler retrasado, etc).

-- AlterTable
ALTER TABLE "outbox_event_delivery" ADD COLUMN "terminal_at" TIMESTAMP(3);

-- Backfill PROCESSED: exacto y confiable -- el instante real de exito ya
-- esta persistido en processed_at, no es una aproximacion.
UPDATE "outbox_event_delivery"
SET "terminal_at" = "processed_at"
WHERE "status" = 'PROCESSED' AND "terminal_at" IS NULL;

-- Backfill FAILED con reintentos agotados (>= 10, el limite congelado
-- actual -- OUTBOX_MAX_DELIVERY_ATTEMPTS/MAX_DELIVERY_ATTEMPTS): NO existe
-- ningun timestamp historico exacto de cuando se agoto el ultimo intento.
-- NUNCA se usa created_at como sustituto (exactamente el problema que esta
-- migracion corrige). En su lugar se asigna una base de retencion
-- CONSERVADORA = el instante de esta migracion (NOW()): el reloj de 90
-- dias para estas filas historicas arranca HOY, nunca antes de hoy -- la
-- unica direccion seguraes retrasar la purga, jamas adelantarla. Filas
-- FAILED con attempts < 10 (todavia reintentables) quedan con
-- terminal_at = NULL, sin cambios de comportamiento.
UPDATE "outbox_event_delivery"
SET "terminal_at" = NOW()
WHERE "status" = 'FAILED' AND "attempts" >= 10 AND "terminal_at" IS NULL;

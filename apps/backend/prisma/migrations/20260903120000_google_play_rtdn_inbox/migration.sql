-- PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
--
-- Migración ADITIVA PURA: crea el buzón durable de RTDN
-- (`google_play_rtdn_event` + enum `rtdn_processing_status`). NO toca ninguna
-- tabla, columna, índice, constraint ni trigger existente. NO destructiva.
-- No requiere backfill: es un buzón append-only para eventos futuros.
--
-- Un RTDN NO es la verdad de la suscripción -- este buzón solo persiste el
-- evento de ENTREGA (autenticado, deduplicado por `message_id`) para que la
-- reconciliación con Google (`subscriptionsv2.get` -> C3.2) pueda correr de
-- forma asíncrona y reintentable. Ver
-- docs/adr/PREMIUM-V1-LAYER-3-BILLING-ARCHITECTURE.md §H.

-- CreateEnum
CREATE TYPE "rtdn_processing_status" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'RETRYABLE', 'FAILED', 'IGNORED');

-- CreateTable
CREATE TABLE "google_play_rtdn_event" (
    "id" UUID NOT NULL,
    "message_id" TEXT NOT NULL,
    "subscription_resource" TEXT,
    "provider" "subscription_provider" NOT NULL DEFAULT 'GOOGLE_PLAY',
    "package_name" TEXT NOT NULL,
    "notification_version" TEXT,
    "notification_kind" TEXT NOT NULL,
    "notification_type" INTEGER,
    "purchase_token" TEXT,
    "event_time" TIMESTAMP(3),
    "status" "rtdn_processing_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_error_code" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_play_rtdn_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_play_rtdn_event_message_id_key" ON "google_play_rtdn_event"("message_id");

-- CreateIndex
CREATE INDEX "google_play_rtdn_event_status_idx" ON "google_play_rtdn_event"("status");

-- CreateIndex
CREATE INDEX "google_play_rtdn_event_purchase_token_idx" ON "google_play_rtdn_event"("purchase_token");

-- PREMIUM V1 -- Capa 3 (Google Play Billing), C3.1.
--
-- Migración ADITIVA PURA: crea el dominio de suscripción del backend
-- (`AccountSubscription` + 3 enums). NO toca ninguna tabla, columna, índice,
-- constraint ni trigger existente. NO destructiva. Las cuentas y entitlements
-- existentes siguen siendo válidos sin backfill: una cuenta sin fila en
-- `account_subscription` deriva `FREE` (comportamiento actual preservado).
--
-- C3.1 NO conecta con Google: sin verificación (`subscriptionsv2.get`), sin
-- RTDN, sin endpoints de compra/restore, sin credenciales. Solo el esquema +
-- la derivación pura del tier. Ver
-- docs/adr/PREMIUM-V1-LAYER-3-BILLING-ARCHITECTURE.md §D / §E.
--
-- Frontera congelada: `account_subscription` (verdad de billing) !=
-- `AccountEntitlement` (authorization consumida por Estudio/Ensayos/Tutor).

-- CreateEnum
CREATE TYPE "subscription_provider" AS ENUM ('GOOGLE_PLAY');

-- CreateEnum
CREATE TYPE "subscription_state" AS ENUM ('PENDING', 'ACTIVE', 'IN_GRACE_PERIOD', 'ON_HOLD', 'CANCELED', 'EXPIRED', 'REVOKED', 'PAUSED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "subscription_acknowledgement_state" AS ENUM ('PENDING', 'ACKNOWLEDGED');

-- CreateTable
CREATE TABLE "account_subscription" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "provider" "subscription_provider" NOT NULL DEFAULT 'GOOGLE_PLAY',
    "product_id" TEXT NOT NULL,
    "base_plan_id" TEXT,
    "purchase_token" TEXT NOT NULL,
    "linked_purchase_token" TEXT,
    "state" "subscription_state" NOT NULL,
    "expiry_time" TIMESTAMP(3),
    "start_time" TIMESTAMP(3),
    "auto_renewing" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgement_state" "subscription_acknowledgement_state" NOT NULL DEFAULT 'PENDING',
    "latest_notification_type" TEXT,
    "latest_event_time" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "cancel_user_initiated" BOOLEAN,
    "cancel_time" TIMESTAMP(3),
    "region_code" TEXT,
    "test_purchase" BOOLEAN NOT NULL DEFAULT false,
    "raw_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_subscription_purchase_token_key" ON "account_subscription"("purchase_token");

-- CreateIndex
CREATE INDEX "account_subscription_account_id_idx" ON "account_subscription"("account_id");

-- CreateIndex
CREATE INDEX "account_subscription_state_idx" ON "account_subscription"("state");

-- CreateIndex
CREATE INDEX "account_subscription_expiry_time_idx" ON "account_subscription"("expiry_time");

-- AddForeignKey
ALTER TABLE "account_subscription" ADD CONSTRAINT "account_subscription_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

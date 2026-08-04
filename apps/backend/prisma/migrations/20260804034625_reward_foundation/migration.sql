-- CreateEnum
CREATE TYPE "reward_bundle_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "reward_component_type" AS ENUM ('XP_BONUS', 'TITLE', 'COSMETIC');

-- CreateEnum
CREATE TYPE "reward_source_entity_type" AS ENUM ('LEVEL', 'ACHIEVEMENT_UNLOCK', 'CHALLENGE_CLAIM');

-- CreateEnum
CREATE TYPE "reward_delivery_status" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "reward_bundle" (
    "id" UUID NOT NULL,
    "bundle_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "reward_bundle_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_bundle_item" (
    "id" UUID NOT NULL,
    "reward_bundle_id" UUID NOT NULL,
    "component_type" "reward_component_type" NOT NULL,
    "xp_amount" INTEGER,
    "reference_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_bundle_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_grant" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "reward_bundle_id" UUID NOT NULL,
    "source_entity_type" "reward_source_entity_type" NOT NULL,
    "source_entity_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_grant_component" (
    "id" UUID NOT NULL,
    "reward_grant_id" UUID NOT NULL,
    "component_type" "reward_component_type" NOT NULL,
    "xp_amount" INTEGER,
    "reference_id" UUID,
    "delivery_status" "reward_delivery_status" NOT NULL DEFAULT 'PENDING',
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_grant_component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_evaluation_cursor" (
    "account_id" UUID NOT NULL,
    "last_processed_recorded_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_eligible_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_evaluation_cursor_pkey" PRIMARY KEY ("account_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reward_bundle_bundle_key_key" ON "reward_bundle"("bundle_key");

-- CreateIndex
CREATE INDEX "reward_bundle_item_reward_bundle_id_idx" ON "reward_bundle_item"("reward_bundle_id");

-- CreateIndex
CREATE UNIQUE INDEX "reward_grant_idempotency_key_key" ON "reward_grant"("idempotency_key");

-- CreateIndex
CREATE INDEX "reward_grant_account_id_idx" ON "reward_grant"("account_id");

-- CreateIndex
CREATE INDEX "reward_grant_component_reward_grant_id_idx" ON "reward_grant_component"("reward_grant_id");

-- AddForeignKey
ALTER TABLE "reward_bundle_item" ADD CONSTRAINT "reward_bundle_item_reward_bundle_id_fkey" FOREIGN KEY ("reward_bundle_id") REFERENCES "reward_bundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_grant" ADD CONSTRAINT "reward_grant_reward_bundle_id_fkey" FOREIGN KEY ("reward_bundle_id") REFERENCES "reward_bundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_grant_component" ADD CONSTRAINT "reward_grant_component_reward_grant_id_fkey" FOREIGN KEY ("reward_grant_id") REFERENCES "reward_grant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Coherencia del snapshot por component_type (ADR-0019, precisión obligatoria
-- del Product Owner): XP_BONUS exige xp_amount > 0 y reference_id NULL;
-- TITLE/COSMETIC exigen reference_id no nulo y xp_amount NULL. Ninguna otra
-- combinación es válida -- Prisma no expresa esta validación condicional de
-- forma nativa, se añade a mano, mismo criterio que las CHECK de
-- xp_grant_integrity (Bloque I).
ALTER TABLE "reward_bundle_item" ADD CONSTRAINT "reward_bundle_item_component_snapshot_check" CHECK (
  (component_type = 'XP_BONUS' AND xp_amount > 0 AND reference_id IS NULL)
  OR
  (component_type IN ('TITLE', 'COSMETIC') AND reference_id IS NOT NULL AND xp_amount IS NULL)
);

ALTER TABLE "reward_grant_component" ADD CONSTRAINT "reward_grant_component_component_snapshot_check" CHECK (
  (component_type = 'XP_BONUS' AND xp_amount > 0 AND reference_id IS NULL)
  OR
  (component_type IN ('TITLE', 'COSMETIC') AND reference_id IS NOT NULL AND xp_amount IS NULL)
);

-- Terminalidad de DELIVERED (ADR-0019 §3): ningún código vuelve a escribir
-- un componente ya entregado -- mismo criterio que
-- enforce_xp_ledger_entry_immutable (Bloque I), aplicado condicionalmente
-- solo cuando el estado ANTERIOR ya era DELIVERED (a diferencia de
-- xp_ledger_entry, que es inmutable desde su creación: aquí sí se permite
-- actualizar mientras está PENDING/FAILED, para poder transicionar a
-- DELIVERED o registrar un reintento fallido).
CREATE OR REPLACE FUNCTION enforce_reward_grant_component_delivered_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."delivery_status" = 'DELIVERED' THEN
    RAISE EXCEPTION 'reward_grant_component ya entregado (DELIVERED) es inmutable (id=%)', OLD."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reward_grant_component_delivered_immutable
BEFORE UPDATE ON "reward_grant_component"
FOR EACH ROW EXECUTE FUNCTION enforce_reward_grant_component_delivered_immutable();

-- Sin camino de borrado legítimo en este dominio (mismo criterio que
-- xp_ledger_entry, Bloque I): bloqueado incondicionalmente, sin excepción.
CREATE OR REPLACE FUNCTION enforce_reward_grant_component_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'reward_grant_component no admite DELETE (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reward_grant_component_no_delete
BEFORE DELETE ON "reward_grant_component"
FOR EACH ROW EXECUTE FUNCTION enforce_reward_grant_component_no_delete();

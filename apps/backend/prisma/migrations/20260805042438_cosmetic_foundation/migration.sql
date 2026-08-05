-- CreateEnum
CREATE TYPE "cosmetic_slot" AS ENUM ('AVATAR', 'AVATAR_FRAME', 'PROFILE_BANNER', 'BADGE');

-- CreateEnum
CREATE TYPE "cosmetic_visibility_status" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "cosmetic_item_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "inventory_item_ownership_status" AS ENUM ('ACTIVE', 'REVOKED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "cosmetic_item" (
    "id" UUID NOT NULL,
    "item_key" TEXT NOT NULL,
    "item_type" "cosmetic_slot" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rarity_class" TEXT NOT NULL,
    "asset_reference" TEXT NOT NULL,
    "visibility_status" "cosmetic_visibility_status" NOT NULL,
    "status" "cosmetic_item_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "cosmetic_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_item" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "cosmetic_item_id" UUID NOT NULL,
    "acquisition_source_type" "reward_source_entity_type" NOT NULL,
    "acquisition_source_id" TEXT NOT NULL,
    "acquired_at" TIMESTAMP(3) NOT NULL,
    "ownership_status" "inventory_item_ownership_status" NOT NULL DEFAULT 'ACTIVE',
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cosmetic_item_item_key_key" ON "cosmetic_item"("item_key");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_account_id_cosmetic_item_id_key" ON "inventory_item"("account_id", "cosmetic_item_id");

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_cosmetic_item_id_fkey" FOREIGN KEY ("cosmetic_item_id") REFERENCES "cosmetic_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cierra la promesa hecha en 1.a ("COSMETIC queda sin esta validación hasta
-- que cosmetic_item exista -- Incremento 5") -- mismo criterio EXACTO que
-- el trigger de TITLE (3.a, migración title_foundation): se valida en
-- AMBAS tablas -- reward_bundle_item (configuración, mutable) Y
-- reward_grant_component (snapshot ya entregado/en curso). `reference_id
-- IS NOT NULL` en la condición: si es NULL, el CHECK de coherencia ya
-- existente (component_snapshot_check, 1.a) es quien debe rechazarlo con
-- su propio código (23514) -- este trigger no se adelanta ni enmascara ese
-- error. Ningún trigger nuevo toca XP_BONUS/TITLE.
CREATE OR REPLACE FUNCTION enforce_reward_bundle_item_cosmetic_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."component_type" = 'COSMETIC' AND NEW."reference_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "cosmetic_item" WHERE "id" = NEW."reference_id") THEN
    RAISE EXCEPTION 'reward_bundle_item.reference_id (%) no existe en cosmetic_item (component_type = COSMETIC)', NEW."reference_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reward_bundle_item_cosmetic_reference
BEFORE INSERT OR UPDATE ON "reward_bundle_item"
FOR EACH ROW EXECUTE FUNCTION enforce_reward_bundle_item_cosmetic_reference();

CREATE OR REPLACE FUNCTION enforce_reward_grant_component_cosmetic_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."component_type" = 'COSMETIC' AND NEW."reference_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "cosmetic_item" WHERE "id" = NEW."reference_id") THEN
    RAISE EXCEPTION 'reward_grant_component.reference_id (%) no existe en cosmetic_item (component_type = COSMETIC)', NEW."reference_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reward_grant_component_cosmetic_reference
BEFORE INSERT OR UPDATE ON "reward_grant_component"
FOR EACH ROW EXECUTE FUNCTION enforce_reward_grant_component_cosmetic_reference();

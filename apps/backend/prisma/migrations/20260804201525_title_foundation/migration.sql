-- CreateEnum
CREATE TYPE "title_visibility_status" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "title_definition_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "account_title_ownership_status" AS ENUM ('ACTIVE', 'REVOKED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "title_definition" (
    "id" UUID NOT NULL,
    "title_key" TEXT NOT NULL,
    "display_text" TEXT NOT NULL,
    "description" TEXT,
    "rarity_class" TEXT NOT NULL,
    "unlock_source_type" TEXT NOT NULL,
    "visibility_status" "title_visibility_status" NOT NULL,
    "status" "title_definition_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "title_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_title" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "title_definition_id" UUID NOT NULL,
    "acquisition_source_type" "reward_source_entity_type" NOT NULL,
    "acquisition_source_id" TEXT NOT NULL,
    "acquired_at" TIMESTAMP(3) NOT NULL,
    "ownership_status" "account_title_ownership_status" NOT NULL DEFAULT 'ACTIVE',
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "account_title_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "title_definition_title_key_key" ON "title_definition"("title_key");

-- CreateIndex
CREATE UNIQUE INDEX "account_title_account_id_title_definition_id_key" ON "account_title"("account_id", "title_definition_id");

-- AddForeignKey
ALTER TABLE "account_title" ADD CONSTRAINT "account_title_title_definition_id_fkey" FOREIGN KEY ("title_definition_id") REFERENCES "title_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cierra la promesa hecha en 1.a ("SIN FK a title_definition/cosmetic_item
-- -- esas tablas no existen todavía; se añadirá la restricción cuando
-- existan") -- title_definition ya existe. reference_id no puede ser una
-- FK condicional nativa de Postgres (apunta a title_definition O
-- cosmetic_item según component_type) -- se valida por subconsulta, mismo
-- criterio que las garantías compuestas de logros (2.b). Precisión
-- obligatoria del Product Owner (sub-incremento 3.a): se valida en AMBAS
-- tablas -- reward_bundle_item (configuración, mutable) Y
-- reward_grant_component (snapshot ya entregado/en curso) -- no solo en
-- la segunda. COSMETIC queda sin esta validación hasta que cosmetic_item
-- exista (Incremento 5), tal como estaba previsto.
-- `reference_id IS NOT NULL` en la condición: si es NULL, el CHECK de
-- coherencia ya existente (component_snapshot_check, 1.a) es quien debe
-- rechazarlo con su propio código (23514) -- este trigger no debe
-- adelantarse ni enmascarar ese error con uno genérico de `RAISE
-- EXCEPTION` (NULL nunca es IN EXISTS, así que sin esta guarda el trigger
-- dispararía igual para el caso que el CHECK ya cubre).
CREATE OR REPLACE FUNCTION enforce_reward_bundle_item_title_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."component_type" = 'TITLE' AND NEW."reference_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "title_definition" WHERE "id" = NEW."reference_id") THEN
    RAISE EXCEPTION 'reward_bundle_item.reference_id (%) no existe en title_definition (component_type = TITLE)', NEW."reference_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reward_bundle_item_title_reference
BEFORE INSERT OR UPDATE ON "reward_bundle_item"
FOR EACH ROW EXECUTE FUNCTION enforce_reward_bundle_item_title_reference();

CREATE OR REPLACE FUNCTION enforce_reward_grant_component_title_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."component_type" = 'TITLE' AND NEW."reference_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "title_definition" WHERE "id" = NEW."reference_id") THEN
    RAISE EXCEPTION 'reward_grant_component.reference_id (%) no existe en title_definition (component_type = TITLE)', NEW."reference_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reward_grant_component_title_reference
BEFORE INSERT OR UPDATE ON "reward_grant_component"
FOR EACH ROW EXECUTE FUNCTION enforce_reward_grant_component_title_reference();

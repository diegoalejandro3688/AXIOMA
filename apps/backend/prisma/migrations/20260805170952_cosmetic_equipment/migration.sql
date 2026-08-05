-- CreateTable
CREATE TABLE "equipped_cosmetic" (
    "public_profile_id" UUID NOT NULL,
    "cosmetic_slot" "cosmetic_slot" NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "equipped_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipped_cosmetic_pkey" PRIMARY KEY ("public_profile_id","cosmetic_slot")
);

-- AddForeignKey
ALTER TABLE "equipped_cosmetic" ADD CONSTRAINT "equipped_cosmetic_public_profile_id_fkey" FOREIGN KEY ("public_profile_id") REFERENCES "public_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipped_cosmetic" ADD CONSTRAINT "equipped_cosmetic_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Gates 22/34/62/63 (BLOCK-III-DEFINITION.md §4.20) respaldados en base de
-- datos, no solo en la aplicación -- mismo criterio "dos capas" que
-- enforce_equipped_title_account_consistency (3.b). Por subconsulta
-- (requiere leer OTRAS dos tablas, no expresable como CHECK simple),
-- verifica en cada INSERT/UPDATE:
--   (a) el inventory_item referenciado pertenece a la MISMA cuenta que el
--       public_profile referenciado (Gate 61, "misma cuenta");
--   (b) ese inventory_item está ACTIVE (Gate 62, "propiedad activa" --
--       nunca reactivada, §4.19);
--   (c) el cosmetic_item.item_type del inventory_item coincide EXACTAMENTE
--       con el cosmetic_slot destino (Gate 34/63 -- la coincidencia
--       estricta que motivó todo el modelo normalizado, §4.10/§4.15);
--   (d) el public_profile referenciado tiene lifecycle_status = ACTIVE
--       (mismo criterio que equipped_title -- un perfil RETIRED no admite
--       una nueva selección).
-- Deliberadamente SIN exigir visibility_status = VISIBLE -- mismo criterio
-- que equipped_title (ADR-0018 ya oculta todo sin VISIBLE).
CREATE OR REPLACE FUNCTION enforce_equipped_cosmetic_account_consistency()
RETURNS TRIGGER AS $$
DECLARE
  item_account_id UUID;
  item_ownership_status "inventory_item_ownership_status";
  item_cosmetic_item_id UUID;
  cosmetic_item_type "cosmetic_slot";
  profile_account_id UUID;
  profile_lifecycle_status "public_profile_lifecycle_status";
BEGIN
  SELECT "account_id", "ownership_status", "cosmetic_item_id"
    INTO item_account_id, item_ownership_status, item_cosmetic_item_id
    FROM "inventory_item" WHERE "id" = NEW."inventory_item_id";

  SELECT "item_type" INTO cosmetic_item_type
    FROM "cosmetic_item" WHERE "id" = item_cosmetic_item_id;

  SELECT "account_id", "lifecycle_status" INTO profile_account_id, profile_lifecycle_status
    FROM "public_profile" WHERE "id" = NEW."public_profile_id";

  IF item_account_id IS DISTINCT FROM profile_account_id THEN
    RAISE EXCEPTION 'equipped_cosmetic: inventory_item % no pertenece a la cuenta del public_profile % (Gate 61)', NEW."inventory_item_id", NEW."public_profile_id";
  END IF;
  IF item_ownership_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'equipped_cosmetic: inventory_item % no está ACTIVE (ownership_status=%) (Gate 62)', NEW."inventory_item_id", item_ownership_status;
  END IF;
  IF cosmetic_item_type IS DISTINCT FROM NEW."cosmetic_slot" THEN
    RAISE EXCEPTION 'equipped_cosmetic: cosmetic_item de inventory_item % es de tipo % pero el slot destino es % (Gate 34/63)', NEW."inventory_item_id", cosmetic_item_type, NEW."cosmetic_slot";
  END IF;
  IF profile_lifecycle_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'equipped_cosmetic: public_profile % no está ACTIVE (lifecycle_status=%)', NEW."public_profile_id", profile_lifecycle_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_equipped_cosmetic_account_consistency
BEFORE INSERT OR UPDATE ON "equipped_cosmetic"
FOR EACH ROW EXECUTE FUNCTION enforce_equipped_cosmetic_account_consistency();

-- Desequipamiento atómico al revocar/sustituir (§4.3) -- mismo criterio
-- que enforce_account_title_deequips_on_ownership_change (3.b). Nada en
-- 5.a/5.b produce estas transiciones todavía (reservadas para una
-- herramienta de moderación futura) -- queda lista estructuralmente.
CREATE OR REPLACE FUNCTION enforce_inventory_item_deequips_on_ownership_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."ownership_status" <> OLD."ownership_status" AND NEW."ownership_status" <> 'ACTIVE' THEN
    DELETE FROM "equipped_cosmetic" WHERE "inventory_item_id" = NEW."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_item_deequips_on_ownership_change
AFTER UPDATE ON "inventory_item"
FOR EACH ROW EXECUTE FUNCTION enforce_inventory_item_deequips_on_ownership_change();

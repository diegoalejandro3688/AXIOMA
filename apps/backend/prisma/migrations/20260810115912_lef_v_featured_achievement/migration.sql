-- CreateTable
CREATE TABLE "public_profile_featured_achievement" (
    "public_profile_id" UUID NOT NULL,
    "achievement_unlock_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_profile_featured_achievement_pkey" PRIMARY KEY ("public_profile_id","achievement_unlock_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_profile_featured_achievement_achievement_unlock_id_key" ON "public_profile_featured_achievement"("achievement_unlock_id");

-- CreateIndex
CREATE UNIQUE INDEX "public_profile_featured_achievement_public_profile_id_displ_key" ON "public_profile_featured_achievement"("public_profile_id", "display_order");

-- AddForeignKey
ALTER TABLE "public_profile_featured_achievement" ADD CONSTRAINT "public_profile_featured_achievement_public_profile_id_fkey" FOREIGN KEY ("public_profile_id") REFERENCES "public_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_profile_featured_achievement" ADD CONSTRAINT "public_profile_featured_achievement_achievement_unlock_id_fkey" FOREIGN KEY ("achievement_unlock_id") REFERENCES "achievement_unlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- LEF Bloque V, Incremento 2 (docs/adr/LEF-BLOCK-V-DEFINITION.md §10) --
-- respaldo de base de datos para el máximo de 3 insignias destacadas por
-- perfil. La defensa PRIMARIA es el advisory lock por publicProfileId en
-- FeaturedAchievementService.setFeatured (namespace 24) + reemplazo
-- atómico completo (DELETE+INSERT en una sola transacción) -- este
-- trigger es la segunda capa, mismo criterio que enforce_league_group_capacity
-- (Bloque IV, Incremento 1): rechaza CUALQUIER INSERT por encima del
-- cupo, incluida una inserción directa que no pase por el servicio.
CREATE OR REPLACE FUNCTION enforce_featured_achievement_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count FROM "public_profile_featured_achievement" WHERE "public_profile_id" = NEW."public_profile_id";

  IF current_count >= 3 THEN
    RAISE EXCEPTION 'public_profile_featured_achievement: el perfil % ya tiene el máximo de 3 insignias destacadas', NEW."public_profile_id";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_featured_achievement_capacity
BEFORE INSERT ON "public_profile_featured_achievement"
FOR EACH ROW EXECUTE FUNCTION enforce_featured_achievement_capacity();

-- Consistencia (misma cuenta, logro ACTIVE, logro con
-- achievement_definition.visibility_class = PUBLIC, perfil ACTIVE)
-- respaldada en base de datos -- mismo criterio "dos capas" que
-- enforce_equipped_cosmetic_account_consistency (Bloque III, 5.b) y
-- enforce_equipped_title_account_consistency (Bloque III, 3.b). Por
-- subconsulta (requiere leer OTRAS tres tablas, no expresable como CHECK
-- simple), verifica en cada INSERT/UPDATE:
--   (a) el achievement_unlock referenciado pertenece a la MISMA cuenta que
--       el public_profile referenciado;
--   (b) ese achievement_unlock está ACTIVE (nunca REVERSED);
--   (c) el achievement_definition de ese unlock es PUBLIC (nunca se puede
--       destacar públicamente un logro PRIVATE, aunque esté ACTIVE);
--   (d) el public_profile referenciado tiene lifecycle_status = ACTIVE
--       (mismo criterio que equipped_title/equipped_cosmetic -- un perfil
--       RETIRED/ANONYMIZED no admite una nueva selección).
-- Deliberadamente SIN exigir visibility_status = VISIBLE -- mismo criterio
-- que equipped_title/equipped_cosmetic (ADR-0018 ya oculta todo sin
-- VISIBLE en la capa de presentación).
CREATE OR REPLACE FUNCTION enforce_featured_achievement_consistency()
RETURNS TRIGGER AS $$
DECLARE
  unlock_account_id UUID;
  unlock_status "achievement_unlock_status";
  unlock_definition_id UUID;
  definition_visibility "achievement_visibility_class";
  profile_account_id UUID;
  profile_lifecycle_status "public_profile_lifecycle_status";
BEGIN
  SELECT "account_id", "status", "achievement_definition_id"
    INTO unlock_account_id, unlock_status, unlock_definition_id
    FROM "achievement_unlock" WHERE "id" = NEW."achievement_unlock_id";

  SELECT "visibility_class" INTO definition_visibility
    FROM "achievement_definition" WHERE "id" = unlock_definition_id;

  SELECT "account_id", "lifecycle_status" INTO profile_account_id, profile_lifecycle_status
    FROM "public_profile" WHERE "id" = NEW."public_profile_id";

  IF unlock_account_id IS DISTINCT FROM profile_account_id THEN
    RAISE EXCEPTION 'public_profile_featured_achievement: achievement_unlock % no pertenece a la cuenta del public_profile % (Gate LEF-V-2)', NEW."achievement_unlock_id", NEW."public_profile_id";
  END IF;
  IF unlock_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'public_profile_featured_achievement: achievement_unlock % no está ACTIVE (status=%) (Gate LEF-V-2)', NEW."achievement_unlock_id", unlock_status;
  END IF;
  IF definition_visibility <> 'PUBLIC' THEN
    RAISE EXCEPTION 'public_profile_featured_achievement: el logro de achievement_unlock % no es PUBLIC (visibility_class=%) (Gate LEF-V-2)', NEW."achievement_unlock_id", definition_visibility;
  END IF;
  IF profile_lifecycle_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'public_profile_featured_achievement: public_profile % no está ACTIVE (lifecycle_status=%) (Gate LEF-V-2)', NEW."public_profile_id", profile_lifecycle_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_featured_achievement_consistency
BEFORE INSERT OR UPDATE ON "public_profile_featured_achievement"
FOR EACH ROW EXECUTE FUNCTION enforce_featured_achievement_consistency();

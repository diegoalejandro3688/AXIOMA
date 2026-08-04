-- CreateTable
CREATE TABLE "equipped_title" (
    "public_profile_id" UUID NOT NULL,
    "account_title_id" UUID NOT NULL,
    "equipped_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipped_title_pkey" PRIMARY KEY ("public_profile_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipped_title_account_title_id_key" ON "equipped_title"("account_title_id");

-- AddForeignKey
ALTER TABLE "equipped_title" ADD CONSTRAINT "equipped_title_public_profile_id_fkey" FOREIGN KEY ("public_profile_id") REFERENCES "public_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipped_title" ADD CONSTRAINT "equipped_title_account_title_id_fkey" FOREIGN KEY ("account_title_id") REFERENCES "account_title"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Gates 13/14 (BLOCK-III-DEFINITION.md, Incremento 3) respaldados en base
-- de datos, no solo en la aplicación -- mismo criterio "dos capas" que el
-- resto del proyecto. Por subconsulta (requiere leer OTRAS tres tablas,
-- no expresable como CHECK simple), verifica en cada INSERT/UPDATE:
--   (a) el account_title referenciado pertenece a la MISMA cuenta que el
--       public_profile referenciado (Gate 14, "misma cuenta");
--   (b) ese account_title está ACTIVE (Gate 14, "propiedad activa");
--   (c) su title_definition está ACTIVE y visibility_status = PUBLIC
--       (Gate 14, "definición activa y públicamente elegible");
--   (d) el public_profile referenciado tiene lifecycle_status = ACTIVE
--       (precisión obligatoria del Product Owner -- un perfil RETIRED no
--       admite una nueva selección).
-- Deliberadamente SIN exigir visibility_status = VISIBLE (precisión
-- obligatoria del Product Owner): un perfil PRIVATE puede equipar y
-- conservar el título -- lo que cambia es si se EXPONE, no si se puede
-- tener equipado, y eso ya lo resuelve el mecanismo existente de
-- ADR-0018 (ninguna superficie pública futura muestra nada sin
-- visibility_status = VISIBLE).
CREATE OR REPLACE FUNCTION enforce_equipped_title_account_consistency()
RETURNS TRIGGER AS $$
DECLARE
  title_account_id UUID;
  title_ownership_status "account_title_ownership_status";
  title_definition_id_ref UUID;
  title_def_status "title_definition_status";
  title_def_visibility "title_visibility_status";
  profile_account_id UUID;
  profile_lifecycle_status "public_profile_lifecycle_status";
BEGIN
  SELECT "account_id", "ownership_status", "title_definition_id"
    INTO title_account_id, title_ownership_status, title_definition_id_ref
    FROM "account_title" WHERE "id" = NEW."account_title_id";

  SELECT "status", "visibility_status" INTO title_def_status, title_def_visibility
    FROM "title_definition" WHERE "id" = title_definition_id_ref;

  SELECT "account_id", "lifecycle_status" INTO profile_account_id, profile_lifecycle_status
    FROM "public_profile" WHERE "id" = NEW."public_profile_id";

  IF title_account_id IS DISTINCT FROM profile_account_id THEN
    RAISE EXCEPTION 'equipped_title: account_title % no pertenece a la cuenta del public_profile % (Gate 14)', NEW."account_title_id", NEW."public_profile_id";
  END IF;
  IF title_ownership_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'equipped_title: account_title % no está ACTIVE (ownership_status=%) (Gate 14)', NEW."account_title_id", title_ownership_status;
  END IF;
  IF title_def_status <> 'ACTIVE' OR title_def_visibility <> 'PUBLIC' THEN
    RAISE EXCEPTION 'equipped_title: title_definition de account_title % no está ACTIVE/PUBLIC (status=%, visibility_status=%) (Gate 14)', NEW."account_title_id", title_def_status, title_def_visibility;
  END IF;
  IF profile_lifecycle_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'equipped_title: public_profile % no está ACTIVE (lifecycle_status=%)', NEW."public_profile_id", profile_lifecycle_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_equipped_title_account_consistency
BEFORE INSERT OR UPDATE ON "equipped_title"
FOR EACH ROW EXECUTE FUNCTION enforce_equipped_title_account_consistency();

-- Desequipamiento atómico al revocar/sustituir (§4.3, BLOCK-III-DEFINITION.md
-- -- "revocar un ítem equipado debe des-equiparlo atómicamente, en la
-- misma operación"). Precisión obligatoria del Product Owner: cubre
-- CUALQUIER transición fuera de ACTIVE (REVOKED **y** SUPERSEDED), no
-- solo la primera. Nada en 3.a/3.b produce estas transiciones todavía
-- (reservadas para una herramienta de moderación futura) -- esta garantía
-- queda lista estructuralmente para cuando esa herramienta exista, en vez
-- de depender de que ese código futuro recuerde des-equipar.
CREATE OR REPLACE FUNCTION enforce_account_title_deequips_on_ownership_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."ownership_status" <> OLD."ownership_status" AND NEW."ownership_status" <> 'ACTIVE' THEN
    DELETE FROM "equipped_title" WHERE "account_title_id" = NEW."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_account_title_deequips_on_ownership_change
AFTER UPDATE ON "account_title"
FOR EACH ROW EXECUTE FUNCTION enforce_account_title_deequips_on_ownership_change();

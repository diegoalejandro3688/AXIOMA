-- CreateEnum
CREATE TYPE "achievement_progress_status" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "achievement_unlock_status" AS ENUM ('ACTIVE', 'REVERSED');

-- CreateTable
CREATE TABLE "achievement_progress" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "achievement_definition_id" UUID NOT NULL,
    "achievement_version_id" UUID NOT NULL,
    "current_value" INTEGER NOT NULL,
    "target_value" INTEGER NOT NULL,
    "progress_status" "achievement_progress_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "last_activity_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievement_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_unlock" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "achievement_definition_id" UUID NOT NULL,
    "achievement_version_id" UUID NOT NULL,
    "unlock_instance" INTEGER NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL,
    "trigger_activity_id" UUID,
    "reward_grant_id" UUID,
    "status" "achievement_unlock_status" NOT NULL DEFAULT 'ACTIVE',
    "reversed_at" TIMESTAMP(3),

    CONSTRAINT "achievement_unlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "achievement_progress_achievement_version_id_idx" ON "achievement_progress"("achievement_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_progress_account_id_achievement_definition_id_key" ON "achievement_progress"("account_id", "achievement_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_unlock_reward_grant_id_key" ON "achievement_unlock"("reward_grant_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_unlock_account_id_achievement_definition_id_unl_key" ON "achievement_unlock"("account_id", "achievement_definition_id", "unlock_instance");

-- AddForeignKey
ALTER TABLE "achievement_progress" ADD CONSTRAINT "achievement_progress_achievement_definition_id_fkey" FOREIGN KEY ("achievement_definition_id") REFERENCES "achievement_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_progress" ADD CONSTRAINT "achievement_progress_achievement_version_id_fkey" FOREIGN KEY ("achievement_version_id") REFERENCES "achievement_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_progress" ADD CONSTRAINT "achievement_progress_last_activity_id_fkey" FOREIGN KEY ("last_activity_id") REFERENCES "xp_ledger_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_unlock" ADD CONSTRAINT "achievement_unlock_achievement_definition_id_fkey" FOREIGN KEY ("achievement_definition_id") REFERENCES "achievement_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_unlock" ADD CONSTRAINT "achievement_unlock_achievement_version_id_fkey" FOREIGN KEY ("achievement_version_id") REFERENCES "achievement_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_unlock" ADD CONSTRAINT "achievement_unlock_trigger_activity_id_fkey" FOREIGN KEY ("trigger_activity_id") REFERENCES "xp_ledger_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_unlock" ADD CONSTRAINT "achievement_unlock_reward_grant_id_fkey" FOREIGN KEY ("reward_grant_id") REFERENCES "reward_grant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Garantía compuesta (excepción controlada A1, BLOCK-III-DEFINITION.md §4.7):
-- achievement_definition_id es una columna denormalizada SOLO para
-- integridad/unicidad -- este trigger verifica, por subconsulta, que la
-- achievement_version referenciada pertenezca realmente al
-- achievement_definition_id de la misma fila. No es expresable como CHECK
-- simple (requiere leer OTRA tabla) -- mismo criterio que
-- enforce_xp_ledger_entry_reversal_integrity (Bloque I).
CREATE OR REPLACE FUNCTION enforce_achievement_progress_definition_version_consistency()
RETURNS TRIGGER AS $$
DECLARE
  actual_definition_id UUID;
BEGIN
  SELECT "achievement_definition_id" INTO actual_definition_id
  FROM "achievement_version" WHERE "id" = NEW."achievement_version_id";

  IF actual_definition_id IS DISTINCT FROM NEW."achievement_definition_id" THEN
    RAISE EXCEPTION 'achievement_progress.achievement_definition_id (%) no coincide con achievement_version.achievement_definition_id (%) de la versión referenciada (achievement_version_id=%)',
      NEW."achievement_definition_id", actual_definition_id, NEW."achievement_version_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_achievement_progress_definition_version_consistency
BEFORE INSERT OR UPDATE ON "achievement_progress"
FOR EACH ROW EXECUTE FUNCTION enforce_achievement_progress_definition_version_consistency();

-- Inmutabilidad de achievement_progress (ADR-0019 §4, precisión obligatoria
-- del Product Owner): achievement_version_id NUNCA cambia desde la
-- creación (ninguna versión nueva reinterpreta progreso ya en curso), y
-- progress_status = COMPLETED es TERMINAL -- ningún código vuelve a
-- escribir una fila ya completada (mismo criterio no punitivo que
-- reward_grant_component.deliveryStatus = DELIVERED).
CREATE OR REPLACE FUNCTION enforce_achievement_progress_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."progress_status" = 'COMPLETED' THEN
    RAISE EXCEPTION 'achievement_progress ya COMPLETED es inmutable (id=%)', OLD."id";
  END IF;
  IF NEW."achievement_version_id" IS DISTINCT FROM OLD."achievement_version_id" THEN
    RAISE EXCEPTION 'achievement_progress.achievement_version_id es inmutable desde la creación (id=%)', OLD."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_achievement_progress_immutable
BEFORE UPDATE ON "achievement_progress"
FOR EACH ROW EXECUTE FUNCTION enforce_achievement_progress_immutable();

CREATE OR REPLACE FUNCTION enforce_achievement_progress_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'achievement_progress no admite DELETE (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_achievement_progress_no_delete
BEFORE DELETE ON "achievement_progress"
FOR EACH ROW EXECUTE FUNCTION enforce_achievement_progress_no_delete();

-- Misma garantía compuesta que achievement_progress, aplicada a achievement_unlock.
CREATE OR REPLACE FUNCTION enforce_achievement_unlock_definition_version_consistency()
RETURNS TRIGGER AS $$
DECLARE
  actual_definition_id UUID;
BEGIN
  SELECT "achievement_definition_id" INTO actual_definition_id
  FROM "achievement_version" WHERE "id" = NEW."achievement_version_id";

  IF actual_definition_id IS DISTINCT FROM NEW."achievement_definition_id" THEN
    RAISE EXCEPTION 'achievement_unlock.achievement_definition_id (%) no coincide con achievement_version.achievement_definition_id (%) de la versión referenciada (achievement_version_id=%)',
      NEW."achievement_definition_id", actual_definition_id, NEW."achievement_version_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_achievement_unlock_definition_version_consistency
BEFORE INSERT OR UPDATE ON "achievement_unlock"
FOR EACH ROW EXECUTE FUNCTION enforce_achievement_unlock_definition_version_consistency();

-- Inmutabilidad de achievement_unlock (precisión obligatoria del Product
-- Owner, sub-incremento 2.b): la ÚNICA transición permitida es
-- reward_grant_id NULL -> valor (necesita el id propio de esta fila para
-- la clave de idempotencia del reward_grant, §4.4 -- se crea DESPUÉS del
-- unlock). Cualquier otro cambio, o un segundo intento de fijar
-- reward_grant_id, se rechaza -- mismo criterio que
-- reward_grant_component.deliveryStatus = DELIVERED.
CREATE OR REPLACE FUNCTION enforce_achievement_unlock_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."reward_grant_id" IS NOT NULL THEN
    RAISE EXCEPTION 'achievement_unlock ya tiene reward_grant_id fijado -- inmutable (id=%)', OLD."id";
  END IF;
  IF NEW."account_id" IS DISTINCT FROM OLD."account_id"
     OR NEW."achievement_definition_id" IS DISTINCT FROM OLD."achievement_definition_id"
     OR NEW."achievement_version_id" IS DISTINCT FROM OLD."achievement_version_id"
     OR NEW."unlock_instance" IS DISTINCT FROM OLD."unlock_instance"
     OR NEW."unlocked_at" IS DISTINCT FROM OLD."unlocked_at"
     OR NEW."trigger_activity_id" IS DISTINCT FROM OLD."trigger_activity_id"
     OR NEW."status" IS DISTINCT FROM OLD."status"
     OR NEW."reversed_at" IS DISTINCT FROM OLD."reversed_at" THEN
    RAISE EXCEPTION 'achievement_unlock solo admite fijar reward_grant_id (NULL -> valor) -- ningún otro campo es editable (id=%)', OLD."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_achievement_unlock_immutable
BEFORE UPDATE ON "achievement_unlock"
FOR EACH ROW EXECUTE FUNCTION enforce_achievement_unlock_immutable();

CREATE OR REPLACE FUNCTION enforce_achievement_unlock_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'achievement_unlock no admite DELETE (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_achievement_unlock_no_delete
BEFORE DELETE ON "achievement_unlock"
FOR EACH ROW EXECUTE FUNCTION enforce_achievement_unlock_no_delete();

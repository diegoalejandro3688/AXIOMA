-- AlterTable
ALTER TABLE "achievement_progress" ADD COLUMN     "gamification_actor_ref" TEXT,
ALTER COLUMN "account_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "achievement_unlock" ADD COLUMN     "gamification_actor_ref" TEXT,
ALTER COLUMN "account_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "league_point_ledger_entry" ADD COLUMN     "gamification_actor_ref" TEXT,
ALTER COLUMN "account_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "reward_grant" ADD COLUMN     "gamification_actor_ref" TEXT,
ALTER COLUMN "account_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "season_league_participation" ADD COLUMN     "gamification_actor_ref" TEXT,
ALTER COLUMN "account_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "validated_gamification_activity" ADD COLUMN     "gamification_actor_ref" TEXT,
ALTER COLUMN "account_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "xp_ledger_entry" ADD COLUMN     "gamification_actor_ref" TEXT,
ALTER COLUMN "account_id" DROP NOT NULL;

-- Las 5 sentencias RenameForeignKey/RenameIndex generadas por
-- `prisma migrate dev` en esta corrida NO pertenecen a WEB-0D.1C-B1 --
-- son drift preexistente de nombres admin_action/admin_cms018_exception_activation
-- entre `axioma_gates_dev` (aplicó una convención de nombres histórica) y
-- lo que el motor de diff de Prisma generaría hoy desde schema.prisma.
-- Ningún campo de este bloque las requiere; se retiraron deliberadamente
-- para que esta migración contenga SOLO el soporte de pseudónimo de
-- gamificación (regla explícita de la tarea: "should contain only what is
-- necessary"). No se investigó ni se corrigió ese drift no relacionado.

-- ============================================================================
-- WEB-0D.1C-B1 §6/§7/§8 -- transición de privacidad de una sola vía.
--
-- Cada función de inmutabilidad reemplazada abajo agrega EXACTAMENTE una
-- excepción nueva a su regla existente: OLD.account_id IS NOT NULL ->
-- NEW.account_id IS NULL, simultáneo con OLD.gamification_actor_ref IS NULL
-- -> NEW.gamification_actor_ref IS NOT NULL, y CADA OTRO campo protegido
-- IS NOT DISTINCT FROM su valor anterior (ningún monto/tipo/timestamp/
-- referencia cambia). No existe una bandera de sesión genérica
-- ("app.privacy_pseudonymize") que desactive la inmutabilidad -- la
-- excepción vive codificada en la condición exacta de cada trigger, así
-- que toda ruta de mutación ordinaria (incluida un intento de restaurar
-- account_id, volver a cambiar/limpiar gamification_actor_ref, o alterar
-- cualquier campo de negocio en la misma operación) sigue cayendo en la
-- rama RAISE EXCEPTION original, sin excepción.
-- ============================================================================

-- xp_ledger_entry: antes bloqueaba TODO UPDATE incondicionalmente.
CREATE OR REPLACE FUNCTION enforce_xp_ledger_entry_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."account_id" IS NOT NULL AND NEW."account_id" IS NULL
     AND OLD."gamification_actor_ref" IS NULL AND NEW."gamification_actor_ref" IS NOT NULL
     AND NEW."validated_activity_id" IS NOT DISTINCT FROM OLD."validated_activity_id"
     AND NEW."xp_rule_id" IS NOT DISTINCT FROM OLD."xp_rule_id"
     AND NEW."entry_type" IS NOT DISTINCT FROM OLD."entry_type"
     AND NEW."xp_amount" IS NOT DISTINCT FROM OLD."xp_amount"
     AND NEW."base_xp_amount" IS NOT DISTINCT FROM OLD."base_xp_amount"
     AND NEW."multiplier_reference" IS NOT DISTINCT FROM OLD."multiplier_reference"
     AND NEW."rule_version" IS NOT DISTINCT FROM OLD."rule_version"
     AND NEW."reason_code" IS NOT DISTINCT FROM OLD."reason_code"
     AND NEW."idempotency_key" IS NOT DISTINCT FROM OLD."idempotency_key"
     AND NEW."occurred_at" IS NOT DISTINCT FROM OLD."occurred_at"
     AND NEW."recorded_at" IS NOT DISTINCT FROM OLD."recorded_at"
     AND NEW."reverses_entry_id" IS NOT DISTINCT FROM OLD."reverses_entry_id"
     AND NEW."created_by_actor_type" IS NOT DISTINCT FROM OLD."created_by_actor_type"
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'xp_ledger_entry es inmutable tras crearse, salvo la transición de privacidad de una sola vía account_id->NULL + gamification_actor_ref (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- league_point_ledger_entry: antes bloqueaba TODO UPDATE incondicionalmente.
CREATE OR REPLACE FUNCTION enforce_league_point_ledger_entry_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."account_id" IS NOT NULL AND NEW."account_id" IS NULL
     AND OLD."gamification_actor_ref" IS NULL AND NEW."gamification_actor_ref" IS NOT NULL
     AND NEW."season_league_participation_id" IS NOT DISTINCT FROM OLD."season_league_participation_id"
     AND NEW."validated_activity_id" IS NOT DISTINCT FROM OLD."validated_activity_id"
     AND NEW."league_point_rule_id" IS NOT DISTINCT FROM OLD."league_point_rule_id"
     AND NEW."entry_type" IS NOT DISTINCT FROM OLD."entry_type"
     AND NEW."point_amount" IS NOT DISTINCT FROM OLD."point_amount"
     AND NEW."rule_version" IS NOT DISTINCT FROM OLD."rule_version"
     AND NEW."idempotency_key" IS NOT DISTINCT FROM OLD."idempotency_key"
     AND NEW."occurred_at" IS NOT DISTINCT FROM OLD."occurred_at"
     AND NEW."recorded_at" IS NOT DISTINCT FROM OLD."recorded_at"
     AND NEW."reverses_entry_id" IS NOT DISTINCT FROM OLD."reverses_entry_id"
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'league_point_ledger_entry es inmutable tras crearse, salvo la transición de privacidad de una sola vía account_id->NULL + gamification_actor_ref (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- achievement_progress: agrega la excepción de identidad ANTES de las dos
-- reglas existentes (COMPLETED terminal / achievement_version_id fijo),
-- que siguen aplicando sin cambios a cualquier otra mutación. Se agrega
-- ADEMÁS una tercera regla NUEVA -- unidireccionalidad explícita post-
-- transición: el diseño ORIGINAL de este trigger nunca bloqueaba mutación
-- alguna mientras progress_status seguía IN_PROGRESS (el progreso muta
-- legítimamente antes de completarse), así que una fila YA desidentificada
-- pero todavía IN_PROGRESS quedaría, sin esta regla, libre para restaurar
-- account_id o volver a cambiar gamification_actor_ref -- violando §6. Una
-- vez que gamification_actor_ref queda fijado (OLD IS NOT NULL), CUALQUIER
-- cambio a account_id o a gamification_actor_ref se rechaza, sin importar
-- progress_status.
CREATE OR REPLACE FUNCTION enforce_achievement_progress_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."account_id" IS NOT NULL AND NEW."account_id" IS NULL
     AND OLD."gamification_actor_ref" IS NULL AND NEW."gamification_actor_ref" IS NOT NULL
     AND NEW."achievement_definition_id" IS NOT DISTINCT FROM OLD."achievement_definition_id"
     AND NEW."achievement_version_id" IS NOT DISTINCT FROM OLD."achievement_version_id"
     AND NEW."current_value" IS NOT DISTINCT FROM OLD."current_value"
     AND NEW."target_value" IS NOT DISTINCT FROM OLD."target_value"
     AND NEW."progress_status" IS NOT DISTINCT FROM OLD."progress_status"
     AND NEW."last_activity_id" IS NOT DISTINCT FROM OLD."last_activity_id"
  THEN
    RETURN NEW;
  END IF;

  IF OLD."gamification_actor_ref" IS NOT NULL
     AND (NEW."account_id" IS DISTINCT FROM OLD."account_id" OR NEW."gamification_actor_ref" IS DISTINCT FROM OLD."gamification_actor_ref") THEN
    RAISE EXCEPTION 'achievement_progress ya desidentificado -- account_id/gamification_actor_ref son inmutables tras la transición de privacidad (id=%)', OLD."id";
  END IF;
  IF OLD."progress_status" = 'COMPLETED' THEN
    RAISE EXCEPTION 'achievement_progress ya COMPLETED es inmutable (id=%)', OLD."id";
  END IF;
  IF NEW."achievement_version_id" IS DISTINCT FROM OLD."achievement_version_id" THEN
    RAISE EXCEPTION 'achievement_progress.achievement_version_id es inmutable desde la creación (id=%)', OLD."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- achievement_unlock: agrega la excepción de identidad ANTES de las dos
-- reglas existentes (reward_grant_id ya fijado / solo esa transición
-- NULL->valor es editable), que siguen aplicando sin cambios. La
-- transición de identidad NUNCA modifica reward_grant_id -- se exige
-- IS NOT DISTINCT FROM, así que aplica igual con o sin reward_grant_id ya
-- fijado.
CREATE OR REPLACE FUNCTION enforce_achievement_unlock_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."account_id" IS NOT NULL AND NEW."account_id" IS NULL
     AND OLD."gamification_actor_ref" IS NULL AND NEW."gamification_actor_ref" IS NOT NULL
     AND NEW."achievement_definition_id" IS NOT DISTINCT FROM OLD."achievement_definition_id"
     AND NEW."achievement_version_id" IS NOT DISTINCT FROM OLD."achievement_version_id"
     AND NEW."unlock_instance" IS NOT DISTINCT FROM OLD."unlock_instance"
     AND NEW."unlocked_at" IS NOT DISTINCT FROM OLD."unlocked_at"
     AND NEW."trigger_activity_id" IS NOT DISTINCT FROM OLD."trigger_activity_id"
     AND NEW."reward_grant_id" IS NOT DISTINCT FROM OLD."reward_grant_id"
     AND NEW."status" IS NOT DISTINCT FROM OLD."status"
     AND NEW."reversed_at" IS NOT DISTINCT FROM OLD."reversed_at"
  THEN
    RETURN NEW;
  END IF;

  IF OLD."reward_grant_id" IS NOT NULL THEN
    RAISE EXCEPTION 'achievement_unlock ya tiene reward_grant_id fijado -- inmutable (id=%)', OLD."id";
  END IF;
  -- `gamification_actor_ref` se agrega EXPLÍCITAMENTE a esta lista -- la
  -- columna no existía cuando esta lista se escribió originalmente, así
  -- que sin este agregado un segundo intento de cambiarla (fuera de la
  -- transición exacta de arriba) caería silenciosamente por TODAS las
  -- ramas y se permitiría, violando la unidireccionalidad exigida por §6.
  IF NEW."account_id" IS DISTINCT FROM OLD."account_id"
     OR NEW."gamification_actor_ref" IS DISTINCT FROM OLD."gamification_actor_ref"
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

-- ============================================================================
-- WEB-0D.1C-B1-R1 -- invariante de estado de identidad, a nivel de fila,
-- en los 7 modelos históricos de B1. Exactamente UNA representación de
-- identidad por fila, nunca ambas ni ninguna:
--   (account_id NOT NULL Y gamification_actor_ref NULL)          -- identificable
--   O (account_id NULL     Y gamification_actor_ref NOT NULL)    -- pseudonimizada
--
-- Un CHECK, no un trigger -- se evalúa en CADA INSERT y UPDATE, cerrando
-- exactamente el hueco que B1 dejó abierto: los triggers de inmutabilidad
-- de B1 solo corren BEFORE UPDATE, nunca BEFORE INSERT, así que un INSERT
-- que fijara ambos campos (o ninguno) directamente los habría evadido por
-- completo. B1 no hace backfill -- toda fila existente ya cumple la rama
-- "identificable" (account_id real, actor_ref NULL), así que el CHECK no
-- introduce ningún estado transitorio inválido. La transición de privacidad
-- de una sola vía (§6 de B1) fija AMBAS columnas en la MISMA sentencia
-- UPDATE -- el CHECK evalúa la fila RESULTANTE de esa sentencia, nunca un
-- estado intermedio columna-por-columna, así que es compatible sin cambios.
-- ============================================================================

ALTER TABLE "validated_gamification_activity" ADD CONSTRAINT "validated_gamification_activity_identity_state_check" CHECK (
  ("account_id" IS NOT NULL AND "gamification_actor_ref" IS NULL)
  OR ("account_id" IS NULL AND "gamification_actor_ref" IS NOT NULL)
);

ALTER TABLE "xp_ledger_entry" ADD CONSTRAINT "xp_ledger_entry_identity_state_check" CHECK (
  ("account_id" IS NOT NULL AND "gamification_actor_ref" IS NULL)
  OR ("account_id" IS NULL AND "gamification_actor_ref" IS NOT NULL)
);

ALTER TABLE "reward_grant" ADD CONSTRAINT "reward_grant_identity_state_check" CHECK (
  ("account_id" IS NOT NULL AND "gamification_actor_ref" IS NULL)
  OR ("account_id" IS NULL AND "gamification_actor_ref" IS NOT NULL)
);

ALTER TABLE "achievement_progress" ADD CONSTRAINT "achievement_progress_identity_state_check" CHECK (
  ("account_id" IS NOT NULL AND "gamification_actor_ref" IS NULL)
  OR ("account_id" IS NULL AND "gamification_actor_ref" IS NOT NULL)
);

ALTER TABLE "achievement_unlock" ADD CONSTRAINT "achievement_unlock_identity_state_check" CHECK (
  ("account_id" IS NOT NULL AND "gamification_actor_ref" IS NULL)
  OR ("account_id" IS NULL AND "gamification_actor_ref" IS NOT NULL)
);

ALTER TABLE "season_league_participation" ADD CONSTRAINT "season_league_participation_identity_state_check" CHECK (
  ("account_id" IS NOT NULL AND "gamification_actor_ref" IS NULL)
  OR ("account_id" IS NULL AND "gamification_actor_ref" IS NOT NULL)
);

ALTER TABLE "league_point_ledger_entry" ADD CONSTRAINT "league_point_ledger_entry_identity_state_check" CHECK (
  ("account_id" IS NOT NULL AND "gamification_actor_ref" IS NULL)
  OR ("account_id" IS NULL AND "gamification_actor_ref" IS NOT NULL)
);

-- ============================================================================
-- WEB-0D.1C-B1-R1 -- unicidad lógica espejada para las 3 filas cuya
-- @@unique(...) existente incluye `accountId`. Postgres nunca considera dos
-- NULL iguales en un índice único, así que la unicidad original queda
-- INTACTA para filas identificables (accountId real) pero deja de proteger
-- filas pseudonimizadas entre sí una vez accountId=NULL en todas ellas --
-- se espeja la MISMA invariante de negocio, nunca una nueva, restringida a
-- filas pseudonimizadas (`WHERE gamification_actor_ref IS NOT NULL`) para
-- no interferir con la unicidad activa existente ni con NULL/NULL.
--
-- `ValidatedGamificationActivity`/`XpLedgerEntry`/`RewardGrant`/
-- `LeaguePointLedgerEntry` NO tienen ninguna unicidad compuesta por
-- accountId (solo `idempotencyKey`/`deduplicationKey`/`reversesEntryId`
-- standalone, ninguno afectado por accountId=NULL) -- confirmado por
-- auditoría, ningún índice espejo necesario en esos 4 modelos.
-- ============================================================================

CREATE UNIQUE INDEX "achievement_progress_actor_ref_definition_key"
  ON "achievement_progress" ("gamification_actor_ref", "achievement_definition_id")
  WHERE "gamification_actor_ref" IS NOT NULL;

CREATE UNIQUE INDEX "achievement_unlock_actor_ref_definition_instance_key"
  ON "achievement_unlock" ("gamification_actor_ref", "achievement_definition_id", "unlock_instance")
  WHERE "gamification_actor_ref" IS NOT NULL;

CREATE UNIQUE INDEX "season_league_participation_actor_ref_season_key"
  ON "season_league_participation" ("gamification_actor_ref", "game_season_id")
  WHERE "gamification_actor_ref" IS NOT NULL;

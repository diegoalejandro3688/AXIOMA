-- CreateEnum
CREATE TYPE "game_season_status" AS ENUM ('SCHEDULED', 'ACTIVE', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "league_definition_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "league_group_status" AS ENUM ('OPEN', 'FULL', 'LOCKED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "season_league_participation_status" AS ENUM ('ACTIVE', 'SEASON_ENDED');

-- CreateEnum
CREATE TYPE "league_point_rule_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "league_point_ledger_entry_type" AS ENUM ('OTORGAMIENTO', 'REVERSO', 'AJUSTE');

-- CreateTable
CREATE TABLE "game_season" (
    "id" UUID NOT NULL,
    "season_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "ranking_rule_version" TEXT,
    "reward_policy_version" TEXT,
    "status" "game_season_status" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMP(3),

    CONSTRAINT "game_season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_definition" (
    "id" UUID NOT NULL,
    "league_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier_order" INTEGER NOT NULL,
    "minimum_entry_rule" TEXT,
    "promotion_rule" TEXT,
    "demotion_rule" TEXT,
    "participant_group_size" INTEGER NOT NULL,
    "reward_bundle_id" UUID,
    "status" "league_definition_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "league_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_group" (
    "id" UUID NOT NULL,
    "game_season_id" UUID NOT NULL,
    "league_definition_id" UUID NOT NULL,
    "group_number" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "assignment_policy_version" TEXT NOT NULL,
    "status" "league_group_status" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "finalized_at" TIMESTAMP(3),

    CONSTRAINT "league_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_league_participation" (
    "id" UUID NOT NULL,
    "game_season_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "league_definition_id" UUID NOT NULL,
    "league_group_id" UUID NOT NULL,
    "league_points" INTEGER NOT NULL DEFAULT 0,
    "current_rank" INTEGER,
    "participation_status" "season_league_participation_status" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL,
    "final_rank" INTEGER,
    "finalized_at" TIMESTAMP(3),

    CONSTRAINT "season_league_participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_point_rule" (
    "id" UUID NOT NULL,
    "activity_type" TEXT NOT NULL,
    "base_points" INTEGER NOT NULL,
    "daily_cap" INTEGER,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "rule_version" TEXT NOT NULL,
    "status" "league_point_rule_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_point_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_point_ledger_entry" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "season_league_participation_id" UUID NOT NULL,
    "validated_activity_id" UUID,
    "league_point_rule_id" UUID,
    "entry_type" "league_point_ledger_entry_type" NOT NULL,
    "point_amount" INTEGER NOT NULL,
    "rule_version" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reverses_entry_id" UUID,

    CONSTRAINT "league_point_ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_season_season_key_key" ON "game_season"("season_key");

-- CreateIndex
CREATE UNIQUE INDEX "league_definition_league_key_key" ON "league_definition"("league_key");

-- CreateIndex
CREATE INDEX "league_definition_reward_bundle_id_idx" ON "league_definition"("reward_bundle_id");

-- CreateIndex
CREATE UNIQUE INDEX "league_group_game_season_id_league_definition_id_group_numb_key" ON "league_group"("game_season_id", "league_definition_id", "group_number");

-- CreateIndex
CREATE INDEX "season_league_participation_league_group_id_idx" ON "season_league_participation"("league_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "season_league_participation_account_id_game_season_id_key" ON "season_league_participation"("account_id", "game_season_id");

-- CreateIndex
CREATE UNIQUE INDEX "league_point_ledger_entry_idempotency_key_key" ON "league_point_ledger_entry"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "league_point_ledger_entry_reverses_entry_id_key" ON "league_point_ledger_entry"("reverses_entry_id");

-- CreateIndex
CREATE INDEX "league_point_ledger_entry_account_id_idx" ON "league_point_ledger_entry"("account_id");

-- CreateIndex
CREATE INDEX "league_point_ledger_entry_season_league_participation_id_idx" ON "league_point_ledger_entry"("season_league_participation_id");

-- AddForeignKey
ALTER TABLE "league_definition" ADD CONSTRAINT "league_definition_reward_bundle_id_fkey" FOREIGN KEY ("reward_bundle_id") REFERENCES "reward_bundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_group" ADD CONSTRAINT "league_group_game_season_id_fkey" FOREIGN KEY ("game_season_id") REFERENCES "game_season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_group" ADD CONSTRAINT "league_group_league_definition_id_fkey" FOREIGN KEY ("league_definition_id") REFERENCES "league_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_league_participation" ADD CONSTRAINT "season_league_participation_game_season_id_fkey" FOREIGN KEY ("game_season_id") REFERENCES "game_season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_league_participation" ADD CONSTRAINT "season_league_participation_league_definition_id_fkey" FOREIGN KEY ("league_definition_id") REFERENCES "league_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_league_participation" ADD CONSTRAINT "season_league_participation_league_group_id_fkey" FOREIGN KEY ("league_group_id") REFERENCES "league_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_point_ledger_entry" ADD CONSTRAINT "league_point_ledger_entry_season_league_participation_id_fkey" FOREIGN KEY ("season_league_participation_id") REFERENCES "season_league_participation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_point_ledger_entry" ADD CONSTRAINT "league_point_ledger_entry_validated_activity_id_fkey" FOREIGN KEY ("validated_activity_id") REFERENCES "validated_gamification_activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_point_ledger_entry" ADD CONSTRAINT "league_point_ledger_entry_league_point_rule_id_fkey" FOREIGN KEY ("league_point_rule_id") REFERENCES "league_point_rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_point_ledger_entry" ADD CONSTRAINT "league_point_ledger_entry_reverses_entry_id_fkey" FOREIGN KEY ("reverses_entry_id") REFERENCES "league_point_ledger_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- Bloque IV, Incremento 1 -- invariantes reforzadas en base de datos.
-- Ver docs/adr/LEF-BLOCK-IV-DEFINITION.md §9 (diseño detallado).
-- =============================================================================

-- Invariante "a lo sumo una temporada ACTIVE a la vez" (§9.6) -- índice único
-- parcial, no expresable en schema.prisma.
CREATE UNIQUE INDEX "game_season_single_active" ON "game_season" ("status") WHERE "status" = 'ACTIVE';

-- Transición forward-only de game_season -- mismo patrón que
-- enforce_account_challenge_status_transition (Bloque III).
CREATE OR REPLACE FUNCTION enforce_game_season_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = NEW."status" THEN
    RETURN NEW;
  END IF;

  IF (OLD."status" = 'SCHEDULED' AND NEW."status" = 'ACTIVE')
     OR (OLD."status" = 'ACTIVE' AND NEW."status" = 'FINALIZED')
     OR (OLD."status" = 'FINALIZED' AND NEW."status" = 'ARCHIVED') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'game_season no admite la transición % -> % (id=%) -- solo SCHEDULED->ACTIVE->FINALIZED->ARCHIVED, sin saltos ni retrocesos',
    OLD."status", NEW."status", OLD."id";
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_game_season_status_transition
BEFORE UPDATE ON "game_season"
FOR EACH ROW EXECUTE FUNCTION enforce_game_season_status_transition();

-- Transición forward-only de league_group -- OPEN->LOCKED directo permitido
-- (una temporada puede cerrar antes de que un grupo llegue a FULL, §9.3).
CREATE OR REPLACE FUNCTION enforce_league_group_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = NEW."status" THEN
    RETURN NEW;
  END IF;

  IF (OLD."status" = 'OPEN' AND NEW."status" IN ('FULL', 'LOCKED'))
     OR (OLD."status" = 'FULL' AND NEW."status" = 'LOCKED')
     OR (OLD."status" = 'LOCKED' AND NEW."status" = 'FINALIZED') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'league_group no admite la transición % -> % (id=%) -- solo OPEN->FULL->LOCKED->FINALIZED (OPEN->LOCKED directo permitido), sin retrocesos',
    OLD."status", NEW."status", OLD."id";
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_league_group_status_transition
BEFORE UPDATE ON "league_group"
FOR EACH ROW EXECUTE FUNCTION enforce_league_group_status_transition();

-- Transición forward-only de season_league_participation -- este incremento
-- solo conoce ACTIVE->SEASON_ENDED; PROMOTED/DEMOTED/RETAINED los añade
-- Incremento 2 (ranking) junto con su propia migración.
CREATE OR REPLACE FUNCTION enforce_season_league_participation_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."participation_status" = NEW."participation_status" THEN
    RETURN NEW;
  END IF;

  IF OLD."participation_status" = 'ACTIVE' AND NEW."participation_status" = 'SEASON_ENDED' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'season_league_participation no admite la transición % -> % (id=%) -- solo ACTIVE->SEASON_ENDED en este incremento',
    OLD."participation_status", NEW."participation_status", OLD."id";
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_season_league_participation_status_transition
BEFORE UPDATE ON "season_league_participation"
FOR EACH ROW EXECUTE FUNCTION enforce_season_league_participation_status_transition();

-- Capacidad de league_group reforzada en base de datos (§9.3, precisión
-- obligatoria del Product Owner) -- defensa adicional al advisory lock
-- (namespace 21) que la aplicación mantiene durante toda la inscripción;
-- si algún camino de código futuro omitiera el lock, esta fila sigue
-- siendo imposible de crear por encima del cupo.
CREATE OR REPLACE FUNCTION enforce_league_group_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  group_capacity INTEGER;
BEGIN
  SELECT "capacity" INTO group_capacity FROM "league_group" WHERE "id" = NEW."league_group_id";
  SELECT COUNT(*) INTO current_count FROM "season_league_participation" WHERE "league_group_id" = NEW."league_group_id";

  IF current_count >= group_capacity THEN
    RAISE EXCEPTION 'league_group % ya alcanzó su capacidad (%)', NEW."league_group_id", group_capacity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_league_group_capacity
BEFORE INSERT ON "season_league_participation"
FOR EACH ROW EXECUTE FUNCTION enforce_league_group_capacity();

-- league_point_ledger_entry es INMUTABLE tras crearse -- mismo patrón que
-- enforce_xp_ledger_entry_immutable (Bloque I).
CREATE OR REPLACE FUNCTION enforce_league_point_ledger_entry_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'league_point_ledger_entry es inmutable tras crearse (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_league_point_ledger_entry_immutable
BEFORE UPDATE ON "league_point_ledger_entry"
FOR EACH ROW EXECUTE FUNCTION enforce_league_point_ledger_entry_immutable();

-- Sin DELETE -- mismo criterio que enforce_xp_ledger_entry_no_delete: toda
-- corrección es una entrada compensatoria, nunca un borrado.
CREATE OR REPLACE FUNCTION enforce_league_point_ledger_entry_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'league_point_ledger_entry no admite DELETE -- toda corrección es una entrada compensatoria (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_league_point_ledger_entry_no_delete
BEFORE DELETE ON "league_point_ledger_entry"
FOR EACH ROW EXECUTE FUNCTION enforce_league_point_ledger_entry_no_delete();

-- Integridad de reversos -- mismo patrón que
-- enforce_xp_ledger_entry_reversal_integrity (Bloque I).
CREATE OR REPLACE FUNCTION enforce_league_point_ledger_entry_reversal_integrity()
RETURNS TRIGGER AS $$
DECLARE
  original RECORD;
BEGIN
  IF NEW."entry_type" = 'REVERSO' THEN
    SELECT "entry_type", "account_id", "point_amount" INTO original
    FROM "league_point_ledger_entry" WHERE "id" = NEW."reverses_entry_id";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'reverses_entry_id % no existe', NEW."reverses_entry_id";
    END IF;
    IF original."entry_type" <> 'OTORGAMIENTO' THEN
      RAISE EXCEPTION 'Solo se puede reversar una entrada OTORGAMIENTO (id=%)', NEW."reverses_entry_id";
    END IF;
    IF original."account_id" <> NEW."account_id" THEN
      RAISE EXCEPTION 'El reverso debe pertenecer a la misma cuenta que la entrada original (id=%)', NEW."reverses_entry_id";
    END IF;
    IF original."point_amount" <> -NEW."point_amount" THEN
      RAISE EXCEPTION 'point_amount del reverso debe ser exactamente el negativo del original (id=%)', NEW."reverses_entry_id";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_league_point_ledger_entry_reversal_integrity
BEFORE INSERT ON "league_point_ledger_entry"
FOR EACH ROW EXECUTE FUNCTION enforce_league_point_ledger_entry_reversal_integrity();

-- Todo OTORGAMIENTO debe traer la regla Y la actividad que lo produjeron --
-- mismo criterio que xp_ledger_entry_otorgamiento_requires_rule.
ALTER TABLE "league_point_ledger_entry" ADD CONSTRAINT "league_point_ledger_entry_otorgamiento_requires_rule" CHECK (
  "entry_type" <> 'OTORGAMIENTO' OR ("league_point_rule_id" IS NOT NULL AND "validated_activity_id" IS NOT NULL)
);

-- Ventana de elegibilidad SIN retroactividad (§9.4, precisión obligatoria del
-- Product Owner) y exclusión transaccional otorgamiento-vs-cierre (§9.5,
-- precisión obligatoria del Product Owner) -- respaldo real en base de
-- datos, no solo en la relectura SERIALIZABLE de la aplicación: si algún
-- camino de código futuro olvidara esa relectura, esta fila sigue siendo
-- imposible de insertar fuera de ventana o tras el cierre.
CREATE OR REPLACE FUNCTION enforce_league_point_ledger_entry_window()
RETURNS TRIGGER AS $$
DECLARE
  participation RECORD;
  season RECORD;
  grp RECORD;
BEGIN
  IF NEW."entry_type" = 'OTORGAMIENTO' THEN
    SELECT "participation_status", "joined_at", "game_season_id", "league_group_id"
      INTO participation
      FROM "season_league_participation"
      WHERE "id" = NEW."season_league_participation_id";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'season_league_participation % no existe', NEW."season_league_participation_id";
    END IF;
    IF participation."participation_status" <> 'ACTIVE' THEN
      RAISE EXCEPTION 'No se puede otorgar League Points: la participación % ya no está ACTIVE', NEW."season_league_participation_id";
    END IF;

    SELECT "status", "starts_at", "ends_at" INTO season
      FROM "game_season" WHERE "id" = participation."game_season_id";
    IF season."status" <> 'ACTIVE' THEN
      RAISE EXCEPTION 'No se puede otorgar League Points: la temporada % ya no está ACTIVE', participation."game_season_id";
    END IF;

    SELECT "status" INTO grp FROM "league_group" WHERE "id" = participation."league_group_id";
    IF grp."status" NOT IN ('OPEN', 'FULL') THEN
      RAISE EXCEPTION 'No se puede otorgar League Points: el grupo % ya no acepta acumulación', participation."league_group_id";
    END IF;

    IF NEW."occurred_at" < participation."joined_at" THEN
      RAISE EXCEPTION 'occurred_at (%) es anterior al inicio de la participación (%) -- sin League Points retroactivos', NEW."occurred_at", participation."joined_at";
    END IF;
    IF NEW."occurred_at" < season."starts_at" OR NEW."occurred_at" >= season."ends_at" THEN
      RAISE EXCEPTION 'occurred_at (%) está fuera de la ventana de la temporada [%, %)', NEW."occurred_at", season."starts_at", season."ends_at";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_league_point_ledger_entry_window
BEFORE INSERT ON "league_point_ledger_entry"
FOR EACH ROW EXECUTE FUNCTION enforce_league_point_ledger_entry_window();

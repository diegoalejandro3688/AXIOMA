-- CreateEnum
CREATE TYPE "leaderboard_definition_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "leaderboard_snapshot_type" AS ENUM ('FINAL', 'PERIODIC');

-- CreateEnum
CREATE TYPE "promotion_outcome" AS ENUM ('PROMOTED', 'DEMOTED', 'RETAINED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "season_league_participation_status" ADD VALUE 'PROMOTED';
ALTER TYPE "season_league_participation_status" ADD VALUE 'DEMOTED';
ALTER TYPE "season_league_participation_status" ADD VALUE 'RETAINED';

-- CreateTable
CREATE TABLE "leaderboard_definition" (
    "id" UUID NOT NULL,
    "leaderboard_key" TEXT NOT NULL,
    "leaderboard_type" TEXT NOT NULL,
    "ranking_metric" TEXT NOT NULL,
    "scope_rule" TEXT NOT NULL,
    "visibility_rule" TEXT,
    "tie_break_rule" TEXT NOT NULL,
    "update_frequency" TEXT NOT NULL,
    "status" "leaderboard_definition_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_entry" (
    "id" UUID NOT NULL,
    "leaderboard_definition_id" UUID NOT NULL,
    "game_season_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "season_league_participation_id" UUID NOT NULL,
    "public_profile_id" UUID,
    "rank_position" INTEGER NOT NULL,
    "metric_value" INTEGER NOT NULL,
    "tie_break_value" TIMESTAMP(3) NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL,
    "snapshot_version" INTEGER NOT NULL,

    CONSTRAINT "leaderboard_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_snapshot" (
    "id" UUID NOT NULL,
    "league_group_id" UUID NOT NULL,
    "game_season_id" UUID NOT NULL,
    "league_definition_id" UUID NOT NULL,
    "leaderboard_definition_id" UUID NOT NULL,
    "snapshot_type" "leaderboard_snapshot_type" NOT NULL DEFAULT 'FINAL',
    "snapshot_at" TIMESTAMP(3) NOT NULL,
    "tie_break_rule_version" TEXT NOT NULL,
    "promotion_rule_version" TEXT NOT NULL,
    "demotion_rule_version" TEXT NOT NULL,
    "ranking_metric_version" TEXT NOT NULL,
    "participant_count" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "supersedes_snapshot_id" UUID,
    "correction_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_snapshot_entry" (
    "id" UUID NOT NULL,
    "leaderboard_snapshot_id" UUID NOT NULL,
    "season_league_participation_id" UUID NOT NULL,
    "rank_position" INTEGER NOT NULL,
    "metric_value" INTEGER NOT NULL,
    "tie_break_value" TIMESTAMP(3) NOT NULL,
    "promotion_outcome" "promotion_outcome" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_snapshot_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_definition_leaderboard_key_key" ON "leaderboard_definition"("leaderboard_key");

-- CreateIndex
CREATE INDEX "leaderboard_entry_group_id_idx" ON "leaderboard_entry"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_entry_leaderboard_definition_id_group_id_season_key" ON "leaderboard_entry"("leaderboard_definition_id", "group_id", "season_league_participation_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_entry_leaderboard_definition_id_group_id_rank_p_key" ON "leaderboard_entry"("leaderboard_definition_id", "group_id", "rank_position");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_snapshot_supersedes_snapshot_id_key" ON "leaderboard_snapshot"("supersedes_snapshot_id");

-- CreateIndex
CREATE INDEX "leaderboard_snapshot_entry_season_league_participation_id_idx" ON "leaderboard_snapshot_entry"("season_league_participation_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_snapshot_entry_leaderboard_snapshot_id_season_l_key" ON "leaderboard_snapshot_entry"("leaderboard_snapshot_id", "season_league_participation_id");

-- AddForeignKey
ALTER TABLE "leaderboard_entry" ADD CONSTRAINT "leaderboard_entry_leaderboard_definition_id_fkey" FOREIGN KEY ("leaderboard_definition_id") REFERENCES "leaderboard_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entry" ADD CONSTRAINT "leaderboard_entry_game_season_id_fkey" FOREIGN KEY ("game_season_id") REFERENCES "game_season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entry" ADD CONSTRAINT "leaderboard_entry_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "league_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entry" ADD CONSTRAINT "leaderboard_entry_season_league_participation_id_fkey" FOREIGN KEY ("season_league_participation_id") REFERENCES "season_league_participation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshot" ADD CONSTRAINT "leaderboard_snapshot_league_group_id_fkey" FOREIGN KEY ("league_group_id") REFERENCES "league_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshot" ADD CONSTRAINT "leaderboard_snapshot_game_season_id_fkey" FOREIGN KEY ("game_season_id") REFERENCES "game_season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshot" ADD CONSTRAINT "leaderboard_snapshot_league_definition_id_fkey" FOREIGN KEY ("league_definition_id") REFERENCES "league_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshot" ADD CONSTRAINT "leaderboard_snapshot_leaderboard_definition_id_fkey" FOREIGN KEY ("leaderboard_definition_id") REFERENCES "leaderboard_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshot" ADD CONSTRAINT "leaderboard_snapshot_supersedes_snapshot_id_fkey" FOREIGN KEY ("supersedes_snapshot_id") REFERENCES "leaderboard_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshot_entry" ADD CONSTRAINT "leaderboard_snapshot_entry_leaderboard_snapshot_id_fkey" FOREIGN KEY ("leaderboard_snapshot_id") REFERENCES "leaderboard_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshot_entry" ADD CONSTRAINT "leaderboard_snapshot_entry_season_league_participation_id_fkey" FOREIGN KEY ("season_league_participation_id") REFERENCES "season_league_participation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- Bloque IV, Incremento 2 -- invariantes reforzadas en base de datos.
-- Ver docs/adr/0020-ranking-materializacion.md.
-- =============================================================================

-- Extiende la transición forward-only de season_league_participation
-- (Incremento 1) para permitir SEASON_ENDED -> {PROMOTED,DEMOTED,RETAINED}
-- -- únicamente LeaderboardFinalizationService produce esta transición,
-- nunca SeasonTransitionService (que se detiene en SEASON_ENDED).
CREATE OR REPLACE FUNCTION enforce_season_league_participation_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."participation_status" = NEW."participation_status" THEN
    RETURN NEW;
  END IF;

  IF OLD."participation_status" = 'ACTIVE' AND NEW."participation_status" = 'SEASON_ENDED' THEN
    RETURN NEW;
  END IF;

  IF OLD."participation_status" = 'SEASON_ENDED' AND NEW."participation_status" IN ('PROMOTED', 'DEMOTED', 'RETAINED') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'season_league_participation no admite la transición % -> % (id=%) -- solo ACTIVE->SEASON_ENDED->{PROMOTED,DEMOTED,RETAINED}',
    OLD."participation_status", NEW."participation_status", OLD."id";
END;
$$ LANGUAGE plpgsql;

-- Todo OTORGAMIENTO de LP ya exige rule_version consistente -- aquí,
-- una corrección de snapshot debe traer su motivo (ADR-0020 §5).
ALTER TABLE "leaderboard_snapshot" ADD CONSTRAINT "leaderboard_snapshot_correction_requires_reason" CHECK (
  "supersedes_snapshot_id" IS NULL OR "correction_reason" IS NOT NULL
);

-- leaderboard_snapshot es INMUTABLE por diseño (ADR-0020 §5: "sin ninguna
-- columna mutable" -- una corrección es SIEMPRE una fila nueva con
-- supersedes_snapshot_id, nunca un UPDATE). Trigger de bloqueo total como
-- defensa en profundidad, mismo criterio que xp_ledger_entry.
CREATE OR REPLACE FUNCTION enforce_leaderboard_snapshot_no_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'leaderboard_snapshot es inmutable -- toda corrección es una fila nueva con supersedes_snapshot_id (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leaderboard_snapshot_no_update
BEFORE UPDATE ON "leaderboard_snapshot"
FOR EACH ROW EXECUTE FUNCTION enforce_leaderboard_snapshot_no_update();

CREATE OR REPLACE FUNCTION enforce_leaderboard_snapshot_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'leaderboard_snapshot no admite DELETE (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leaderboard_snapshot_no_delete
BEFORE DELETE ON "leaderboard_snapshot"
FOR EACH ROW EXECUTE FUNCTION enforce_leaderboard_snapshot_no_delete();

-- leaderboard_snapshot_entry -- misma inmutabilidad total que su padre.
CREATE OR REPLACE FUNCTION enforce_leaderboard_snapshot_entry_no_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'leaderboard_snapshot_entry es inmutable (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leaderboard_snapshot_entry_no_update
BEFORE UPDATE ON "leaderboard_snapshot_entry"
FOR EACH ROW EXECUTE FUNCTION enforce_leaderboard_snapshot_entry_no_update();

CREATE OR REPLACE FUNCTION enforce_leaderboard_snapshot_entry_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'leaderboard_snapshot_entry no admite DELETE (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leaderboard_snapshot_entry_no_delete
BEFORE DELETE ON "leaderboard_snapshot_entry"
FOR EACH ROW EXECUTE FUNCTION enforce_leaderboard_snapshot_entry_no_delete();

-- CreateEnum
CREATE TYPE "challenge_type" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "challenge_definition_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "account_challenge_status" AS ENUM ('ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CLAIMED');

-- CreateTable
CREATE TABLE "challenge_definition" (
    "id" UUID NOT NULL,
    "challenge_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "challenge_type" "challenge_type" NOT NULL,
    "eligibility_rule" TEXT NOT NULL,
    "completion_rule" TEXT NOT NULL,
    "reward_bundle_id" UUID,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "daily_cap" INTEGER,
    "status" "challenge_definition_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "challenge_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_challenge" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "challenge_definition_id" UUID NOT NULL,
    "progress_value" INTEGER NOT NULL DEFAULT 0,
    "target_value" INTEGER NOT NULL,
    "challenge_status" "account_challenge_status" NOT NULL DEFAULT 'ACCEPTED',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_challenge_daily_progress" (
    "id" UUID NOT NULL,
    "account_challenge_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "contribution_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_challenge_daily_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenge_definition_challenge_key_key" ON "challenge_definition"("challenge_key");

-- CreateIndex
CREATE INDEX "challenge_definition_reward_bundle_id_idx" ON "challenge_definition"("reward_bundle_id");

-- CreateIndex
CREATE INDEX "account_challenge_challenge_definition_id_idx" ON "account_challenge"("challenge_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_challenge_account_id_challenge_definition_id_period_key" ON "account_challenge"("account_id", "challenge_definition_id", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "account_challenge_daily_progress_account_challenge_id_local_key" ON "account_challenge_daily_progress"("account_challenge_id", "local_date");

-- AddForeignKey
ALTER TABLE "challenge_definition" ADD CONSTRAINT "challenge_definition_reward_bundle_id_fkey" FOREIGN KEY ("reward_bundle_id") REFERENCES "reward_bundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_challenge" ADD CONSTRAINT "account_challenge_challenge_definition_id_fkey" FOREIGN KEY ("challenge_definition_id") REFERENCES "challenge_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_challenge_daily_progress" ADD CONSTRAINT "account_challenge_daily_progress_account_challenge_id_fkey" FOREIGN KEY ("account_challenge_id") REFERENCES "account_challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restricciones de coherencia básica (§4.12/§16.18) -- ninguna requiere leer
-- otra tabla, expresables como CHECK simple.
ALTER TABLE "challenge_definition" ADD CONSTRAINT "challenge_definition_daily_cap_positive_check" CHECK ("daily_cap" IS NULL OR "daily_cap" > 0);
ALTER TABLE "challenge_definition" ADD CONSTRAINT "challenge_definition_window_check" CHECK ("ends_at" > "starts_at");
ALTER TABLE "account_challenge" ADD CONSTRAINT "account_challenge_progress_bounds_check" CHECK ("progress_value" >= 0 AND "progress_value" <= "target_value");
ALTER TABLE "account_challenge" ADD CONSTRAINT "account_challenge_target_positive_check" CHECK ("target_value" > 0);
ALTER TABLE "account_challenge" ADD CONSTRAINT "account_challenge_period_check" CHECK ("period_end" > "period_start");
ALTER TABLE "account_challenge_daily_progress" ADD CONSTRAINT "account_challenge_daily_progress_count_non_negative_check" CHECK ("contribution_count" >= 0);

-- Ciclo de vida sin saltos (Gate 17, §5 Incremento 4): únicamente
-- ACCEPTED -> IN_PROGRESS -> COMPLETED -> CLAIMED, en ese orden -- ninguna
-- transición hacia atrás ni que se salte un paso. `completed_at`/
-- `claimed_at` son inmutables una vez fijados (mismo criterio no punitivo
-- que `reward_grant_component.delivered_at`) -- respaldo real en base de
-- datos, no solo en la aplicación, mismo criterio que
-- `enforce_achievement_progress_immutable` (2.b).
CREATE OR REPLACE FUNCTION enforce_account_challenge_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."challenge_status" = NEW."challenge_status" THEN
    -- Sin cambio de estado: otros campos (p. ej. progress_value) pueden
    -- seguir actualizándose libremente en este sub-incremento.
    RETURN NEW;
  END IF;

  IF (OLD."challenge_status" = 'ACCEPTED' AND NEW."challenge_status" = 'IN_PROGRESS')
     OR (OLD."challenge_status" = 'IN_PROGRESS' AND NEW."challenge_status" = 'COMPLETED')
     OR (OLD."challenge_status" = 'COMPLETED' AND NEW."challenge_status" = 'CLAIMED') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'account_challenge no admite la transición % -> % (id=%) -- solo ACCEPTED->IN_PROGRESS->COMPLETED->CLAIMED, sin saltos ni retrocesos',
    OLD."challenge_status", NEW."challenge_status", OLD."id";
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_account_challenge_status_transition
BEFORE UPDATE ON "account_challenge"
FOR EACH ROW EXECUTE FUNCTION enforce_account_challenge_status_transition();

CREATE OR REPLACE FUNCTION enforce_account_challenge_terminal_timestamps_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."completed_at" IS NOT NULL AND NEW."completed_at" IS DISTINCT FROM OLD."completed_at" THEN
    RAISE EXCEPTION 'account_challenge.completed_at es inmutable una vez fijado (id=%)', OLD."id";
  END IF;
  IF OLD."claimed_at" IS NOT NULL AND NEW."claimed_at" IS DISTINCT FROM OLD."claimed_at" THEN
    RAISE EXCEPTION 'account_challenge.claimed_at es inmutable una vez fijado (id=%)', OLD."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_account_challenge_terminal_timestamps_immutable
BEFORE UPDATE ON "account_challenge"
FOR EACH ROW EXECUTE FUNCTION enforce_account_challenge_terminal_timestamps_immutable();

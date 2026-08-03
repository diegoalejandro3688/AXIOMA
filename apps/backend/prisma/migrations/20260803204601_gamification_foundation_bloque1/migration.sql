-- CreateEnum
CREATE TYPE "gamification_program_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "gamification_program_version_approval_status" AS ENUM ('DRAFT', 'APPROVED', 'RETIRED');

-- CreateEnum
CREATE TYPE "xp_rule_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "xp_ledger_entry_type" AS ENUM ('OTORGAMIENTO', 'BONO', 'REVERSO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "xp_ledger_actor_type" AS ENUM ('SYSTEM', 'ADMIN');

-- CreateTable
CREATE TABLE "gamification_program" (
    "id" UUID NOT NULL,
    "program_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "program_type" TEXT NOT NULL,
    "status" "gamification_program_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "gamification_program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_program_version" (
    "id" UUID NOT NULL,
    "gamification_program_id" UUID NOT NULL,
    "version_label" TEXT NOT NULL,
    "rule_set_reference" TEXT,
    "effective_from" TIMESTAMP(3),
    "effective_until" TIMESTAMP(3),
    "change_summary" TEXT,
    "approval_status" "gamification_program_version_approval_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "gamification_program_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_rule" (
    "id" UUID NOT NULL,
    "program_version_id" UUID NOT NULL,
    "activity_type" TEXT NOT NULL,
    "repeat_decay_rule" TEXT,
    "quality_condition" TEXT,
    "base_xp" INTEGER NOT NULL,
    "multiplier_policy" TEXT,
    "daily_cap" INTEGER,
    "effective_from" TIMESTAMP(3),
    "effective_until" TIMESTAMP(3),
    "status" "xp_rule_status" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "xp_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validated_gamification_activity" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "source_domain" TEXT NOT NULL,
    "source_entity_type" TEXT NOT NULL,
    "source_entity_id" UUID NOT NULL,
    "activity_type" TEXT NOT NULL,
    "validation_status" TEXT NOT NULL,
    "validation_rule_version" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "validated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deduplication_key" TEXT NOT NULL,
    "integrity_status" TEXT NOT NULL,

    CONSTRAINT "validated_gamification_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_ledger_entry" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "validated_activity_id" UUID,
    "entry_type" "xp_ledger_entry_type" NOT NULL,
    "xp_amount" INTEGER NOT NULL,
    "base_xp_amount" INTEGER,
    "multiplier_reference" TEXT,
    "rule_version" TEXT,
    "reason_code" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reverses_entry_id" UUID,
    "created_by_actor_type" "xp_ledger_actor_type" NOT NULL DEFAULT 'SYSTEM',

    CONSTRAINT "xp_ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_balance" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "lifetime_xp" INTEGER NOT NULL DEFAULT 0,
    "balance_version" INTEGER NOT NULL DEFAULT 0,
    "last_ledger_entry_id" UUID,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_balance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gamification_program_program_key_key" ON "gamification_program"("program_key");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_program_version_gamification_program_id_versio_key" ON "gamification_program_version"("gamification_program_id", "version_label");

-- CreateIndex
CREATE UNIQUE INDEX "xp_rule_program_version_id_activity_type_key" ON "xp_rule"("program_version_id", "activity_type");

-- CreateIndex
CREATE UNIQUE INDEX "validated_gamification_activity_deduplication_key_key" ON "validated_gamification_activity"("deduplication_key");

-- CreateIndex
CREATE INDEX "validated_gamification_activity_account_id_idx" ON "validated_gamification_activity"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "xp_ledger_entry_idempotency_key_key" ON "xp_ledger_entry"("idempotency_key");

-- CreateIndex
CREATE INDEX "xp_ledger_entry_account_id_idx" ON "xp_ledger_entry"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "xp_balance_account_id_key" ON "xp_balance"("account_id");

-- AddForeignKey
ALTER TABLE "gamification_program_version" ADD CONSTRAINT "gamification_program_version_gamification_program_id_fkey" FOREIGN KEY ("gamification_program_id") REFERENCES "gamification_program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_rule" ADD CONSTRAINT "xp_rule_program_version_id_fkey" FOREIGN KEY ("program_version_id") REFERENCES "gamification_program_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger_entry" ADD CONSTRAINT "xp_ledger_entry_validated_activity_id_fkey" FOREIGN KEY ("validated_activity_id") REFERENCES "validated_gamification_activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger_entry" ADD CONSTRAINT "xp_ledger_entry_reverses_entry_id_fkey" FOREIGN KEY ("reverses_entry_id") REFERENCES "xp_ledger_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_balance" ADD CONSTRAINT "xp_balance_last_ledger_entry_id_fkey" FOREIGN KEY ("last_ledger_entry_id") REFERENCES "xp_ledger_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- "Reversible" (ADR-0016) = entrada compensatoria únicamente: entryType =
-- REVERSO exige reversesEntryId; cualquier otro tipo lo prohíbe. Aplicado a
-- nivel de base de datos, no solo de aplicación.
ALTER TABLE "xp_ledger_entry" ADD CONSTRAINT "xp_ledger_entry_reversal_consistency" CHECK (
  ("entry_type" = 'REVERSO' AND "reverses_entry_id" IS NOT NULL)
  OR ("entry_type" <> 'REVERSO' AND "reverses_entry_id" IS NULL)
);

-- xp_ledger_entry es INMUTABLE tras crearse -- mismo patrón que
-- enforce_student_response_immutable (ADR-0014, progress_foundation).
-- Toda corrección es una entrada compensatoria nueva, nunca un UPDATE.
CREATE OR REPLACE FUNCTION enforce_xp_ledger_entry_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'xp_ledger_entry es inmutable tras crearse (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_xp_ledger_entry_immutable
BEFORE UPDATE ON "xp_ledger_entry"
FOR EACH ROW EXECUTE FUNCTION enforce_xp_ledger_entry_immutable();

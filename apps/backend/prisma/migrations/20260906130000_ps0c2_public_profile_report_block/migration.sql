-- PS-0C.2 (Increment B) -- reporte de identidad pública, bloqueo entre
-- cuentas, y marca operativa de "revisado" sobre los reportes del Tutor IA.
-- Puramente ADITIVA: tablas / enums nuevos, una columna nullable nueva.

-- CreateEnum
CREATE TYPE "public_profile_report_type" AS ENUM ('INAPPROPRIATE_USERNAME', 'IMPERSONATION', 'OTHER_SAFETY');

-- CreateEnum
CREATE TYPE "public_profile_report_status" AS ENUM ('OPEN', 'DISMISSED', 'ACTIONED');

-- CreateTable
CREATE TABLE "public_profile_report" (
    "id" UUID NOT NULL,
    "reporter_account_id" UUID NOT NULL,
    "target_account_id" UUID NOT NULL,
    "target_public_profile_id" UUID NOT NULL,
    "report_type" "public_profile_report_type" NOT NULL,
    "status" "public_profile_report_status" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "resolution_code" TEXT,

    CONSTRAINT "public_profile_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_block" (
    "id" UUID NOT NULL,
    "blocker_account_id" UUID NOT NULL,
    "blocked_account_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "public_profile_report_status_created_at_idx" ON "public_profile_report"("status", "created_at");

-- CreateIndex
CREATE INDEX "public_profile_report_target_account_id_idx" ON "public_profile_report"("target_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "public_profile_report_reporter_account_id_target_account_id_key" ON "public_profile_report"("reporter_account_id", "target_account_id", "report_type");

-- CreateIndex
CREATE INDEX "account_block_blocker_account_id_idx" ON "account_block"("blocker_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_block_blocker_account_id_blocked_account_id_key" ON "account_block"("blocker_account_id", "blocked_account_id");

-- AlterTable
ALTER TABLE "ai_response_report" ADD COLUMN "reviewed_at" TIMESTAMP(3);

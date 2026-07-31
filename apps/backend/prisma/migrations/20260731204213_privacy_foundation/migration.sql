-- CreateEnum
CREATE TYPE "privacy_request_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "privacy_request" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "status" "privacy_request_status" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "privacy_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "privacy_request_account_id_idx" ON "privacy_request"("account_id");

-- CreateIndex
CREATE INDEX "privacy_request_status_scheduled_for_idx" ON "privacy_request"("status", "scheduled_for");

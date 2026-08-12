-- CreateTable
CREATE TABLE "ai_generation_claim" (
    "operation_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservation_expires_at" TIMESTAMP(3) NOT NULL,
    "generation_lease_expires_at" TIMESTAMP(3),

    CONSTRAINT "ai_generation_claim_pkey" PRIMARY KEY ("operation_id")
);

-- CreateIndex
CREATE INDEX "ai_generation_claim_account_id_reservation_expires_at_idx" ON "ai_generation_claim"("account_id", "reservation_expires_at");

-- CreateIndex
CREATE INDEX "ai_generation_claim_conversation_id_reservation_expires_at_idx" ON "ai_generation_claim"("conversation_id", "reservation_expires_at");

-- AddForeignKey
ALTER TABLE "ai_generation_claim" ADD CONSTRAINT "ai_generation_claim_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generation_claim" ADD CONSTRAINT "ai_generation_claim_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

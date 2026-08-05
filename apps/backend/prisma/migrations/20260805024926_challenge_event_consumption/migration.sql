-- CreateTable
CREATE TABLE "account_challenge_consumed_event" (
    "id" UUID NOT NULL,
    "account_challenge_id" UUID NOT NULL,
    "xp_ledger_entry_id" UUID NOT NULL,
    "consumed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_challenge_consumed_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_challenge_consumed_event_account_challenge_id_xp_le_key" ON "account_challenge_consumed_event"("account_challenge_id", "xp_ledger_entry_id");

-- AddForeignKey
ALTER TABLE "account_challenge_consumed_event" ADD CONSTRAINT "account_challenge_consumed_event_account_challenge_id_fkey" FOREIGN KEY ("account_challenge_id") REFERENCES "account_challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_challenge_consumed_event" ADD CONSTRAINT "account_challenge_consumed_event_xp_ledger_entry_id_fkey" FOREIGN KEY ("xp_ledger_entry_id") REFERENCES "xp_ledger_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

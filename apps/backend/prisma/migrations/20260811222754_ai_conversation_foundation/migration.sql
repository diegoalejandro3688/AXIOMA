-- CreateEnum
CREATE TYPE "ai_message_role" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "ai_conversation" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "ai_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_message" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "ai_message_role" NOT NULL,
    "content" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operation_id" UUID,

    CONSTRAINT "ai_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_conversation_account_id_idx" ON "ai_conversation"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_message_operation_id_key" ON "ai_message"("operation_id");

-- CreateIndex
CREATE INDEX "ai_message_conversation_id_idx" ON "ai_message"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_message_conversation_id_sequence_key" ON "ai_message"("conversation_id", "sequence");

-- AddForeignKey
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_message" ADD CONSTRAINT "ai_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ai_message es inmutable tras crearse -- mismo patrón exacto que
-- student_response (enforce_student_response_immutable, migración
-- 20260802205740_progress_foundation) y xp_ledger_entry. Invariante 6 de
-- docs/adr/LEF-BLOCK-VI-DEFINITION.md: "Ningún mensaje se sobrescribe -- una
-- regeneración crea un mensaje nuevo relacionado con el anterior".
CREATE OR REPLACE FUNCTION enforce_ai_message_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ai_message es inmutable tras crearse (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_message_immutable
BEFORE UPDATE ON "ai_message"
FOR EACH ROW EXECUTE FUNCTION enforce_ai_message_immutable();

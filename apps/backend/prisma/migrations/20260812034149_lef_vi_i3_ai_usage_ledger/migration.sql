-- CreateTable
CREATE TABLE "ai_usage_ledger" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "assistant_message_id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "attempts" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_ledger_assistant_message_id_key" ON "ai_usage_ledger"("assistant_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_ledger_operation_id_key" ON "ai_usage_ledger"("operation_id");

-- CreateIndex
CREATE INDEX "ai_usage_ledger_account_id_occurred_at_idx" ON "ai_usage_ledger"("account_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "ai_usage_ledger" ADD CONSTRAINT "ai_usage_ledger_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_ledger" ADD CONSTRAINT "ai_usage_ledger_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_ledger" ADD CONSTRAINT "ai_usage_ledger_assistant_message_id_fkey" FOREIGN KEY ("assistant_message_id") REFERENCES "ai_message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ai_usage_ledger es INMUTABLE tras crearse -- mismo patrón exacto que
-- enforce_xp_ledger_entry_immutable (Bloque I). Toda corrección de coste
-- (si algún día hace falta) sería una fila compensatoria nueva, nunca un
-- UPDATE -- no existe todavía ningún caso de uso para eso en este incremento.
CREATE OR REPLACE FUNCTION enforce_ai_usage_ledger_entry_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ai_usage_ledger es inmutable tras crearse (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_usage_ledger_entry_immutable
BEFORE UPDATE ON "ai_usage_ledger"
FOR EACH ROW EXECUTE FUNCTION enforce_ai_usage_ledger_entry_immutable();

-- Sin DELETE -- mismo criterio que enforce_xp_ledger_entry_no_delete: el
-- ledger de coste/cuota nunca se borra fila por fila (una eventual política
-- de retención, Incremento 7, se resolvería como un barrido explícito y
-- documentado, no como un DELETE ad hoc desde el dominio).
CREATE OR REPLACE FUNCTION enforce_ai_usage_ledger_entry_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ai_usage_ledger no admite DELETE -- ver política de retención (Incremento 7) (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_usage_ledger_entry_no_delete
BEFORE DELETE ON "ai_usage_ledger"
FOR EACH ROW EXECUTE FUNCTION enforce_ai_usage_ledger_entry_no_delete();

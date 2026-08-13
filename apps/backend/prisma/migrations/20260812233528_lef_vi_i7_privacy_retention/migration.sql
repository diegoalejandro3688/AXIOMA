-- AlterTable
ALTER TABLE "ai_usage_ledger" ALTER COLUMN "conversation_id" DROP NOT NULL,
ALTER COLUMN "assistant_message_id" DROP NOT NULL,
ALTER COLUMN "operation_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ai_usage_ledger_occurred_at_idx" ON "ai_usage_ledger"("occurred_at");

-- LEF Bloque VI, Incremento 7 (Privacidad, retención y borrado) -- política final
-- del Product Owner (2026-08-12), ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §27.
--
-- Reemplaza enforce_ai_usage_ledger_entry_immutable (creada en
-- 20260812034149_lef_vi_i3_ai_usage_ledger): sigue rechazando CUALQUIER UPDATE,
-- salvo UNA transición estructuralmente acotada y verificada columna por
-- columna -- conversation_id/assistant_message_id/operation_id pasando de un
-- valor existente a NULL (nunca al revés, nunca a un valor DISTINTO no nulo),
-- con TODAS las demás columnas (incluida account_id) exactamente iguales entre
-- OLD y NEW. No existe flag de sesión ni interruptor global -- la autorización
-- vive enteramente en esta verificación estructural, siempre activa.
CREATE OR REPLACE FUNCTION enforce_ai_usage_ledger_entry_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW."conversation_id" IS NOT NULL AND NEW."conversation_id" IS DISTINCT FROM OLD."conversation_id")
     OR (NEW."assistant_message_id" IS NOT NULL AND NEW."assistant_message_id" IS DISTINCT FROM OLD."assistant_message_id")
     OR (NEW."operation_id" IS NOT NULL AND NEW."operation_id" IS DISTINCT FROM OLD."operation_id")
     OR NEW."account_id" IS DISTINCT FROM OLD."account_id"
     OR NEW."provider" IS DISTINCT FROM OLD."provider"
     OR NEW."model" IS DISTINCT FROM OLD."model"
     OR NEW."prompt_version" IS DISTINCT FROM OLD."prompt_version"
     OR NEW."input_tokens" IS DISTINCT FROM OLD."input_tokens"
     OR NEW."output_tokens" IS DISTINCT FROM OLD."output_tokens"
     OR NEW."attempts" IS DISTINCT FROM OLD."attempts"
     OR NEW."latency_ms" IS DISTINCT FROM OLD."latency_ms"
     OR NEW."occurred_at" IS DISTINCT FROM OLD."occurred_at"
     OR NEW."recorded_at" IS DISTINCT FROM OLD."recorded_at"
  THEN
    RAISE EXCEPTION 'ai_usage_ledger es inmutable tras crearse, salvo la desvinculación autorizada de conversation_id/assistant_message_id/operation_id hacia NULL (id=%)', OLD."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reemplaza enforce_ai_usage_ledger_entry_no_delete: sigue rechazando CUALQUIER
-- DELETE, salvo cuando la propia fila ya cumplió su retención independiente de
-- 90 días desde occurred_at (política final del Product Owner) -- verificado
-- por el trigger mismo contra OLD.occurred_at, nunca confiado a que el código
-- de aplicación calcule el corte correctamente. La purga elimina la FILA
-- COMPLETA (nunca una desvinculación parcial -- eso es exclusivamente lo que
-- hace la función de arriba, para conversaciones que se borran antes).
CREATE OR REPLACE FUNCTION enforce_ai_usage_ledger_entry_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."occurred_at" > (now() - INTERVAL '90 days') THEN
    RAISE EXCEPTION 'ai_usage_ledger no admite DELETE antes de cumplir su propia retención de 90 días desde occurred_at (id=%, occurred_at=%)', OLD."id", OLD."occurred_at";
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

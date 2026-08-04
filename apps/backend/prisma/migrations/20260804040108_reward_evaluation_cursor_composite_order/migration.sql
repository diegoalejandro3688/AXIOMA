-- AlterTable
ALTER TABLE "reward_evaluation_cursor" ADD COLUMN     "last_processed_entry_id" UUID;

-- Coherencia del cursor compuesto (ADR-0019 §1, precisión del sub-incremento
-- 1.b): ambos campos nulos juntos (nunca procesada con éxito) o ambos no
-- nulos juntos (posición compuesta real) -- nunca uno sin el otro.
ALTER TABLE "reward_evaluation_cursor" ADD CONSTRAINT "reward_evaluation_cursor_coherence_check" CHECK (
  (last_processed_recorded_at IS NULL AND last_processed_entry_id IS NULL)
  OR
  (last_processed_recorded_at IS NOT NULL AND last_processed_entry_id IS NOT NULL)
);

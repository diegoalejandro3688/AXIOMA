-- Referencia estable de xp_ledger_entry a la regla que determinó el
-- otorgamiento (obligatoria para OTORGAMIENTO, ver CHECK abajo).
ALTER TABLE "xp_ledger_entry" ADD COLUMN "xp_rule_id" UUID;

ALTER TABLE "xp_ledger_entry" ADD CONSTRAINT "xp_ledger_entry_xp_rule_id_fkey" FOREIGN KEY ("xp_rule_id") REFERENCES "xp_rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Todo OTORGAMIENTO debe traer la regla que lo produjo.
ALTER TABLE "xp_ledger_entry" ADD CONSTRAINT "xp_ledger_entry_otorgamiento_requires_rule" CHECK (
  "entry_type" <> 'OTORGAMIENTO' OR "xp_rule_id" IS NOT NULL
);

-- A lo sumo un reverso por entrada original -- protección de base de datos,
-- además de la idempotencyKey "reverse:${originalEntryId}" del servicio.
CREATE UNIQUE INDEX "xp_ledger_entry_reverses_entry_id_key" ON "xp_ledger_entry"("reverses_entry_id");

-- Integridad de reversos: el original debe ser OTORGAMIENTO, de la MISMA
-- cuenta, y el monto del reverso debe ser exactamente su negativo. No es
-- expresable como CHECK simple (requiere leer OTRA fila) -- trigger BEFORE
-- INSERT, igual patrón que enforce_xp_ledger_entry_immutable.
CREATE OR REPLACE FUNCTION enforce_xp_ledger_entry_reversal_integrity()
RETURNS TRIGGER AS $$
DECLARE
  original RECORD;
BEGIN
  IF NEW."entry_type" = 'REVERSO' THEN
    SELECT "entry_type", "account_id", "xp_amount" INTO original
    FROM "xp_ledger_entry" WHERE "id" = NEW."reverses_entry_id";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'reverses_entry_id % no existe', NEW."reverses_entry_id";
    END IF;
    IF original."entry_type" <> 'OTORGAMIENTO' THEN
      RAISE EXCEPTION 'Solo se puede reversar una entrada OTORGAMIENTO (id=%)', NEW."reverses_entry_id";
    END IF;
    IF original."account_id" <> NEW."account_id" THEN
      RAISE EXCEPTION 'El reverso debe pertenecer a la misma cuenta que la entrada original (id=%)', NEW."reverses_entry_id";
    END IF;
    IF original."xp_amount" <> -NEW."xp_amount" THEN
      RAISE EXCEPTION 'xp_amount del reverso debe ser exactamente el negativo del original (id=%)', NEW."reverses_entry_id";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_xp_ledger_entry_reversal_integrity
BEFORE INSERT ON "xp_ledger_entry"
FOR EACH ROW EXECUTE FUNCTION enforce_xp_ledger_entry_reversal_integrity();

-- Seguimiento de intentos de otorgamiento (NO_ACTIVE_RULE / DAILY_CAP_REACHED)
-- -- nunca modifica validated_gamification_activity. Ver schema.prisma para
-- el razonamiento completo (previene polling perpetuo y starvation).
CREATE TABLE "xp_grant_attempt" (
    "id" UUID NOT NULL,
    "validated_activity_id" UUID NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_outcome" TEXT NOT NULL,
    "last_attempted_at" TIMESTAMP(3) NOT NULL,
    "next_eligible_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_grant_attempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "xp_grant_attempt_validated_activity_id_key" ON "xp_grant_attempt"("validated_activity_id");

CREATE INDEX "xp_grant_attempt_next_eligible_at_idx" ON "xp_grant_attempt"("next_eligible_at");

ALTER TABLE "xp_grant_attempt" ADD CONSTRAINT "xp_grant_attempt_validated_activity_id_fkey" FOREIGN KEY ("validated_activity_id") REFERENCES "validated_gamification_activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

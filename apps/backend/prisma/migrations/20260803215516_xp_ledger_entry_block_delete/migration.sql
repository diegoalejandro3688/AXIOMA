-- Decision Gate 3 del Bloque I (Gamification Foundation): "sin UPDATE/DELETE".
-- El trigger existente (enforce_xp_ledger_entry_immutable) solo bloquea
-- UPDATE -- mismo patron que student_response (ADR-0014), que si tiene un
-- camino legitimo de borrado (cierre de cuenta via PRIVACY). xp_ledger_entry
-- no tiene ningun camino de borrado legitimo todavia (sin integracion con
-- PRIVACY en este incremento) -- se bloquea DELETE tambien, sin excepcion.
CREATE OR REPLACE FUNCTION enforce_xp_ledger_entry_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'xp_ledger_entry no admite DELETE -- toda correccion es una entrada compensatoria (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_xp_ledger_entry_no_delete
BEFORE DELETE ON "xp_ledger_entry"
FOR EACH ROW EXECUTE FUNCTION enforce_xp_ledger_entry_no_delete();

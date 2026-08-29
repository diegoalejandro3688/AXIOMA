-- ENSAYOS-F1 -- MIGRATION INTEGRITY HOTFIX. Forward-only.
--
-- Ajuste posterior al trigger `enforce_exam_attempt_answer_frozen_after_close`
-- introducido en `20260828120000_exams_foundation`. Se extrae a su propia
-- migración forward-only para NO modificar una migración ya aplicada (el
-- checksum registrado de la migración de fundación queda intacto).
--
-- Cambio semántico exacto (y único):
--   - ANTES: el trigger disparaba BEFORE INSERT OR UPDATE OR DELETE. El
--     DELETE de una respuesta sobre un intento COMPLETED/EXPIRED quedaba
--     bloqueado -- lo que impedía el teardown de fixtures del gate y, en
--     general, cualquier política de retención/borrado de intentos
--     históricos (que NO es una mutación de la respuesta registrada).
--   - AHORA: dispara BEFORE INSERT OR UPDATE únicamente. La inmutabilidad
--     real -- "una respuesta entregada no puede cambiarse" -- se mantiene
--     intacta (INSERT/UPDATE siguen bloqueados tras el cierre y pasada la
--     expiración). El DELETE queda permitido; no existe ningún cascade
--     destructivo hacia `exam_attempt_answer` (todas las FK son RESTRICT),
--     así que ninguna operación normal lo dispara por accidente.
--
-- Sin cambios de datos. Sin cambios de esquema (tablas/columnas/constraints/
-- índices). Solo se redefine la función y se reemplaza el trigger.

DROP TRIGGER IF EXISTS trg_exam_attempt_answer_frozen_after_close ON "exam_attempt_answer";

CREATE OR REPLACE FUNCTION enforce_exam_attempt_answer_frozen_after_close()
RETURNS TRIGGER AS $$
DECLARE
  attempt_row "exam_attempt"%ROWTYPE;
BEGIN
  SELECT * INTO attempt_row FROM "exam_attempt" WHERE "id" = NEW."attempt_id";

  IF attempt_row."status" <> 'ACTIVE' THEN
    RAISE EXCEPTION 'exam_attempt_answer: el intento % ya no está ACTIVE (status=%) -- las respuestas son inmutables tras la entrega/expiración',
      NEW."attempt_id", attempt_row."status";
  END IF;

  IF now() >= attempt_row."expires_at" THEN
    RAISE EXCEPTION 'exam_attempt_answer: el intento % ya expiró (expires_at=%)', NEW."attempt_id", attempt_row."expires_at";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exam_attempt_answer_frozen_after_close
BEFORE INSERT OR UPDATE ON "exam_attempt_answer"
FOR EACH ROW EXECUTE FUNCTION enforce_exam_attempt_answer_frozen_after_close();

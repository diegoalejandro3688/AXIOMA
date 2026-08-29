-- ENSAYOS-F2 -- Fundación de TEXTOS/ESTÍMULOS COMPARTIDOS del dominio EXAMS.
-- Ver docs/adr/0024-ensayos-foundation.md.
--
-- Un `ExamPassage` es un texto/estímulo persistido UNA sola vez, propiedad de
-- UN `Exam`, que 0..N `ExamQuestion` del MISMO ensayo pueden referenciar vía
-- `ExamQuestion.passage_id` (nullable). M1/M2 y cualquier ensayo sin pasajes
-- dejan `passage_id = NULL`. Este incremento es ADITIVO: no toca ninguna fila
-- existente, no hace backfill, y M1/M2 quedan exactamente igual.
--
-- Forward-only. Aplica limpio sobre axioma_dev poblada, axioma_gates_dev y
-- una BD nueva desde cero. NO edita ninguna migración ya aplicada.

-- --------------------------------------------------------------------------
-- 1. Tabla exam_passage + columna nullable exam_question.passage_id
-- --------------------------------------------------------------------------
CREATE TABLE "exam_passage" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "passage_key" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_passage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exam_passage_exam_id_idx" ON "exam_passage"("exam_id");
CREATE UNIQUE INDEX "exam_passage_exam_id_passage_key_key" ON "exam_passage"("exam_id", "passage_key");
CREATE UNIQUE INDEX "exam_passage_exam_id_display_order_key" ON "exam_passage"("exam_id", "display_order");

ALTER TABLE "exam_passage"
  ADD CONSTRAINT "exam_passage_exam_id_fkey"
  FOREIGN KEY ("exam_id") REFERENCES "exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "exam_question" ADD COLUMN "passage_id" UUID;

CREATE INDEX "exam_question_passage_id_idx" ON "exam_question"("passage_id");

ALTER TABLE "exam_question"
  ADD CONSTRAINT "exam_question_passage_id_fkey"
  FOREIGN KEY ("passage_id") REFERENCES "exam_passage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- --------------------------------------------------------------------------
-- 2. Consistencia cross-exam: una pregunta del ensayo A no puede referenciar
--    un pasaje del ensayo B. Defensa en profundidad (ExamService también lo
--    valida). Misma filosofía que `enforce_exam_question_version_published`.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_exam_question_passage_consistency()
RETURNS TRIGGER AS $$
DECLARE
  passage_exam_id UUID;
BEGIN
  IF NEW."passage_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "exam_id" INTO passage_exam_id FROM "exam_passage" WHERE "id" = NEW."passage_id";

  IF passage_exam_id IS NULL THEN
    RAISE EXCEPTION 'exam_question: el pasaje % no existe', NEW."passage_id";
  END IF;
  IF passage_exam_id IS DISTINCT FROM NEW."exam_id" THEN
    RAISE EXCEPTION 'exam_question (id=%): el pasaje % pertenece al ensayo %, distinto de %',
      NEW."id", NEW."passage_id", passage_exam_id, NEW."exam_id";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exam_question_passage_consistency
BEFORE INSERT OR UPDATE ON "exam_question"
FOR EACH ROW EXECUTE FUNCTION enforce_exam_question_passage_consistency();

-- --------------------------------------------------------------------------
-- 3. Inmutabilidad tras publicación: un `ExamPassage` no puede crearse,
--    modificarse ni cambiarse una vez que su `Exam` está PUBLISHED o RETIRED.
--    Bloquea INSERT y UPDATE; DELETE queda permitido para el teardown de
--    fixtures de gates (mismo criterio exacto que la corrección de
--    `enforce_exam_attempt_answer_frozen_after_close`, migración
--    20260828130000). El flujo normal crea los pasajes con el ensayo en DRAFT
--    y sólo después publica.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_exam_passage_frozen_after_publish()
RETURNS TRIGGER AS $$
DECLARE
  exam_status "exam_status";
BEGIN
  SELECT "status" INTO exam_status FROM "exam" WHERE "id" = NEW."exam_id";

  IF exam_status IN ('PUBLISHED', 'RETIRED') THEN
    RAISE EXCEPTION 'exam_passage: el ensayo % está % -- sus textos son inmutables tras la publicación (id=%, passage_key=%)',
      NEW."exam_id", exam_status, NEW."id", NEW."passage_key";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exam_passage_frozen_after_publish
BEFORE INSERT OR UPDATE ON "exam_passage"
FOR EACH ROW EXECUTE FUNCTION enforce_exam_passage_frozen_after_publish();

-- --------------------------------------------------------------------------
-- 4. El MAPEO pregunta -> pasaje tampoco es mutable en silencio tras publicar:
--    una vez que el `Exam` está PUBLISHED/RETIRED, un `exam_question` existente
--    no puede cambiar su `passage_id` (ni su `question_version_id` ni su
--    `display_order`). INSERT no se bloquea aquí (el trigger de consistencia y
--    los índices únicos ya lo gobiernan); DELETE queda para teardown.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_exam_question_mapping_frozen_after_publish()
RETURNS TRIGGER AS $$
DECLARE
  exam_status "exam_status";
BEGIN
  IF OLD."passage_id" IS NOT DISTINCT FROM NEW."passage_id"
     AND OLD."question_version_id" = NEW."question_version_id"
     AND OLD."display_order" = NEW."display_order" THEN
    RETURN NEW;
  END IF;

  SELECT "status" INTO exam_status FROM "exam" WHERE "id" = OLD."exam_id";

  IF exam_status IN ('PUBLISHED', 'RETIRED') THEN
    RAISE EXCEPTION 'exam_question (id=%): el ensayo % está % -- no se puede reasignar pregunta/posición/pasaje tras la publicación',
      OLD."id", OLD."exam_id", exam_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exam_question_mapping_frozen_after_publish
BEFORE UPDATE ON "exam_question"
FOR EACH ROW EXECUTE FUNCTION enforce_exam_question_mapping_frozen_after_publish();

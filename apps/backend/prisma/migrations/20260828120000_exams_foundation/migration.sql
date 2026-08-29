-- ENSAYOS-F1 -- Fundación del dominio EXAMS / Ensayos V1.
-- Ver docs/adr/0024-ensayos-foundation.md.
--
-- Ensayos es un dominio SEPARADO de Study (`ENSAYOS != STUDY BANK`): reutiliza
-- `question_version`/`answer_option` de EDUCATION pero NUNCA `student_response`/
-- `curriculum_topic_progress`. Reloj server-authoritative (`expires_at`
-- persistido). Sin pausa. Sin puntaje PAES. Este incremento NO carga ninguna
-- pregunta ENSAYO.M1.* -- solo el esquema, los triggers y las constraints.

-- CreateEnum
CREATE TYPE "exam_status" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "exam_attempt_status" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "exam" (
    "id" UUID NOT NULL,
    "exam_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "status" "exam_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_question" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "question_version_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempt" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "status" "exam_attempt_status" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempt_answer" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "question_version_id" UUID NOT NULL,
    "answer_option_id" UUID NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "operation_id" UUID NOT NULL,

    CONSTRAINT "exam_attempt_answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_exam_key_key" ON "exam"("exam_key");

-- CreateIndex
CREATE INDEX "exam_subject_id_idx" ON "exam"("subject_id");

-- CreateIndex
CREATE INDEX "exam_status_idx" ON "exam"("status");

-- CreateIndex
CREATE INDEX "exam_question_exam_id_idx" ON "exam_question"("exam_id");

-- CreateIndex
CREATE INDEX "exam_question_question_version_id_idx" ON "exam_question"("question_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_question_exam_id_question_version_id_key" ON "exam_question"("exam_id", "question_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_question_exam_id_display_order_key" ON "exam_question"("exam_id", "display_order");

-- CreateIndex
CREATE INDEX "exam_attempt_account_id_idx" ON "exam_attempt"("account_id");

-- CreateIndex
CREATE INDEX "exam_attempt_exam_id_idx" ON "exam_attempt"("exam_id");

-- CreateIndex
CREATE INDEX "exam_attempt_account_id_exam_id_idx" ON "exam_attempt"("account_id", "exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempt_answer_operation_id_key" ON "exam_attempt_answer"("operation_id");

-- CreateIndex
CREATE INDEX "exam_attempt_answer_attempt_id_idx" ON "exam_attempt_answer"("attempt_id");

-- CreateIndex
CREATE INDEX "exam_attempt_answer_account_id_idx" ON "exam_attempt_answer"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempt_answer_attempt_id_question_version_id_key" ON "exam_attempt_answer"("attempt_id", "question_version_id");

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_question" ADD CONSTRAINT "exam_question_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_question" ADD CONSTRAINT "exam_question_question_version_id_fkey" FOREIGN KEY ("question_version_id") REFERENCES "question_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempt" ADD CONSTRAINT "exam_attempt_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempt_answer" ADD CONSTRAINT "exam_attempt_answer_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempt_answer" ADD CONSTRAINT "exam_attempt_answer_question_version_id_fkey" FOREIGN KEY ("question_version_id") REFERENCES "question_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempt_answer" ADD CONSTRAINT "exam_attempt_answer_answer_option_id_fkey" FOREIGN KEY ("answer_option_id") REFERENCES "answer_option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Índice único PARCIAL: como máximo un intento ACTIVE por (cuenta, ensayo).
-- Mismo patrón que quick_question_session_one_active_per_account (Prisma no
-- soporta índices parciales en el DSL). Respaldo de base de datos
-- independiente del inicio idempotente bajo advisory lock que hace
-- ExamService.startAttempt.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "exam_attempt_one_active_per_account_exam"
  ON "exam_attempt" ("account_id", "exam_id")
  WHERE "status" = 'ACTIVE';

-- ---------------------------------------------------------------------------
-- Máquina de estados forward-only del intento (§lifecycle). Únicamente
-- ACTIVE -> COMPLETED y ACTIVE -> EXPIRED; nunca hacia atrás, nunca
-- COMPLETED <-> EXPIRED. Mismo criterio que
-- enforce_quick_question_session_status_transition.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_exam_attempt_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = NEW."status" THEN
    RETURN NEW;
  END IF;

  IF OLD."status" = 'ACTIVE' AND NEW."status" IN ('COMPLETED', 'EXPIRED') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'exam_attempt no admite la transición % -> % (id=%) -- solo ACTIVE->COMPLETED o ACTIVE->EXPIRED, nunca hacia atrás',
    OLD."status", NEW."status", OLD."id";
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exam_attempt_status_transition
BEFORE UPDATE ON "exam_attempt"
FOR EACH ROW EXECUTE FUNCTION enforce_exam_attempt_status_transition();

-- ---------------------------------------------------------------------------
-- Una versión vinculada a un ensayo debe estar PUBLISHED (defensa en
-- profundidad -- ExamService.linkQuestion ya lo valida). "No question de
-- otro contexto inválido" (§referential integrity).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_exam_question_version_published()
RETURNS TRIGGER AS $$
DECLARE
  version_status "editorial_status";
BEGIN
  SELECT "editorial_status" INTO version_status
    FROM "question_version" WHERE "id" = NEW."question_version_id";

  IF version_status IS DISTINCT FROM 'PUBLISHED' THEN
    RAISE EXCEPTION 'exam_question no puede vincular question_version % -- estado editorial % (se exige PUBLISHED)',
      NEW."question_version_id", version_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_exam_question_version_published
BEFORE INSERT OR UPDATE ON "exam_question"
FOR EACH ROW EXECUTE FUNCTION enforce_exam_question_version_published();

-- ---------------------------------------------------------------------------
-- Las respuestas de un intento son INMUTABLES una vez que el intento deja de
-- estar ACTIVE (COMPLETED/EXPIRED): ningún INSERT ni UPDATE (cambio de
-- alternativa) después del cierre. Además, nunca se acepta una respuesta
-- pasada la expiración aunque el status siga ACTIVE porque la transición
-- perezosa no corrió aún. DELETE no se bloquea -- la retención/borrado de un
-- intento histórico es otra preocupación (no hay cascade destructivo hacia
-- estas filas). Respaldo de base de datos -- la capa de servicio ya lo valida
-- antes de llegar aquí. Mismo criterio que
-- enforce_quick_question_attempt_session_active / enforce_student_response_immutable.
-- ---------------------------------------------------------------------------
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

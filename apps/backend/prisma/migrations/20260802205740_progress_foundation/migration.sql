-- CreateEnum
CREATE TYPE "topic_progress_status" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "curriculum_topic_progress" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "curriculum_topic_id" UUID NOT NULL,
    "status" "topic_progress_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "curriculum_topic_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_response" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "question_version_id" UUID NOT NULL,
    "answer_option_id" UUID NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operation_id" UUID NOT NULL,

    CONSTRAINT "student_response_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curriculum_topic_progress_account_id_idx" ON "curriculum_topic_progress"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_topic_progress_account_id_curriculum_topic_id_key" ON "curriculum_topic_progress"("account_id", "curriculum_topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_response_operation_id_key" ON "student_response"("operation_id");

-- CreateIndex
CREATE INDEX "student_response_account_id_idx" ON "student_response"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_response_account_id_question_version_id_key" ON "student_response"("account_id", "question_version_id");

-- AddForeignKey
ALTER TABLE "curriculum_topic_progress" ADD CONSTRAINT "curriculum_topic_progress_curriculum_topic_id_fkey" FOREIGN KEY ("curriculum_topic_id") REFERENCES "curriculum_topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_response" ADD CONSTRAINT "student_response_question_version_id_fkey" FOREIGN KEY ("question_version_id") REFERENCES "question_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_response" ADD CONSTRAINT "student_response_answer_option_id_fkey" FOREIGN KEY ("answer_option_id") REFERENCES "answer_option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Triggers de invariantes -- ver ADR-0014, puntos 4 y 6. Postgres es la
-- autoridad de estas invariantes RELACIONALES (ADR-0001), no solo la capa de
-- aplicación -- mismo criterio que los triggers de ADR-0012.
-- ============================================================================

-- (a) student_response es inmutable tras crearse -- ningún UPDATE permitido.
-- La única forma de "quitar" una respuesta es DELETE (usado exclusivamente
-- por el barrido de cierre de cuenta, PrivacyService -- ver ADR-0014, punto 2).
CREATE OR REPLACE FUNCTION enforce_student_response_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'student_response es inmutable tras crearse (id=%)', OLD."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_response_immutable
BEFORE UPDATE ON "student_response"
FOR EACH ROW EXECUTE FUNCTION enforce_student_response_immutable();

-- (b) curriculum_topic_progress.status es estrictamente monotónico:
-- COMPLETED nunca retrocede a IN_PROGRESS (ver ADR-0014, punto 6).
CREATE OR REPLACE FUNCTION enforce_curriculum_topic_progress_monotonic()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = 'COMPLETED' AND NEW."status" = 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'curriculum_topic_progress.status no puede retroceder de COMPLETED a IN_PROGRESS (id=%)', OLD."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_curriculum_topic_progress_monotonic
BEFORE UPDATE ON "curriculum_topic_progress"
FOR EACH ROW EXECUTE FUNCTION enforce_curriculum_topic_progress_monotonic();

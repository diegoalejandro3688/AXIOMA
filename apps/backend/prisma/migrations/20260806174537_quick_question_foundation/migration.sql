-- CreateEnum
CREATE TYPE "quick_question_session_status" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "quick_question_session" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "status" "quick_question_session_status" NOT NULL DEFAULT 'ACTIVE',
    "current_question_version_id" UUID,
    "current_presented_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "quick_question_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_question_attempt" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "question_version_id" UUID NOT NULL,
    "answer_option_id" UUID NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "presented_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operation_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quick_question_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quick_question_session_account_id_idx" ON "quick_question_session"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "quick_question_attempt_operation_id_key" ON "quick_question_attempt"("operation_id");

-- CreateIndex
CREATE INDEX "quick_question_attempt_session_id_idx" ON "quick_question_attempt"("session_id");

-- CreateIndex
CREATE INDEX "quick_question_attempt_account_id_idx" ON "quick_question_attempt"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "quick_question_attempt_session_id_question_version_id_key" ON "quick_question_attempt"("session_id", "question_version_id");

-- AddForeignKey
ALTER TABLE "quick_question_session" ADD CONSTRAINT "quick_question_session_current_question_version_id_fkey" FOREIGN KEY ("current_question_version_id") REFERENCES "question_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_question_attempt" ADD CONSTRAINT "quick_question_attempt_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "quick_question_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_question_attempt" ADD CONSTRAINT "quick_question_attempt_question_version_id_fkey" FOREIGN KEY ("question_version_id") REFERENCES "question_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_question_attempt" ADD CONSTRAINT "quick_question_attempt_answer_option_id_fkey" FOREIGN KEY ("answer_option_id") REFERENCES "answer_option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Máquina de estados forward-only (§13.1/13.6, Gate 9 parcial) --
-- únicamente ACTIVE -> CLOSED, nunca CLOSED -> ACTIVE. Mismo criterio que
-- enforce_account_challenge_status_transition/enforce_league_group_status_transition:
-- respaldo real en base de datos, no solo en la capa de aplicación.
CREATE OR REPLACE FUNCTION enforce_quick_question_session_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = NEW."status" THEN
    -- Sin cambio de estado: otras columnas (currentQuestionVersionId,
    -- currentPresentedAt) pueden seguir actualizándose libremente mientras
    -- la sesión permanece ACTIVE.
    RETURN NEW;
  END IF;

  IF OLD."status" = 'ACTIVE' AND NEW."status" = 'CLOSED' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'quick_question_session no admite la transición % -> % (id=%) -- solo ACTIVE->CLOSED, nunca hacia atrás',
    OLD."status", NEW."status", OLD."id";
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quick_question_session_status_transition
BEFORE UPDATE ON "quick_question_session"
FOR EACH ROW EXECUTE FUNCTION enforce_quick_question_session_status_transition();

-- Sesión cerrada no acepta nuevas respuestas (§13.1/13.5 Gate 9, defensa en
-- profundidad -- la capa de aplicación ya lo valida antes de llegar aquí,
-- este trigger es el respaldo, mismo criterio que enforce_league_group_capacity).
CREATE OR REPLACE FUNCTION enforce_quick_question_attempt_session_active()
RETURNS TRIGGER AS $$
DECLARE
  session_status "quick_question_session_status";
BEGIN
  SELECT "status" INTO session_status FROM "quick_question_session" WHERE "id" = NEW."session_id";

  IF session_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'quick_question_attempt no puede crearse: la sesión % ya no está ACTIVE (status=%)', NEW."session_id", session_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quick_question_attempt_session_active
BEFORE INSERT ON "quick_question_attempt"
FOR EACH ROW EXECUTE FUNCTION enforce_quick_question_attempt_session_active();

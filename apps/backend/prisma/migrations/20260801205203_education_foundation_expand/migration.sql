-- CreateEnum
CREATE TYPE "subject_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "education_logical_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "editorial_status" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "learning_resource_type" AS ENUM ('LESSON', 'CONCEPT_EXPLANATION');

-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('SINGLE_CHOICE');

-- AlterTable
ALTER TABLE "curriculum_topic" ADD COLUMN     "subject_id" UUID;

-- CreateTable
CREATE TABLE "subject" (
    "id" UUID NOT NULL,
    "subject_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "status" "subject_status" NOT NULL DEFAULT 'ACTIVE',
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_resource" (
    "id" UUID NOT NULL,
    "resource_key" TEXT NOT NULL,
    "primary_subject_id" UUID NOT NULL,
    "resource_type" "learning_resource_type" NOT NULL,
    "status" "education_logical_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_resource_version" (
    "id" UUID NOT NULL,
    "learning_resource_id" UUID NOT NULL,
    "curriculum_topic_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content_blocks" JSONB NOT NULL,
    "editorial_status" "editorial_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_resource_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" UUID NOT NULL,
    "question_key" TEXT NOT NULL,
    "primary_subject_id" UUID NOT NULL,
    "question_type" "question_type" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "status" "education_logical_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_version" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "curriculum_topic_id" UUID NOT NULL,
    "stem_content" JSONB NOT NULL,
    "explanation_content" JSONB NOT NULL,
    "editorial_status" "editorial_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_option" (
    "id" UUID NOT NULL,
    "question_version_id" UUID NOT NULL,
    "content" JSONB NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_option_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subject_subject_key_key" ON "subject"("subject_key");

-- CreateIndex
CREATE UNIQUE INDEX "learning_resource_resource_key_key" ON "learning_resource"("resource_key");

-- CreateIndex
CREATE INDEX "learning_resource_primary_subject_id_idx" ON "learning_resource"("primary_subject_id");

-- CreateIndex
CREATE INDEX "learning_resource_version_learning_resource_id_idx" ON "learning_resource_version"("learning_resource_id");

-- CreateIndex
CREATE INDEX "learning_resource_version_curriculum_topic_id_idx" ON "learning_resource_version"("curriculum_topic_id");

-- CreateIndex
CREATE INDEX "learning_resource_version_editorial_status_idx" ON "learning_resource_version"("editorial_status");

-- CreateIndex
CREATE UNIQUE INDEX "question_question_key_key" ON "question"("question_key");

-- CreateIndex
CREATE INDEX "question_primary_subject_id_idx" ON "question"("primary_subject_id");

-- CreateIndex
CREATE INDEX "question_version_question_id_idx" ON "question_version"("question_id");

-- CreateIndex
CREATE INDEX "question_version_curriculum_topic_id_idx" ON "question_version"("curriculum_topic_id");

-- CreateIndex
CREATE INDEX "question_version_editorial_status_idx" ON "question_version"("editorial_status");

-- CreateIndex
CREATE INDEX "answer_option_question_version_id_idx" ON "answer_option"("question_version_id");

-- CreateIndex
CREATE INDEX "curriculum_topic_subject_id_idx" ON "curriculum_topic"("subject_id");

-- AddForeignKey
ALTER TABLE "curriculum_topic" ADD CONSTRAINT "curriculum_topic_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_resource" ADD CONSTRAINT "learning_resource_primary_subject_id_fkey" FOREIGN KEY ("primary_subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_resource_version" ADD CONSTRAINT "learning_resource_version_learning_resource_id_fkey" FOREIGN KEY ("learning_resource_id") REFERENCES "learning_resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_resource_version" ADD CONSTRAINT "learning_resource_version_curriculum_topic_id_fkey" FOREIGN KEY ("curriculum_topic_id") REFERENCES "curriculum_topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_primary_subject_id_fkey" FOREIGN KEY ("primary_subject_id") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_version" ADD CONSTRAINT "question_version_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_version" ADD CONSTRAINT "question_version_curriculum_topic_id_fkey" FOREIGN KEY ("curriculum_topic_id") REFERENCES "curriculum_topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_option" ADD CONSTRAINT "answer_option_question_version_id_fkey" FOREIGN KEY ("question_version_id") REFERENCES "question_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Backfill de datos -- ver ADR-0012, "Migración segura del CurriculumTopic
-- existente" y "Precisiones finales de aprobación", punto 3. Autosuficiente:
-- corre dentro de esta misma migración, sin paso manual entre migraciones.
-- ============================================================================

-- Subject requerido por el contenido ya sembrado en Fase 0 (ADR-0003).
-- Idempotente por `subject_key` -- reaplicar esta migración (o correrla sobre
-- una base que ya la tenga aplicada vía `prisma migrate deploy` no debería
-- ocurrir, pero el ON CONFLICT protege igual una re-ejecución manual del
-- backfill en un entorno de prueba).
INSERT INTO "subject" ("id", "subject_key", "name", "short_name", "status", "display_order", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'matematica', 'Matemática', 'Mate', 'ACTIVE', 1, now(), now())
ON CONFLICT ("subject_key") DO NOTHING;

-- Raíces (sin padre): hoy todo el contenido sembrado en Fase 0 pertenece a
-- Matemática -- única materia con datos preexistentes. El mapeo es explícito
-- por código, no inferido; si en el futuro hay raíces de otra materia con
-- datos preexistentes, este bloque se extiende explícitamente.
UPDATE "curriculum_topic"
SET "subject_id" = (SELECT "id" FROM "subject" WHERE "subject_key" = 'matematica')
WHERE "parent_id" IS NULL AND "subject_id" IS NULL;

-- Propagación padre -> hijo, iterativa, hasta que no queden filas sin
-- subject_id resoluble (jerarquía de cualquier profundidad, no solo 2 niveles).
DO $$
DECLARE
  updated_rows INTEGER;
BEGIN
  LOOP
    UPDATE "curriculum_topic" AS child
    SET "subject_id" = parent."subject_id"
    FROM "curriculum_topic" AS parent
    WHERE child."parent_id" = parent."id"
      AND child."subject_id" IS NULL
      AND parent."subject_id" IS NOT NULL;
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    EXIT WHEN updated_rows = 0;
  END LOOP;
END $$;

-- Verificación de completitud: aborta la migración completa (ROLLBACK) si
-- queda algún nodo huérfano sin materia resoluble -- nunca continúa en
-- silencio ni deja subject_id nulo o asignado por defecto.
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT count(*) INTO orphan_count FROM "curriculum_topic" WHERE "subject_id" IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'education_foundation backfill incompleto: % fila(s) de curriculum_topic sin subject_id resoluble', orphan_count;
  END IF;
END $$;

-- ============================================================================
-- Triggers de invariantes -- creados DESPUÉS del backfill ya verificado
-- completo, nunca antes. Ver ADR-0012, invariante 1 y "Precisiones finales de
-- aprobación", puntos 1-2. Postgres es la autoridad de estas invariantes
-- RELACIONALES (ADR-0001: "PostgreSQL como motor de base de datos y autoridad
-- de integridad... las invariantes que Prisma no pueda representar
-- adecuadamente se implementan mediante migraciones SQL personalizadas").
-- ============================================================================

-- (a) curriculum_topic: subject_id inmutable una vez fijado (solo permite la
-- transición NULL -> valor, la del backfill de arriba); consistencia
-- padre-hijo; rechazo de ciclos (directos e indirectos).
CREATE OR REPLACE FUNCTION enforce_curriculum_topic_subject_consistency()
RETURNS TRIGGER AS $$
DECLARE
  parent_subject_id UUID;
  cursor_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."subject_id" IS NOT NULL AND NEW."subject_id" IS DISTINCT FROM OLD."subject_id" THEN
    RAISE EXCEPTION 'curriculum_topic.subject_id es inmutable una vez asignado (id=%)', NEW."id";
  END IF;

  IF NEW."parent_id" IS NOT NULL THEN
    SELECT "subject_id" INTO parent_subject_id FROM "curriculum_topic" WHERE "id" = NEW."parent_id";

    IF parent_subject_id IS NOT NULL AND NEW."subject_id" IS NOT NULL
       AND parent_subject_id IS DISTINCT FROM NEW."subject_id" THEN
      RAISE EXCEPTION 'curriculum_topic hijo (id=%) no puede pertenecer a una materia distinta de su padre (id=%)', NEW."id", NEW."parent_id";
    END IF;

    -- Rechazo de ciclos: recorre hacia arriba desde parent_id; si se alcanza
    -- NEW.id, hay un ciclo (cubre auto-referencia directa e indirecta).
    cursor_id := NEW."parent_id";
    WHILE cursor_id IS NOT NULL LOOP
      IF cursor_id = NEW."id" THEN
        RAISE EXCEPTION 'curriculum_topic: parent_id introduce un ciclo (id=%)', NEW."id";
      END IF;
      SELECT "parent_id" INTO cursor_id FROM "curriculum_topic" WHERE "id" = cursor_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_curriculum_topic_subject_consistency
BEFORE INSERT OR UPDATE ON "curriculum_topic"
FOR EACH ROW EXECUTE FUNCTION enforce_curriculum_topic_subject_consistency();

-- (b) learning_resource / question: primary_subject_id inmutable una vez creado.
CREATE OR REPLACE FUNCTION enforce_learning_resource_subject_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."primary_subject_id" IS DISTINCT FROM OLD."primary_subject_id" THEN
    RAISE EXCEPTION 'learning_resource.primary_subject_id es inmutable una vez creado (id=%)', NEW."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_learning_resource_subject_immutable
BEFORE UPDATE ON "learning_resource"
FOR EACH ROW EXECUTE FUNCTION enforce_learning_resource_subject_immutable();

CREATE OR REPLACE FUNCTION enforce_question_subject_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."primary_subject_id" IS DISTINCT FROM OLD."primary_subject_id" THEN
    RAISE EXCEPTION 'question.primary_subject_id es inmutable una vez creado (id=%)', NEW."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_question_subject_immutable
BEFORE UPDATE ON "question"
FOR EACH ROW EXECUTE FUNCTION enforce_question_subject_immutable();

-- (c) learning_resource_version / question_version: la materia del tema
-- referenciado debe coincidir con la materia de la identidad propietaria.
CREATE OR REPLACE FUNCTION enforce_learning_resource_version_subject_consistency()
RETURNS TRIGGER AS $$
DECLARE
  resource_subject_id UUID;
  topic_subject_id UUID;
BEGIN
  SELECT "primary_subject_id" INTO resource_subject_id FROM "learning_resource" WHERE "id" = NEW."learning_resource_id";
  SELECT "subject_id" INTO topic_subject_id FROM "curriculum_topic" WHERE "id" = NEW."curriculum_topic_id";

  IF resource_subject_id IS NULL THEN
    RAISE EXCEPTION 'learning_resource_version: learning_resource_id % no existe', NEW."learning_resource_id";
  END IF;
  IF topic_subject_id IS DISTINCT FROM resource_subject_id THEN
    RAISE EXCEPTION 'learning_resource_version: el tema (subject_id=%) no coincide con la materia del recurso (primary_subject_id=%)', topic_subject_id, resource_subject_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_learning_resource_version_subject_consistency
BEFORE INSERT OR UPDATE ON "learning_resource_version"
FOR EACH ROW EXECUTE FUNCTION enforce_learning_resource_version_subject_consistency();

CREATE OR REPLACE FUNCTION enforce_question_version_subject_consistency()
RETURNS TRIGGER AS $$
DECLARE
  question_subject_id UUID;
  topic_subject_id UUID;
BEGIN
  SELECT "primary_subject_id" INTO question_subject_id FROM "question" WHERE "id" = NEW."question_id";
  SELECT "subject_id" INTO topic_subject_id FROM "curriculum_topic" WHERE "id" = NEW."curriculum_topic_id";

  IF question_subject_id IS NULL THEN
    RAISE EXCEPTION 'question_version: question_id % no existe', NEW."question_id";
  END IF;
  IF topic_subject_id IS DISTINCT FROM question_subject_id THEN
    RAISE EXCEPTION 'question_version: el tema (subject_id=%) no coincide con la materia de la pregunta (primary_subject_id=%)', topic_subject_id, question_subject_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_question_version_subject_consistency
BEFORE INSERT OR UPDATE ON "question_version"
FOR EACH ROW EXECUTE FUNCTION enforce_question_version_subject_consistency();

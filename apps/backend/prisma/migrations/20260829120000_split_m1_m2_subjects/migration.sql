-- ============================================================================
-- M1/M2 SUBJECT TAXONOMY ALIGNMENT  (forward-only data-alignment migration)
-- ============================================================================
--
-- Product decision (frozen): Estudio V1 tiene 5 materias académicas, y
-- "Matemática M1" / "Matemática M2" son materias DISTINTAS, no unidades de una
-- única "Matemática" genérica. Hasta ahora M1.* y M2.* convivían como temas
-- del mismo Subject `matematica`.
--
-- Esta migración es una EXCEPCIÓN DE DATOS HISTÓRICA, única y acotada, para
-- alinear la taxonomía persistida con esa decisión. NO debilita el invariante
-- de ADR-0012 "la materia de una identidad es inmutable una vez asignada":
--   * Los TRES triggers de inmutabilidad
--       - trg_curriculum_topic_subject_consistency
--       - trg_learning_resource_subject_immutable
--       - trg_question_subject_immutable
--     se DESACTIVAN sólo durante los tres UPDATE de reasignación de más abajo
--     y se REACTIVAN con su definición original (los objetos trigger y sus
--     funciones nunca se tocan) antes de terminar. Tras esta migración la
--     inmutabilidad vuelve a ser obligatoria.
--   * Los DOS triggers de consistencia de versión
--       - trg_learning_resource_version_subject_consistency
--       - trg_question_version_subject_consistency
--     NO se tocan: esta migración nunca escribe learning_resource_version ni
--     question_version. Un bloque de post-verificación aborta (ROLLBACK) si al
--     terminar quedara cualquier inconsistencia que esos triggers rechazarían.
--
-- SEGURA EN BD NUEVA: sobre un esquema de educación sin sembrar, cada
-- sentencia empareja cero filas (predicados por subject_key / code). El DDL
-- `ALTER TABLE ... DISABLE/ENABLE TRIGGER` sólo requiere ser OWNER de la tabla
-- (nunca superusuario) y es portable. `prisma/seed.ts` y
-- `apps/backend/content/manifest.ts` expresan directamente la arquitectura de
-- 5 materias para bases nuevas.
--
-- ATÓMICA: Prisma ejecuta el archivo completo en una transacción; cualquier
-- fallo revierte la reasignación Y el estado de los triggers.
--
-- IDs PRESERVADOS: no se recrea ni se duplica contenido. Sólo cambian
--   curriculum_topic.subject_id | learning_resource.primary_subject_id |
--   question.primary_subject_id
-- para el contenido M2.*. `CurriculumTopicProgress` referencia
-- `curriculum_topic_id` (sin cambios) -> el progreso acompaña al tema.

-- 1. Nueva materia académica "Matemática M2". Sólo en bases que ya tienen el
--    Subject `matematica` previo al split (una BD nueva la obtiene de seed /
--    del importer del manifest ya dividido).
INSERT INTO "subject" ("id", "subject_key", "name", "short_name", "status", "display_order", "created_at", "updated_at")
SELECT gen_random_uuid(), 'matematica-m2', 'Matemática M2', 'M2', 'ACTIVE', 2, now(), now()
WHERE EXISTS (SELECT 1 FROM "subject" WHERE "subject_key" = 'matematica')
ON CONFLICT ("subject_key") DO NOTHING;

-- 2. Re-presentar la materia existente como "Matemática M1". `id` y
--    `subject_key` NO cambian -> `Exam.subjectId` de ENSAYO.M1 y toda FK
--    permanecen estables.
UPDATE "subject"
SET "name" = 'Matemática M1', "short_name" = 'M1', "display_order" = 1
WHERE "subject_key" = 'matematica'
  AND ("name" <> 'Matemática M1' OR "short_name" <> 'M1' OR "display_order" <> 1);

-- 3. Reubicar el resto de materias visibles después de "Matemática M2".
UPDATE "subject" SET "display_order" = 3 WHERE "subject_key" = 'lenguaje' AND "display_order" <> 3;
UPDATE "subject" SET "display_order" = 4 WHERE "subject_key" = 'ciencias' AND "display_order" <> 4;
UPDATE "subject" SET "display_order" = 5 WHERE "subject_key" = 'historia' AND "display_order" <> 5;

-- 4. Reasignación quirúrgica del contenido M2.* de `matematica` a
--    `matematica-m2`, con los tres triggers de inmutabilidad desactivados
--    sólo para el alcance de los UPDATE.
DO $$
DECLARE
  m1_id UUID;
  m2_id UUID;
BEGIN
  SELECT "id" INTO m1_id FROM "subject" WHERE "subject_key" = 'matematica';
  SELECT "id" INTO m2_id FROM "subject" WHERE "subject_key" = 'matematica-m2';

  -- BD nueva o migración ya aplicada -> nada que reasignar.
  IF m1_id IS NULL OR m2_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "curriculum_topic"
    WHERE "code" LIKE 'M2.%' AND "subject_id" = m1_id
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE "curriculum_topic" DISABLE TRIGGER "trg_curriculum_topic_subject_consistency";
  ALTER TABLE "learning_resource" DISABLE TRIGGER "trg_learning_resource_subject_immutable";
  ALTER TABLE "question"          DISABLE TRIGGER "trg_question_subject_immutable";

  -- 4a. Los temas curriculares M2.* (raíces + descendientes). IDs preservados
  --     -> las filas de curriculum_topic_progress acompañan al tema.
  UPDATE "curriculum_topic"
  SET "subject_id" = m2_id
  WHERE "code" LIKE 'M2.%' AND "subject_id" = m1_id;

  -- 4b. Las identidades LearningResource cuyas versiones clasifican bajo un
  --     tema M2.*. IDs preservados.
  UPDATE "learning_resource"
  SET "primary_subject_id" = m2_id
  WHERE "primary_subject_id" = m1_id
    AND "id" IN (
      SELECT DISTINCT lrv."learning_resource_id"
      FROM "learning_resource_version" lrv
      JOIN "curriculum_topic" ct ON ct."id" = lrv."curriculum_topic_id"
      WHERE ct."code" LIKE 'M2.%'
    );

  -- 4c. Las identidades Question cuyas versiones clasifican bajo un tema M2.*.
  --     IDs preservados.
  UPDATE "question"
  SET "primary_subject_id" = m2_id
  WHERE "primary_subject_id" = m1_id
    AND "id" IN (
      SELECT DISTINCT qv."question_id"
      FROM "question_version" qv
      JOIN "curriculum_topic" ct ON ct."id" = qv."curriculum_topic_id"
      WHERE ct."code" LIKE 'M2.%'
    );

  -- Reactivar los tres triggers con su definición original ANTES de la
  -- post-verificación (si ésta abortara, ya están reactivados; y la
  -- transacción revierte todo de todos modos).
  ALTER TABLE "curriculum_topic" ENABLE TRIGGER "trg_curriculum_topic_subject_consistency";
  ALTER TABLE "learning_resource" ENABLE TRIGGER "trg_learning_resource_subject_immutable";
  ALTER TABLE "question"          ENABLE TRIGGER "trg_question_subject_immutable";

  -- 5. Post-condición: identidad <-> materia del tema deben coincidir para
  --    TODO el contenido M2 movido -- exactamente lo que exigen (intactos) los
  --    dos triggers de consistencia de versión. Abortar en caso contrario.
  IF EXISTS (
    SELECT 1
    FROM "question_version" qv
    JOIN "question" q ON q."id" = qv."question_id"
    JOIN "curriculum_topic" ct ON ct."id" = qv."curriculum_topic_id"
    WHERE ct."code" LIKE 'M2.%' AND ct."subject_id" IS DISTINCT FROM q."primary_subject_id"
  ) THEN
    RAISE EXCEPTION 'split_m1_m2_subjects: inconsistencia question_version <-> materia tras la reasignación';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "learning_resource_version" lrv
    JOIN "learning_resource" lr ON lr."id" = lrv."learning_resource_id"
    JOIN "curriculum_topic" ct ON ct."id" = lrv."curriculum_topic_id"
    WHERE ct."code" LIKE 'M2.%' AND ct."subject_id" IS DISTINCT FROM lr."primary_subject_id"
  ) THEN
    RAISE EXCEPTION 'split_m1_m2_subjects: inconsistencia learning_resource_version <-> materia tras la reasignación';
  END IF;

  -- Post-condición: ninguna identidad/tema M2 debe seguir bajo `matematica`.
  IF EXISTS (SELECT 1 FROM "curriculum_topic" WHERE "code" LIKE 'M2.%' AND "subject_id" = m1_id)
  OR EXISTS (
    SELECT 1 FROM "learning_resource" lr
    WHERE lr."primary_subject_id" = m1_id AND lr."id" IN (
      SELECT lrv."learning_resource_id" FROM "learning_resource_version" lrv
      JOIN "curriculum_topic" ct ON ct."id" = lrv."curriculum_topic_id" WHERE ct."code" LIKE 'M2.%')
  )
  OR EXISTS (
    SELECT 1 FROM "question" q
    WHERE q."primary_subject_id" = m1_id AND q."id" IN (
      SELECT qv."question_id" FROM "question_version" qv
      JOIN "curriculum_topic" ct ON ct."id" = qv."curriculum_topic_id" WHERE ct."code" LIKE 'M2.%')
  ) THEN
    RAISE EXCEPTION 'split_m1_m2_subjects: quedó contenido M2 bajo la materia matematica tras la reasignación';
  END IF;
END $$;

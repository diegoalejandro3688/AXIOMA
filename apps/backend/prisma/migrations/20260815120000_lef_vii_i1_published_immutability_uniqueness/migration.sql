-- ============================================================================
-- LEF Bloque VII -- Plataforma Editorial, Incremento 1.
-- "Inmutabilidad Y unicidad de la versión publicada."
--
-- Fuente contractual: docs/adr/LEF-BLOCK-VII-DEFINITION.md
--   §7.1 invariantes 1, 2, 3, 4, 16 y 21
--   §8.4 lista EXHAUSTIVA Y CERRADA de transiciones/UPDATE permitidos sobre
--        una fila ya publicada
--   §8.6 unicidad de versión publicada (DG-11) y orden de escritura de T7
--   §12.1 frontera exacta del incremento
--
-- Decisión adicional y explícita del Product Owner (2026-08-15), que ESTA
-- migración implementa y que EXTIENDE §8.4 tal como estaba redactada:
--
--   Una versión que fue publicada permanece inmutable PARA SIEMPRE, incluso
--   tras pasar a DEPRECATED. `DEPRECATED` significa "retirada del catálogo
--   activo", NO "vuelve a ser editable".
--
--     * PUBLISHED               -> contenido inmutable, sin DELETE.
--     * PUBLISHED -> DEPRECATED -> única transición de estado autorizada
--                                  desde PUBLISHED; no puede alterar
--                                  contenido en el mismo UPDATE.
--     * DEPRECATED              -> contenido sigue inmutable, sin DELETE.
--     * NO existe transición DEPRECATED -> DRAFT/IN_REVIEW/APPROVED/PUBLISHED.
--     * Corregir contenido publicado = crear una versión NUEVA (DRAFT nueva),
--       nunca reeditar la depreciada (CMS-025, invariante 5).
--     * ARCHIVED queda completamente fuera del flujo V1 (DG-8, invariante 21),
--       ni siquiera como destino desde DEPRECATED. El valor permanece en el
--       enum como artefacto histórico de Bloque I y NO se elimina.
--
-- Sin ningún mecanismo de bypass: no hay flag, no hay variable de sesión, no
-- hay `disable_immutability`, no hay rol privilegiado ni "modo test" que
-- permita saltarse esta lista (§8.4, decisión C literal: "SIN abrir una
-- excepción genérica a la inmutabilidad"). PostgreSQL es la autoridad final
-- (ADR-0012:50) -- protege incluso ante un script de backfill con un error,
-- una migración manual futura o un acceso directo a la base.
--
-- Patrón: función plpgsql + RAISE EXCEPTION + trigger BEFORE ... FOR EACH ROW,
-- idéntico a `enforce_student_response_immutable`
-- (20260802205740_progress_foundation/migration.sql:62-72).
--
-- Cambio de comportamiento observable: NINGUNO. Hoy no existe ninguna ruta de
-- escritura sobre estas tablas (§12.1) y los datos actuales ya satisfacen
-- ambos índices únicos parciales (§8.6, "Efecto sobre los datos actuales:
-- ninguno").
-- ============================================================================


-- ----------------------------------------------------------------------------
-- (B1) question_version -- inmutabilidad de contenido de una versión que
-- alcanzó publicación (PUBLISHED o DEPRECATED) + lista cerrada de transiciones.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_question_version_published_immutable()
RETURNS TRIGGER AS $$
BEGIN
  -- Filas que NUNCA alcanzaron publicación (DRAFT/IN_REVIEW/APPROVED) siguen
  -- siendo totalmente mutables -- el flujo editorial de los Incrementos 3-4
  -- ocurre entero ahí. Este trigger no toca ese camino.
  IF OLD."editorial_status" NOT IN ('PUBLISHED', 'DEPRECATED') THEN
    RETURN NEW;
  END IF;

  -- (1) Contenido e identidad: congelados. Ni el UPDATE de T8 puede colar un
  -- cambio de contenido "de paso" -- §8.4 exige que la transición de estado
  -- sea el ÚNICO cambio (más `updated_at`, que Prisma escribe con @updatedAt).
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."question_id" IS DISTINCT FROM OLD."question_id"
     OR NEW."curriculum_topic_id" IS DISTINCT FROM OLD."curriculum_topic_id"
     OR NEW."stem_content" IS DISTINCT FROM OLD."stem_content"
     OR NEW."explanation_content" IS DISTINCT FROM OLD."explanation_content"
     OR NEW."published_at" IS DISTINCT FROM OLD."published_at"
     OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
    RAISE EXCEPTION
      'question_version es inmutable una vez publicada: ninguna columna de contenido o identidad puede cambiar (id=%, editorial_status=%). Corregir contenido publicado exige crear una versión NUEVA en DRAFT (CMS-025).',
      OLD."id", OLD."editorial_status";
  END IF;

  -- (2) Transiciones de estado: lista cerrada. La única salida de PUBLISHED es
  -- DEPRECATED (T8). DEPRECATED es terminal en V1: no vuelve a DRAFT, no
  -- vuelve a PUBLISHED, no va a ARCHIVED.
  IF NEW."editorial_status" IS DISTINCT FROM OLD."editorial_status" THEN
    IF NOT (OLD."editorial_status" = 'PUBLISHED' AND NEW."editorial_status" = 'DEPRECATED') THEN
      RAISE EXCEPTION
        'question_version no admite la transición % -> % (id=%). Desde PUBLISHED la única transición autorizada es PUBLISHED -> DEPRECATED; DEPRECATED es terminal en V1 y ARCHIVED está fuera del flujo.',
        OLD."editorial_status", NEW."editorial_status", OLD."id";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_question_version_published_immutable
BEFORE UPDATE ON "question_version"
FOR EACH ROW EXECUTE FUNCTION enforce_question_version_published_immutable();


CREATE OR REPLACE FUNCTION enforce_question_version_published_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."editorial_status" IN ('PUBLISHED', 'DEPRECATED') THEN
    RAISE EXCEPTION
      'question_version que alcanzó publicación no puede borrarse (id=%, editorial_status=%) -- invariante 3: borrar es la forma más destructiva de modificar.',
      OLD."id", OLD."editorial_status";
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_question_version_published_no_delete
BEFORE DELETE ON "question_version"
FOR EACH ROW EXECUTE FUNCTION enforce_question_version_published_no_delete();


-- ----------------------------------------------------------------------------
-- (B2) learning_resource_version -- mismas garantías, con su mapa de columnas
-- propio (§8.4, segunda tabla).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_learning_resource_version_published_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."editorial_status" NOT IN ('PUBLISHED', 'DEPRECATED') THEN
    RETURN NEW;
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."learning_resource_id" IS DISTINCT FROM OLD."learning_resource_id"
     OR NEW."curriculum_topic_id" IS DISTINCT FROM OLD."curriculum_topic_id"
     OR NEW."title" IS DISTINCT FROM OLD."title"
     OR NEW."content_blocks" IS DISTINCT FROM OLD."content_blocks"
     OR NEW."published_at" IS DISTINCT FROM OLD."published_at"
     OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
    RAISE EXCEPTION
      'learning_resource_version es inmutable una vez publicada: ninguna columna de contenido o identidad puede cambiar (id=%, editorial_status=%). Corregir contenido publicado exige crear una versión NUEVA en DRAFT (CMS-025).',
      OLD."id", OLD."editorial_status";
  END IF;

  IF NEW."editorial_status" IS DISTINCT FROM OLD."editorial_status" THEN
    IF NOT (OLD."editorial_status" = 'PUBLISHED' AND NEW."editorial_status" = 'DEPRECATED') THEN
      RAISE EXCEPTION
        'learning_resource_version no admite la transición % -> % (id=%). Desde PUBLISHED la única transición autorizada es PUBLISHED -> DEPRECATED; DEPRECATED es terminal en V1 y ARCHIVED está fuera del flujo.',
        OLD."editorial_status", NEW."editorial_status", OLD."id";
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_learning_resource_version_published_immutable
BEFORE UPDATE ON "learning_resource_version"
FOR EACH ROW EXECUTE FUNCTION enforce_learning_resource_version_published_immutable();


CREATE OR REPLACE FUNCTION enforce_learning_resource_version_published_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."editorial_status" IN ('PUBLISHED', 'DEPRECATED') THEN
    RAISE EXCEPTION
      'learning_resource_version que alcanzó publicación no puede borrarse (id=%, editorial_status=%) -- invariante 3.',
      OLD."id", OLD."editorial_status";
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_learning_resource_version_published_no_delete
BEFORE DELETE ON "learning_resource_version"
FOR EACH ROW EXECUTE FUNCTION enforce_learning_resource_version_published_no_delete();


-- ----------------------------------------------------------------------------
-- (B3) answer_option -- invariante 2. Insertar o borrar una alternativa ES
-- modificar destructivamente la pregunta publicada, así que las tres
-- operaciones (INSERT/UPDATE/DELETE) se resuelven contra el estado de la
-- `question_version` padre. Incluye explícitamente `is_correct`: alterar cuál
-- alternativa es la correcta es la mutación más grave posible sobre una
-- pregunta ya respondida por estudiantes (ADR-0014, StudentResponse).
--
-- Nota sobre la cascada: `answer_option` tiene onDelete: Cascade desde
-- `question_version` (schema.prisma:218). Como el DELETE de una versión que
-- alcanzó publicación ya está bloqueado arriba, la cascada nunca puede
-- convertirse en una vía de mutación (§8.4). Un DELETE en cascada desde una
-- versión en DRAFT sí procede: su padre no alcanzó publicación.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_answer_option_published_parent_immutable()
RETURNS TRIGGER AS $$
DECLARE
  old_parent_status "editorial_status";
  new_parent_status "editorial_status";
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    SELECT "editorial_status" INTO old_parent_status
      FROM "question_version" WHERE "id" = OLD."question_version_id";

    IF old_parent_status IN ('PUBLISHED', 'DEPRECATED') THEN
      RAISE EXCEPTION
        'answer_option no puede modificarse ni borrarse: su question_version padre alcanzó publicación (question_version_id=%, editorial_status=%, answer_option_id=%). Esto incluye is_correct -- la clave de respuesta de una versión publicada es inmutable.',
        OLD."question_version_id", old_parent_status, OLD."id";
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT "editorial_status" INTO new_parent_status
      FROM "question_version" WHERE "id" = NEW."question_version_id";

    IF new_parent_status IN ('PUBLISHED', 'DEPRECATED') THEN
      RAISE EXCEPTION
        'answer_option no puede insertarse ni reasignarse hacia una question_version que alcanzó publicación (question_version_id=%, editorial_status=%). Las alternativas deben crearse mientras la versión está en DRAFT, antes de publicarla.',
        NEW."question_version_id", new_parent_status;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_answer_option_published_parent_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "answer_option"
FOR EACH ROW EXECUTE FUNCTION enforce_answer_option_published_parent_immutable();


-- ----------------------------------------------------------------------------
-- (C) Unicidad de versión publicada por identidad -- DG-11 resuelto,
-- invariante 16, §8.6. PostgreSQL es la autoridad final, no la validación de
-- servicio.
--
-- Un índice único parcial se verifica POR SENTENCIA, de forma inmediata: a
-- diferencia de una restricción UNIQUE declarada DEFERRABLE, no admite
-- diferimiento al COMMIT. Consecuencia sobre T7 con corrección (§8.6): la
-- transacción DEBE escribir primero `PUBLISHED -> DEPRECATED` sobre la versión
-- anterior y DESPUÉS `APPROVED -> PUBLISHED` sobre la nueva. El orden inverso
-- hace fallar la transacción completa.
--
-- Sin representación declarativa en schema.prisma -- Prisma no soporta índices
-- parciales en el DSL; mismo criterio ya aceptado para
-- `game_season_single_active` y `quick_question_session_one_active_per_account`.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX "question_version_one_published_per_question"
  ON "question_version" ("question_id")
  WHERE "editorial_status" = 'PUBLISHED';

CREATE UNIQUE INDEX "learning_resource_version_one_published_per_resource"
  ON "learning_resource_version" ("learning_resource_id")
  WHERE "editorial_status" = 'PUBLISHED';

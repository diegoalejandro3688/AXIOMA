-- ============================================================================
-- LEF Bloque VII -- Plataforma Editorial, Incremento 3.
-- "Transiciones de estado con auditoría (retiro primero)."
--
-- Fuente contractual: docs/adr/LEF-BLOCK-VII-DEFINITION.md
--   §8.2  transiciones T4..T8 (actor autorizado, precondiciones, efectos)
--   §8.3  enforcement de CMS-018 por IDENTIDAD DE ACTOR
--   §8.5  excepción registrada de CMS-018 (DG-10) -- tres condiciones acumulativas
--   §8.6  orden de escritura de T7 con supersesión
--   §9.3  los NUEVE campos EXACTOS del registro de acción administrativa
--   §12.3 frontera exacta del incremento
--   §13.3 los nueve criterios de cierre
--
-- Alcance: T4, T5, T6, T7, T8. NO T1/T2/T3 (autoría = Incremento 4), NO las
-- validaciones CMS-013 (Incremento 4).
--
-- Migración ADITIVA PURA: crea dos enums y dos tablas con sus restricciones y
-- un trigger de inmutabilidad. NO toca ninguna tabla, columna, enum, índice
-- ni trigger preexistente. En particular NO toca nada del Incremento 1
-- (triggers de inmutabilidad e índices únicos parciales) ni del Incremento 2
-- (identidad administrativa), que se CONSUMEN sin modificarse.
--
-- Ninguna tabla de este archivo tiene FK hacia `account` (invariante 6), ni
-- hacia ninguna tabla de PROGRESS/GAMIFICATION/PRIVACY.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums.
--
-- `admin_action_type` cubre las OCHO transiciones de §8.2 -- §9.3 campo 4 dice
-- literalmente "la transición ejecutada (T1..T8)". T1/T2/T3 son valores
-- LEGIBLES, imprescindibles para que el enforcement de CMS-018 (§8.3: "no
-- puede ser el mismo AdminActor que creó la versión (T1) ni el que la editó
-- por última vez (T2)") tenga algo que leer. NINGUNA ruta productiva del
-- Incremento 3 los escribe -- mismo criterio que `ARCHIVED` en
-- `editorial_status`, y verificado estáticamente por el gate.
-- ----------------------------------------------------------------------------
CREATE TYPE "admin_action_type" AS ENUM ('T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8');

CREATE TYPE "admin_action_object_type" AS ENUM (
  'QUESTION_VERSION',
  'LEARNING_RESOURCE_VERSION',
  'ANSWER_OPTION'
);

-- ----------------------------------------------------------------------------
-- admin_cms018_exception_activation -- activación DELIBERADA de la excepción
-- de CMS-018 (§8.5, DG-10, invariante 24).
--
-- Es una ENTIDAD, no un booleano de petición: §8.5 exige que "ninguna
-- configuración inicial, ningún valor por defecto, ninguna inferencia del
-- sistema" pueda dejarla activa. Una fila que alguien tuvo que crear
-- explícitamente y fuera de banda (CLI, sin superficie HTTP) satisface eso;
-- un campo de request con `false` por defecto no.
--
-- ÁMBITO POR VERSIÓN, no global: §8.5 prohíbe expresamente "un flag global de
-- bypass" y "un modo equipo de una persona permanente".
-- ----------------------------------------------------------------------------
CREATE TABLE "admin_cms018_exception_activation" (
  "id" UUID NOT NULL,
  "activated_by_actor_id" UUID NOT NULL,
  "target_object_type" "admin_action_object_type" NOT NULL,
  "target_object_id" UUID NOT NULL,
  "activation_reason" TEXT NOT NULL,
  "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),

  CONSTRAINT "admin_cms018_exception_activation_pkey" PRIMARY KEY ("id"),
  -- Una activación sin justificación no es una activación deliberada.
  CONSTRAINT "admin_cms018_activation_reason_not_blank"
    CHECK (length(btrim("activation_reason")) > 0)
);

CREATE INDEX "admin_cms018_activation_target_idx"
  ON "admin_cms018_exception_activation" ("target_object_type", "target_object_id");

ALTER TABLE "admin_cms018_exception_activation"
  ADD CONSTRAINT "admin_cms018_activation_actor_fkey"
  FOREIGN KEY ("activated_by_actor_id") REFERENCES "admin_actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- admin_action -- los NUEVE campos EXACTOS de §9.3, ni uno más.
--
--   (1) actor_id            -- nunca nulo, nunca "sistema"
--   (2) role_exercised      -- rol que habilitó la operación
--   (3) occurred_at         -- momento
--   (4) action_type         -- T1..T8
--   (5) object_type/object_id -- REFERENCIA, nunca copia del contenido académico
--   (6) previous_status/new_status -- obligatorio para T3..T8
--   (7) reason              -- obligatorio en T4/T6/T8 y en todo uso de excepción
--   (8) operation_id        -- clave de idempotencia (invariante 11)
--   (9) cms018_activation_id -- marca de excepción; ausente por defecto
--
-- Sobre (5): §9.3 "con qué nivel de detalle" -- se guarda LA REFERENCIA al
-- objeto y la transición, NUNCA una copia del contenido académico. Duplicarlo
-- crearía una segunda copia mutable de algo que el bloque acaba de declarar
-- inmutable. Por eso `object_id` es un UUID sin FK: las tres clases de objeto
-- viven en tablas distintas y la integridad de contenido ya la garantizan los
-- triggers del Incremento 1 (una versión que alcanzó publicación no puede
-- borrarse, invariante 3).
-- ----------------------------------------------------------------------------
CREATE TABLE "admin_action" (
  "id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "role_exercised" "admin_role" NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "action_type" "admin_action_type" NOT NULL,
  "object_type" "admin_action_object_type" NOT NULL,
  "object_id" UUID NOT NULL,
  "previous_status" "editorial_status",
  "new_status" "editorial_status",
  "reason" TEXT,
  "operation_id" UUID,
  "cms018_activation_id" UUID,

  CONSTRAINT "admin_action_pkey" PRIMARY KEY ("id"),

  -- (6) §9.3: "estado previo -> estado nuevo: OBLIGATORIO para T3-T8".
  CONSTRAINT "admin_action_status_required_for_t3_t8" CHECK (
    "action_type" IN ('T1', 'T2')
    OR ("previous_status" IS NOT NULL AND "new_status" IS NOT NULL)
  ),

  -- (7) §9.3: motivo OBLIGATORIO en T4, T6 y T8.
  --
  -- T8 aparece aquí sin excepción, y eso incluye la despublicación automática
  -- por supersesión dentro de T7: §8.6 le asigna un motivo DETERMINADO POR EL
  -- SISTEMA (referencia a la versión que la sustituye), de modo que la
  -- columna nunca queda nula. Es exactamente lo que permite que esta
  -- restricción sea incondicional y que no haga falta ninguna columna
  -- adicional para distinguir el T8 autónomo del T8 por supersesión.
  CONSTRAINT "admin_action_reason_required" CHECK (
    "action_type" NOT IN ('T4', 'T6', 'T8')
    OR ("reason" IS NOT NULL AND length(btrim("reason")) > 0)
  ),

  -- (9) §8.5 condición 3: "motivo/justificación registrada POR CADA USO" de
  -- la excepción. Un uso sin motivo es irrepresentable en la base, no solo
  -- rechazado por el servicio.
  CONSTRAINT "admin_action_cms018_use_requires_reason" CHECK (
    "cms018_activation_id" IS NULL
    OR ("reason" IS NOT NULL AND length(btrim("reason")) > 0)
  ),

  -- §8.5, alcance de la excepción: afecta ÚNICAMENTE al invariante 9
  -- (separación de actor en aprobación/publicación). No existe ningún otro
  -- tipo de acción que pueda ampararse en ella.
  CONSTRAINT "admin_action_cms018_only_on_t5_t7" CHECK (
    "cms018_activation_id" IS NULL OR "action_type" IN ('T5', 'T7')
  ),

  -- Coherencia de la transición registrada: un registro no puede afirmar que
  -- una versión pasó de un estado a sí mismo salvo en T2 (edición en DRAFT).
  CONSTRAINT "admin_action_status_changes" CHECK (
    "action_type" = 'T2'
    OR "previous_status" IS NULL
    OR "previous_status" IS DISTINCT FROM "new_status"
  ),

  -- Invariante 21 / DG-8: ARCHIVED es inalcanzable por cualquier ruta de
  -- Bloque VII. Ni siquiera un registro de auditoría puede afirmar que se
  -- alcanzó -- si fuera representable aquí, el rastro podría mentir sobre un
  -- estado que la máquina de estados no produce.
  CONSTRAINT "admin_action_no_archived" CHECK (
    "previous_status" IS DISTINCT FROM 'ARCHIVED' AND "new_status" IS DISTINCT FROM 'ARCHIVED'
  )
);

-- (8) Idempotencia (invariante 11), mismo patrón que
-- `student_response.operation_id` (schema.prisma:268): UNIQUE sobre la clave.
-- Reenviar la misma operación con la misma clave no puede duplicar el
-- registro -- la base lo impide, no solo el servicio.
CREATE UNIQUE INDEX "admin_action_operation_id_key" ON "admin_action"("operation_id");

CREATE INDEX "admin_action_object_idx" ON "admin_action"("object_type", "object_id", "occurred_at");
CREATE INDEX "admin_action_actor_idx" ON "admin_action"("actor_id", "occurred_at");
CREATE INDEX "admin_action_cms018_activation_idx" ON "admin_action"("cms018_activation_id");

-- FK RESTRICT hacia el actor (invariante 23): la base RECHAZA cualquier
-- borrado de actor que rompiera la atribución histórica de "qué actor hizo
-- qué transición". Mismo criterio que `student_response.question_version_id`.
ALTER TABLE "admin_action"
  ADD CONSTRAINT "admin_action_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "admin_actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "admin_action"
  ADD CONSTRAINT "admin_action_cms018_activation_fkey"
  FOREIGN KEY ("cms018_activation_id") REFERENCES "admin_cms018_exception_activation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- Inmutabilidad del registro de acción -- PostgreSQL como autoridad final
-- (invariante 10, §9.3 "inmutabilidad del registro: append-only").
--
-- Mismo patrón EXACTO que `enforce_admin_access_log_immutable` (Incremento 2),
-- `enforce_student_response_immutable` y `enforce_ai_message_immutable`:
-- función plpgsql + RAISE EXCEPTION en un trigger BEFORE ... FOR EACH ROW.
--
-- Sin bypass: no hay flag, variable de sesión, rol privilegiado ni "modo
-- test". Una auditoría que el propio sistema pudiera reescribir no sería una
-- auditoría.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_admin_action_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'admin_action es append-only: % no está permitido (LEF Bloque VII, Incremento 3, invariante 10 / §9.3)',
    TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_action_immutable
  BEFORE UPDATE OR DELETE ON "admin_action"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_action_immutable();

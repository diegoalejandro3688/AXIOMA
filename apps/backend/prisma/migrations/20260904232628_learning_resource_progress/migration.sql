-- XP-V1B-2 -- hecho durable mínimo de completitud de LearningResource.
--
-- Migración ADITIVA PURA: crea `learning_resource_progress` (0 filas al
-- aplicarse -- SIN backfill, ninguna cuenta existente queda "completada"
-- automáticamente). NO toca `student_response`, `curriculum_topic_progress`,
-- `exam_attempt`, ninguna tabla de XP/League/Challenge/Cosmetics/Premium, ni
-- contenido editorial. `account_id` SIN FK a `account` -- mismo criterio
-- exacto que `curriculum_topic_progress`/`student_response` (ADR-0014,
-- desacople AUTH/PROGRESS). `learning_resource_id` referencia la identidad
-- CANÓNICA del recurso (nunca su versión editorial) -- un nuevo
-- `LearningResourceVersion` del mismo recurso nunca reabre elegibilidad de
-- XP. `UNIQUE(account_id, learning_resource_id)` es la autoridad final de
-- "a lo sumo una completitud por cuenta+recurso", incluyendo bajo una carrera
-- de dos solicitudes de completar concurrentes (P2002).
--
-- Ver docs de XP-V1A/XP-V1B/XP-V1B-2.

-- CreateTable
CREATE TABLE "learning_resource_progress" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "learning_resource_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_resource_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_resource_progress_account_id_idx" ON "learning_resource_progress"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_resource_progress_account_id_learning_resource_id_key" ON "learning_resource_progress"("account_id", "learning_resource_id");

-- AddForeignKey
ALTER TABLE "learning_resource_progress" ADD CONSTRAINT "learning_resource_progress_learning_resource_id_fkey" FOREIGN KEY ("learning_resource_id") REFERENCES "learning_resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

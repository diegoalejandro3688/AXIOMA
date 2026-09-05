-- STABILIZATION-B (avatares históricos V1) -- migración puramente ADITIVA:
-- columna nullable + FK nullable a reward_bundle, mismo patrón exacto que
-- level_definition.reward_bundle_id / league_definition.reward_bundle_id.
-- Sin backfill: las filas existentes de curriculum_topic quedan con
-- reward_bundle_id = NULL. No define completitud de unidad por sí sola.

-- AlterTable
ALTER TABLE "curriculum_topic" ADD COLUMN     "reward_bundle_id" UUID;

-- CreateIndex
CREATE INDEX "curriculum_topic_reward_bundle_id_idx" ON "curriculum_topic"("reward_bundle_id");

-- AddForeignKey
ALTER TABLE "curriculum_topic" ADD CONSTRAINT "curriculum_topic_reward_bundle_id_fkey" FOREIGN KEY ("reward_bundle_id") REFERENCES "reward_bundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterEnum (aditivo -- nuevo valor únicamente, ningún valor existente se toca)
ALTER TYPE "reward_source_entity_type" ADD VALUE 'STUDY_UNIT';

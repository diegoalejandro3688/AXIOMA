-- AlterTable
ALTER TABLE "level_definition" ADD COLUMN     "reward_bundle_id" UUID;

-- CreateIndex
CREATE INDEX "level_definition_reward_bundle_id_idx" ON "level_definition"("reward_bundle_id");

-- AddForeignKey
ALTER TABLE "level_definition" ADD CONSTRAINT "level_definition_reward_bundle_id_fkey" FOREIGN KEY ("reward_bundle_id") REFERENCES "reward_bundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

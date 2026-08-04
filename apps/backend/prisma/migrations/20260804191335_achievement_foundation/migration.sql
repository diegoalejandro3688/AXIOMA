-- CreateEnum
CREATE TYPE "achievement_visibility_class" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "achievement_repeatability" AS ENUM ('UNIQUE', 'REPEATABLE');

-- CreateEnum
CREATE TYPE "achievement_definition_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "achievement_version_approval_status" AS ENUM ('DRAFT', 'APPROVED', 'RETIRED');

-- CreateTable
CREATE TABLE "achievement_definition" (
    "id" UUID NOT NULL,
    "achievement_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "achievement_category" TEXT NOT NULL,
    "visibility_class" "achievement_visibility_class" NOT NULL,
    "repeatability" "achievement_repeatability" NOT NULL,
    "progress_tracking_type" TEXT NOT NULL,
    "status" "achievement_definition_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "achievement_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_version" (
    "id" UUID NOT NULL,
    "achievement_definition_id" UUID NOT NULL,
    "version_label" TEXT NOT NULL,
    "unlock_rule" TEXT NOT NULL,
    "reward_bundle_id" UUID,
    "icon_asset_version_id" UUID,
    "effective_from" TIMESTAMP(3),
    "effective_until" TIMESTAMP(3),
    "approval_status" "achievement_version_approval_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "achievement_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "achievement_definition_achievement_key_key" ON "achievement_definition"("achievement_key");

-- CreateIndex
CREATE INDEX "achievement_version_reward_bundle_id_idx" ON "achievement_version"("reward_bundle_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_version_achievement_definition_id_version_label_key" ON "achievement_version"("achievement_definition_id", "version_label");

-- AddForeignKey
ALTER TABLE "achievement_version" ADD CONSTRAINT "achievement_version_achievement_definition_id_fkey" FOREIGN KEY ("achievement_definition_id") REFERENCES "achievement_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_version" ADD CONSTRAINT "achievement_version_reward_bundle_id_fkey" FOREIGN KEY ("reward_bundle_id") REFERENCES "reward_bundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

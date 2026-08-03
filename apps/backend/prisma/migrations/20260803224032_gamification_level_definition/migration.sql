-- CreateEnum
CREATE TYPE "level_definition_status" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateTable
CREATE TABLE "level_definition" (
    "id" UUID NOT NULL,
    "level_number" INTEGER NOT NULL,
    "level_name" TEXT,
    "minimum_lifetime_xp" INTEGER NOT NULL,
    "status" "level_definition_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_definition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "level_definition_level_number_key" ON "level_definition"("level_number");

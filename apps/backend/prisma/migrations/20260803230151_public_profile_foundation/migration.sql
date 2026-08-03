-- CreateEnum
CREATE TYPE "public_profile_visibility_status" AS ENUM ('PRIVATE', 'VISIBLE');

-- CreateEnum
CREATE TYPE "public_profile_lifecycle_status" AS ENUM ('ACTIVE', 'RETIRED', 'ANONYMIZED');

-- CreateEnum
CREATE TYPE "profile_username_change_reason" AS ENUM ('INITIAL_CLAIM', 'USER_CHANGE', 'ACCOUNT_CLOSURE');

-- CreateTable
CREATE TABLE "public_profile" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "username_normalized" TEXT NOT NULL,
    "avatar_reference" TEXT,
    "visibility_status" "public_profile_visibility_status" NOT NULL DEFAULT 'PRIVATE',
    "lifecycle_status" "public_profile_lifecycle_status" NOT NULL DEFAULT 'ACTIVE',
    "username_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),
    "anonymized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_username_history" (
    "id" UUID NOT NULL,
    "public_profile_id" UUID NOT NULL,
    "previous_username_normalized" TEXT,
    "new_username_normalized" TEXT NOT NULL,
    "change_reason" "profile_username_change_reason" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_username_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_profile_account_id_key" ON "public_profile"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "public_profile_username_normalized_key" ON "public_profile"("username_normalized");

-- CreateIndex
CREATE INDEX "profile_username_history_public_profile_id_idx" ON "profile_username_history"("public_profile_id");

-- AddForeignKey
ALTER TABLE "profile_username_history" ADD CONSTRAINT "profile_username_history_public_profile_id_fkey" FOREIGN KEY ("public_profile_id") REFERENCES "public_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

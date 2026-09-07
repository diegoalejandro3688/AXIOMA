-- PS-0C.2 (Increment A) -- aceptación VERSIONADA de los Términos de uso y
-- convivencia pública + estado de moderación de la identidad pública.
-- Puramente ADITIVA: columnas nuevas nullable / con default, un enum nuevo.
-- Sin backfill: una cuenta existente con username público pero sin
-- aceptación queda `public_terms_accepted_version = NULL` y no-presentable
-- hasta que acepte de forma afirmativa.

-- CreateEnum
CREATE TYPE "public_profile_moderation_status" AS ENUM ('CLEAR', 'USERNAME_RESET');

-- AlterTable
ALTER TABLE "account"
  ADD COLUMN "public_terms_accepted_version" TEXT,
  ADD COLUMN "public_terms_accepted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public_profile"
  ADD COLUMN "moderation_status" "public_profile_moderation_status" NOT NULL DEFAULT 'CLEAR';

-- CreateEnum
CREATE TYPE "ai_assistance_mode" AS ENUM ('HINT_FIRST', 'CONCEPTUAL_EXPLANATION', 'GUIDED_STEPS', 'WORKED_SOLUTION');

-- AlterTable
ALTER TABLE "ai_message" ADD COLUMN     "requested_mode" "ai_assistance_mode";

/*
  Warnings:

  - Made the column `subject_id` on table `curriculum_topic` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "curriculum_topic" ALTER COLUMN "subject_id" SET NOT NULL;

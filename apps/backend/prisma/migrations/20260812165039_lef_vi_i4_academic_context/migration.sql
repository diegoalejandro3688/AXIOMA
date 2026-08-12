-- AlterTable
ALTER TABLE "ai_conversation" ADD COLUMN     "context_curriculum_topic_id" UUID,
ADD COLUMN     "context_question_version_id" UUID;

-- AddForeignKey
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_context_question_version_id_fkey" FOREIGN KEY ("context_question_version_id") REFERENCES "question_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_context_curriculum_topic_id_fkey" FOREIGN KEY ("context_curriculum_topic_id") REFERENCES "curriculum_topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

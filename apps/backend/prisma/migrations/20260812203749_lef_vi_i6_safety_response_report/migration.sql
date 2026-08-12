-- CreateEnum
CREATE TYPE "ai_response_report_type" AS ENUM ('INCORRECT', 'CONFUSING', 'TOO_LONG', 'OFF_TOPIC', 'INAPPROPRIATE');

-- CreateTable
CREATE TABLE "ai_response_report" (
    "id" UUID NOT NULL,
    "assistant_message_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "report_type" "ai_response_report_type" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_response_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_response_report_assistant_message_id_idx" ON "ai_response_report"("assistant_message_id");

-- CreateIndex
CREATE INDEX "ai_response_report_account_id_idx" ON "ai_response_report"("account_id");

-- AddForeignKey
ALTER TABLE "ai_response_report" ADD CONSTRAINT "ai_response_report_assistant_message_id_fkey" FOREIGN KEY ("assistant_message_id") REFERENCES "ai_message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_response_report" ADD CONSTRAINT "ai_response_report_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

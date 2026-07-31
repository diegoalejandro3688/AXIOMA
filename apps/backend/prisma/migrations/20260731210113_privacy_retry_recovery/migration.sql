-- AlterTable
ALTER TABLE "privacy_request" ADD COLUMN     "processing_started_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "privacy_request_status_processing_started_at_idx" ON "privacy_request"("status", "processing_started_at");

-- CreateEnum
CREATE TYPE "outbox_delivery_status" AS ENUM ('PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "outbox_event_delivery" (
    "id" UUID NOT NULL,
    "outbox_event_id" UUID NOT NULL,
    "consumer_name" TEXT NOT NULL,
    "status" "outbox_delivery_status" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_event_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_event_delivery_consumer_name_created_at_idx" ON "outbox_event_delivery"("consumer_name", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_event_delivery_outbox_event_id_consumer_name_key" ON "outbox_event_delivery"("outbox_event_id", "consumer_name");

-- AddForeignKey
ALTER TABLE "outbox_event_delivery" ADD CONSTRAINT "outbox_event_delivery_outbox_event_id_fkey" FOREIGN KEY ("outbox_event_id") REFERENCES "outbox_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

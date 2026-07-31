-- CreateEnum
CREATE TYPE "outbox_event_status" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "outbox_event" (
    "id" UUID NOT NULL,
    "event_key" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "source_domain" TEXT NOT NULL,
    "aggregate_id" UUID,
    "producer_version" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "outbox_event_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_event" (
    "id" UUID NOT NULL,
    "event_key" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "source_domain" TEXT NOT NULL,
    "analytics_actor_ref" TEXT,
    "producer_version" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_event_status_created_at_idx" ON "outbox_event"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_event_idempotency_key_key" ON "analytics_event"("idempotency_key");

-- CreateIndex
CREATE INDEX "analytics_event_event_key_occurred_at_idx" ON "analytics_event"("event_key", "occurred_at");

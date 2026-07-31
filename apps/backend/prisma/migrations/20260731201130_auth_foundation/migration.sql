-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('PENDING', 'ACTIVE', 'DELETION_PENDING', 'CLOSED');

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "status" "account_status" NOT NULL DEFAULT 'PENDING',
    "session_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_authenticated_at" TIMESTAMP(3),
    "deletion_requested_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identity" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "provider_code" TEXT NOT NULL DEFAULT 'firebase',
    "provider_subject" TEXT NOT NULL,
    "email_normalized" TEXT NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "unlinked_at" TIMESTAMP(3),

    CONSTRAINT "auth_identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_session" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "session_version" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_identity_email_normalized_idx" ON "auth_identity"("email_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identity_provider_code_provider_subject_key" ON "auth_identity"("provider_code", "provider_subject");

-- CreateIndex
CREATE INDEX "auth_session_account_id_idx" ON "auth_session"("account_id");

-- AddForeignKey
ALTER TABLE "auth_identity" ADD CONSTRAINT "auth_identity_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

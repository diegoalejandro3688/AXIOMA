-- CreateTable
CREATE TABLE "user_profile" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_account_id_key" ON "user_profile"("account_id");

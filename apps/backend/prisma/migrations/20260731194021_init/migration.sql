-- CreateTable
CREATE TABLE "curriculum_topic" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_topic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_topic_code_key" ON "curriculum_topic"("code");

-- AddForeignKey
ALTER TABLE "curriculum_topic" ADD CONSTRAINT "curriculum_topic_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "curriculum_topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "message_queues" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "type" INTEGER NOT NULL,
    "templateId" INTEGER,
    "jsonData" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_queues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_queues_userId_isSent_type_idx" ON "message_queues"("userId", "isSent", "type");

-- CreateIndex
CREATE INDEX "message_queues_userId_createdAt_idx" ON "message_queues"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "message_queues_isSent_type_idx" ON "message_queues"("isSent", "type");

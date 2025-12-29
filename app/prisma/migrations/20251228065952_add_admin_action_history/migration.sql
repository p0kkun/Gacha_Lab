-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('POINT_GRANT', 'ITEM_GRANT', 'GACHA_PROBABILITY_UPDATE', 'MESSAGE_SEND', 'TAG_ASSIGN', 'TAG_BULK_ASSIGN', 'USER_UPDATE', 'GACHA_TYPE_UPDATE', 'ITEM_UPDATE', 'OTHER');

-- CreateTable
CREATE TABLE "admin_action_histories" (
    "id" SERIAL NOT NULL,
    "actionType" "AdminActionType" NOT NULL,
    "adminUserId" TEXT,
    "adminName" TEXT,
    "targetUserId" TEXT,
    "targetUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_action_histories_actionType_idx" ON "admin_action_histories"("actionType");

-- CreateIndex
CREATE INDEX "admin_action_histories_adminUserId_idx" ON "admin_action_histories"("adminUserId");

-- CreateIndex
CREATE INDEX "admin_action_histories_targetUserId_idx" ON "admin_action_histories"("targetUserId");

-- CreateIndex
CREATE INDEX "admin_action_histories_createdAt_idx" ON "admin_action_histories"("createdAt");

-- CreateEnum
CREATE TYPE "BsopPrizeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "bsop_charges" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "chargeAmount" INTEGER NOT NULL,
    "pointsGranted" INTEGER NOT NULL,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "isWon" BOOLEAN NOT NULL,
    "prizeType" TEXT,
    "pointsOnLose" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bsop_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsop_prize_redemptions" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "chargeId" INTEGER NOT NULL,
    "prizeType" TEXT NOT NULL,
    "prizeName" TEXT NOT NULL,
    "chargeType" INTEGER NOT NULL,
    "status" "BsopPrizeStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bsop_prize_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsop_settings" (
    "id" SERIAL NOT NULL,
    "chargeType" INTEGER NOT NULL,
    "basePoints" INTEGER NOT NULL,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "pointsOnLose" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bsop_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsop_prizes" (
    "id" SERIAL NOT NULL,
    "settingId" INTEGER NOT NULL,
    "chargeType" INTEGER NOT NULL,
    "prizeType" TEXT NOT NULL,
    "prizeName" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bsop_prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsop_setting_history" (
    "id" SERIAL NOT NULL,
    "settingId" INTEGER NOT NULL,
    "chargeType" INTEGER NOT NULL,
    "changedBy" TEXT,
    "changeType" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bsop_setting_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bsop_charges_userId_createdAt_idx" ON "bsop_charges"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "bsop_charges_isWon_createdAt_idx" ON "bsop_charges"("isWon", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bsop_prize_redemptions_chargeId_key" ON "bsop_prize_redemptions"("chargeId");

-- CreateIndex
CREATE INDEX "bsop_prize_redemptions_userId_status_idx" ON "bsop_prize_redemptions"("userId", "status");

-- CreateIndex
CREATE INDEX "bsop_prize_redemptions_userId_createdAt_idx" ON "bsop_prize_redemptions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "bsop_prize_redemptions_status_createdAt_idx" ON "bsop_prize_redemptions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "bsop_prize_redemptions_prizeType_status_idx" ON "bsop_prize_redemptions"("prizeType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bsop_settings_chargeType_key" ON "bsop_settings"("chargeType");

-- CreateIndex
CREATE INDEX "bsop_settings_isActive_idx" ON "bsop_settings"("isActive");

-- CreateIndex
CREATE INDEX "bsop_settings_chargeType_idx" ON "bsop_settings"("chargeType");

-- CreateIndex
CREATE INDEX "bsop_prizes_chargeType_isActive_idx" ON "bsop_prizes"("chargeType", "isActive");

-- CreateIndex
CREATE INDEX "bsop_prizes_settingId_idx" ON "bsop_prizes"("settingId");

-- CreateIndex
CREATE INDEX "bsop_setting_history_settingId_createdAt_idx" ON "bsop_setting_history"("settingId", "createdAt");

-- CreateIndex
CREATE INDEX "bsop_setting_history_chargeType_createdAt_idx" ON "bsop_setting_history"("chargeType", "createdAt");

-- AddForeignKey
ALTER TABLE "bsop_charges" ADD CONSTRAINT "bsop_charges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsop_prize_redemptions" ADD CONSTRAINT "bsop_prize_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsop_prize_redemptions" ADD CONSTRAINT "bsop_prize_redemptions_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "bsop_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsop_prizes" ADD CONSTRAINT "bsop_prizes_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "bsop_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsop_setting_history" ADD CONSTRAINT "bsop_setting_history_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "bsop_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

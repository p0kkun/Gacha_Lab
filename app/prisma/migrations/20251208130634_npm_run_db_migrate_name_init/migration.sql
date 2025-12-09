-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('FIRST_PRIZE', 'SECOND_PRIZE', 'THIRD_PRIZE', 'FOURTH_PRIZE', 'FIFTH_PRIZE', 'LOSER');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'INVALID', 'FRAUD', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FreeGachaGrantType" AS ENUM ('REFERRER', 'REFEREE');

-- CreateTable
CREATE TABLE "users" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "pictureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "gacha_items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gacha_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gacha_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstPrizeWeight" INTEGER NOT NULL DEFAULT 0,
    "secondPrizeWeight" INTEGER NOT NULL DEFAULT 0,
    "thirdPrizeWeight" INTEGER NOT NULL DEFAULT 0,
    "fourthPrizeWeight" INTEGER NOT NULL DEFAULT 0,
    "fifthPrizeWeight" INTEGER NOT NULL DEFAULT 0,
    "loserWeight" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "gacha_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gacha_histories" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "gachaTypeId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gacha_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_histories" (
    "id" SERIAL NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT,
    "referralLinkId" TEXT NOT NULL,
    "referralLink" TEXT NOT NULL,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isFraudDetected" BOOLEAN NOT NULL DEFAULT false,
    "fraudReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "free_gacha_histories" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "referralHistoryId" INTEGER,
    "grantType" "FreeGachaGrantType" NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_gacha_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "gacha_items_rarity_isActive_idx" ON "gacha_items"("rarity", "isActive");

-- CreateIndex
CREATE INDEX "gacha_items_isActive_idx" ON "gacha_items"("isActive");

-- CreateIndex
CREATE INDEX "gacha_types_isActive_idx" ON "gacha_types"("isActive");

-- CreateIndex
CREATE INDEX "gacha_histories_userId_createdAt_idx" ON "gacha_histories"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "gacha_histories_gachaTypeId_createdAt_idx" ON "gacha_histories"("gachaTypeId", "createdAt");

-- CreateIndex
CREATE INDEX "gacha_histories_itemId_idx" ON "gacha_histories"("itemId");

-- CreateIndex
CREATE INDEX "gacha_histories_createdAt_idx" ON "gacha_histories"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "referral_histories_referralLinkId_key" ON "referral_histories"("referralLinkId");

-- CreateIndex
CREATE INDEX "referral_histories_referrerId_createdAt_idx" ON "referral_histories"("referrerId", "createdAt");

-- CreateIndex
CREATE INDEX "referral_histories_refereeId_idx" ON "referral_histories"("refereeId");

-- CreateIndex
CREATE INDEX "referral_histories_referralLinkId_idx" ON "referral_histories"("referralLinkId");

-- CreateIndex
CREATE INDEX "referral_histories_ipAddress_createdAt_idx" ON "referral_histories"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "referral_histories_status_idx" ON "referral_histories"("status");

-- CreateIndex
CREATE INDEX "referral_histories_expiresAt_idx" ON "referral_histories"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "referral_histories_referrerId_refereeId_key" ON "referral_histories"("referrerId", "refereeId");

-- CreateIndex
CREATE INDEX "free_gacha_histories_userId_isUsed_idx" ON "free_gacha_histories"("userId", "isUsed");

-- CreateIndex
CREATE INDEX "free_gacha_histories_referralHistoryId_idx" ON "free_gacha_histories"("referralHistoryId");

-- CreateIndex
CREATE INDEX "free_gacha_histories_expiresAt_idx" ON "free_gacha_histories"("expiresAt");

-- AddForeignKey
ALTER TABLE "gacha_histories" ADD CONSTRAINT "gacha_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_histories" ADD CONSTRAINT "gacha_histories_gachaTypeId_fkey" FOREIGN KEY ("gachaTypeId") REFERENCES "gacha_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_histories" ADD CONSTRAINT "gacha_histories_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "gacha_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_histories" ADD CONSTRAINT "referral_histories_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_histories" ADD CONSTRAINT "referral_histories_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_gacha_histories" ADD CONSTRAINT "free_gacha_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_gacha_histories" ADD CONSTRAINT "free_gacha_histories_referralHistoryId_fkey" FOREIGN KEY ("referralHistoryId") REFERENCES "referral_histories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

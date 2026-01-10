-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'INVALID', 'FRAUD');

-- CreateEnum
CREATE TYPE "FreeGachaGrantType" AS ENUM ('REFERRER', 'REFEREE');

-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('PURCHASE', 'CONSUME', 'GRANT', 'REFUND', 'REFERRAL_REWARD');

-- CreateEnum
CREATE TYPE "HandRank" AS ENUM ('ROYAL_FLUSH', 'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND', 'FULL_HOUSE', 'FLUSH', 'STRAIGHT', 'THREE_OF_A_KIND', 'TWO_PAIR', 'ONE_PAIR', 'HIGH_CARD');

-- CreateEnum
CREATE TYPE "VideoCategoryType" AS ENUM ('COMMON', 'TIER');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "ItemUsageType" AS ENUM ('IMAGE', 'SHOW_TO_STAFF');

-- CreateEnum
CREATE TYPE "PointType" AS ENUM ('PAID', 'FREE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "pictureUrl" TEXT,
    "lastAccessedReferralLinkId" TEXT,
    "lastAccessedReferralAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gacha_items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "usageType" "ItemUsageType" NOT NULL DEFAULT 'IMAGE',
    "grantFreePoints" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "useStartAt" TIMESTAMP(3),
    "useEndAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gacha_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gacha_types" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "pointCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstPrizeWeight" INTEGER NOT NULL DEFAULT 0,
    "secondPrizeWeight" INTEGER NOT NULL DEFAULT 0,
    "thirdPrizeWeight" INTEGER NOT NULL DEFAULT 0,
    "fourthPrizeWeight" INTEGER NOT NULL DEFAULT 0,
    "fifthPrizeWeight" INTEGER NOT NULL DEFAULT 0,
    "loserWeight" INTEGER NOT NULL DEFAULT 0,
    "prizeWeights" JSONB,
    "prizeHands" JSONB,
    "prizeOrder" JSONB,
    "firstPrizeHands" "HandRank"[] DEFAULT ARRAY[]::"HandRank"[],
    "secondPrizeHands" "HandRank"[] DEFAULT ARRAY[]::"HandRank"[],
    "thirdPrizeHands" "HandRank"[] DEFAULT ARRAY[]::"HandRank"[],
    "fourthPrizeHands" "HandRank"[] DEFAULT ARRAY[]::"HandRank"[],
    "fifthPrizeHands" "HandRank"[] DEFAULT ARRAY[]::"HandRank"[],
    "commonVideoAssetIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "tierVideoAssetIds" JSONB,
    "useDefaultVideos" BOOLEAN NOT NULL DEFAULT true,
    "resultMessageTemplateId" INTEGER,

    CONSTRAINT "gacha_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gacha_histories" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "gachaTypeId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "tierCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pointsUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "gacha_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_usage_logs" (
    "id" SERIAL NOT NULL,
    "gachaHistoryId" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gacha_prize_assignments" (
    "id" SERIAL NOT NULL,
    "gachaTypeId" INTEGER NOT NULL,
    "tierCode" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gacha_prize_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "referralLinkId" TEXT NOT NULL,
    "referralLink" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_histories" (
    "id" SERIAL NOT NULL,
    "referralId" INTEGER NOT NULL,
    "referralLinkId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "isFraudDetected" BOOLEAN NOT NULL DEFAULT false,
    "fraudReason" TEXT,
    "isBotDetected" BOOLEAN NOT NULL DEFAULT false,
    "botDetectionReason" TEXT,
    "metadata" TEXT,
    "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_users" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "referralId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "additionalRewardGranted" BOOLEAN NOT NULL DEFAULT false,
    "additionalRewardGrantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referee_activities" (
    "id" SERIAL NOT NULL,
    "referralUserId" INTEGER NOT NULL,
    "gachaCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referee_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "free_gacha_histories" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "referralUserId" INTEGER,
    "gachaTypeId" INTEGER NOT NULL,
    "grantType" "FreeGachaGrantType" NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_gacha_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_histories" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionType" "PointTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL DEFAULT 0,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "stripePaymentId" TEXT,
    "purchaseLogId" INTEGER,
    "gachaHistoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_purchase_logs" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "providerPaymentIntentId" TEXT NOT NULL,
    "amountYen" INTEGER NOT NULL,
    "planId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCEEDED',
    "errorMessage" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_purchase_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_action_histories" (
    "id" SERIAL NOT NULL,
    "actionType" TEXT NOT NULL,
    "adminUserId" TEXT,
    "adminName" TEXT,
    "targetUserId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetUserIds" JSONB,

    CONSTRAINT "admin_action_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_assets" (
    "id" SERIAL NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_asset_categories" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "category" "VideoCategoryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prize_tiers" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prize_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gacha_tier_weights" (
    "id" SERIAL NOT NULL,
    "gachaTypeId" INTEGER NOT NULL,
    "tierCode" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gacha_tier_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_point_balances" (
    "userId" TEXT NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "freeAmount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_point_balances_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "point_purchase_plans" (
    "id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "bonusFreePoints" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_purchase_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tags" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "default_gacha_video_settings" (
    "id" SERIAL NOT NULL,
    "commonVideoAssetIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "tierVideoAssetIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_gacha_video_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_message_templates" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "result_message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "free_gacha_settings" (
    "id" SERIAL NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "grantOnReferralComplete" BOOLEAN NOT NULL DEFAULT true,
    "referrerGachaTypeId" INTEGER,
    "refereeGachaTypeId" INTEGER,
    "expirationDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_gacha_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_userId_key" ON "users"("userId");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "gacha_items_isActive_idx" ON "gacha_items"("isActive");

-- CreateIndex
CREATE INDEX "gacha_items_useStartAt_idx" ON "gacha_items"("useStartAt");

-- CreateIndex
CREATE INDEX "gacha_items_useEndAt_idx" ON "gacha_items"("useEndAt");

-- CreateIndex
CREATE UNIQUE INDEX "gacha_types_code_key" ON "gacha_types"("code");

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
CREATE INDEX "gacha_histories_tierCode_idx" ON "gacha_histories"("tierCode");

-- CreateIndex
CREATE UNIQUE INDEX "item_usage_logs_gachaHistoryId_key" ON "item_usage_logs"("gachaHistoryId");

-- CreateIndex
CREATE INDEX "item_usage_logs_usedAt_idx" ON "item_usage_logs"("usedAt");

-- CreateIndex
CREATE INDEX "gacha_prize_assignments_gachaTypeId_tierCode_isActive_idx" ON "gacha_prize_assignments"("gachaTypeId", "tierCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "gacha_prize_assignments_gachaTypeId_tierCode_itemId_key" ON "gacha_prize_assignments"("gachaTypeId", "tierCode", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_userId_key" ON "referrals"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referralLinkId_key" ON "referrals"("referralLinkId");

-- CreateIndex
CREATE INDEX "referrals_userId_idx" ON "referrals"("userId");

-- CreateIndex
CREATE INDEX "referrals_referralLinkId_idx" ON "referrals"("referralLinkId");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "referral_histories_referralId_referredAt_idx" ON "referral_histories"("referralId", "referredAt");

-- CreateIndex
CREATE INDEX "referral_histories_referralLinkId_idx" ON "referral_histories"("referralLinkId");

-- CreateIndex
CREATE INDEX "referral_histories_ipAddress_referredAt_idx" ON "referral_histories"("ipAddress", "referredAt");

-- CreateIndex
CREATE INDEX "referral_histories_status_idx" ON "referral_histories"("status");

-- CreateIndex
CREATE INDEX "referral_histories_isBotDetected_idx" ON "referral_histories"("isBotDetected");

-- CreateIndex
CREATE INDEX "referral_histories_isFraudDetected_idx" ON "referral_histories"("isFraudDetected");

-- CreateIndex
CREATE INDEX "referral_users_userId_completedAt_idx" ON "referral_users"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "referral_users_toUserId_idx" ON "referral_users"("toUserId");

-- CreateIndex
CREATE INDEX "referral_users_referralId_idx" ON "referral_users"("referralId");

-- CreateIndex
CREATE INDEX "referral_users_additionalRewardGranted_idx" ON "referral_users"("additionalRewardGranted");

-- CreateIndex
CREATE UNIQUE INDEX "referral_users_userId_toUserId_key" ON "referral_users"("userId", "toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "referee_activities_referralUserId_key" ON "referee_activities"("referralUserId");

-- CreateIndex
CREATE INDEX "referee_activities_referralUserId_idx" ON "referee_activities"("referralUserId");

-- CreateIndex
CREATE INDEX "free_gacha_histories_userId_isUsed_idx" ON "free_gacha_histories"("userId", "isUsed");

-- CreateIndex
CREATE INDEX "free_gacha_histories_referralUserId_idx" ON "free_gacha_histories"("referralUserId");

-- CreateIndex
CREATE INDEX "free_gacha_histories_expiresAt_idx" ON "free_gacha_histories"("expiresAt");

-- CreateIndex
CREATE INDEX "free_gacha_histories_gachaTypeId_idx" ON "free_gacha_histories"("gachaTypeId");

-- CreateIndex
CREATE INDEX "point_histories_userId_createdAt_idx" ON "point_histories"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "point_histories_transactionType_idx" ON "point_histories"("transactionType");

-- CreateIndex
CREATE INDEX "point_histories_stripePaymentId_idx" ON "point_histories"("stripePaymentId");

-- CreateIndex
CREATE INDEX "point_histories_gachaHistoryId_idx" ON "point_histories"("gachaHistoryId");

-- CreateIndex
CREATE UNIQUE INDEX "point_purchase_logs_providerPaymentIntentId_key" ON "point_purchase_logs"("providerPaymentIntentId");

-- CreateIndex
CREATE INDEX "point_purchase_logs_userId_createdAt_idx" ON "point_purchase_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "point_purchase_logs_provider_status_idx" ON "point_purchase_logs"("provider", "status");

-- CreateIndex
CREATE INDEX "admin_action_histories_actionType_idx" ON "admin_action_histories"("actionType");

-- CreateIndex
CREATE INDEX "admin_action_histories_adminUserId_idx" ON "admin_action_histories"("adminUserId");

-- CreateIndex
CREATE INDEX "admin_action_histories_createdAt_idx" ON "admin_action_histories"("createdAt");

-- CreateIndex
CREATE INDEX "admin_action_histories_targetUserId_idx" ON "admin_action_histories"("targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "video_assets_s3Key_key" ON "video_assets"("s3Key");

-- CreateIndex
CREATE INDEX "video_assets_isActive_idx" ON "video_assets"("isActive");

-- CreateIndex
CREATE INDEX "video_asset_categories_category_idx" ON "video_asset_categories"("category");

-- CreateIndex
CREATE UNIQUE INDEX "video_asset_categories_assetId_category_key" ON "video_asset_categories"("assetId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "prize_tiers_code_key" ON "prize_tiers"("code");

-- CreateIndex
CREATE INDEX "prize_tiers_isActive_displayOrder_idx" ON "prize_tiers"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "gacha_tier_weights_gachaTypeId_isActive_idx" ON "gacha_tier_weights"("gachaTypeId", "isActive");

-- CreateIndex
CREATE INDEX "gacha_tier_weights_gachaTypeId_displayOrder_idx" ON "gacha_tier_weights"("gachaTypeId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "gacha_tier_weights_gachaTypeId_tierCode_key" ON "gacha_tier_weights"("gachaTypeId", "tierCode");

-- CreateIndex
CREATE INDEX "user_point_balances_expiresAt_idx" ON "user_point_balances"("expiresAt");

-- CreateIndex
CREATE INDEX "point_purchase_plans_isActive_displayOrder_idx" ON "point_purchase_plans"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "point_purchase_plans_displayOrder_idx" ON "point_purchase_plans"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE INDEX "user_tags_tagId_idx" ON "user_tags"("tagId");

-- CreateIndex
CREATE INDEX "user_tags_userId_idx" ON "user_tags"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_tags_userId_tagId_key" ON "user_tags"("userId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "result_message_templates_code_key" ON "result_message_templates"("code");

-- CreateIndex
CREATE INDEX "result_message_templates_isActive_idx" ON "result_message_templates"("isActive");

-- AddForeignKey
ALTER TABLE "gacha_types" ADD CONSTRAINT "gacha_types_resultMessageTemplateId_fkey" FOREIGN KEY ("resultMessageTemplateId") REFERENCES "result_message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_histories" ADD CONSTRAINT "gacha_histories_gachaTypeId_fkey" FOREIGN KEY ("gachaTypeId") REFERENCES "gacha_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_histories" ADD CONSTRAINT "gacha_histories_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "gacha_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_histories" ADD CONSTRAINT "gacha_histories_tierCode_fkey" FOREIGN KEY ("tierCode") REFERENCES "prize_tiers"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_histories" ADD CONSTRAINT "gacha_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_usage_logs" ADD CONSTRAINT "item_usage_logs_gachaHistoryId_fkey" FOREIGN KEY ("gachaHistoryId") REFERENCES "gacha_histories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_prize_assignments" ADD CONSTRAINT "gacha_prize_assignments_gachaTypeId_fkey" FOREIGN KEY ("gachaTypeId") REFERENCES "gacha_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_prize_assignments" ADD CONSTRAINT "gacha_prize_assignments_tierCode_fkey" FOREIGN KEY ("tierCode") REFERENCES "prize_tiers"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_prize_assignments" ADD CONSTRAINT "gacha_prize_assignments_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "gacha_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_histories" ADD CONSTRAINT "referral_histories_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_users" ADD CONSTRAINT "referral_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_users" ADD CONSTRAINT "referral_users_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_users" ADD CONSTRAINT "referral_users_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referee_activities" ADD CONSTRAINT "referee_activities_referralUserId_fkey" FOREIGN KEY ("referralUserId") REFERENCES "referral_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_gacha_histories" ADD CONSTRAINT "free_gacha_histories_referralUserId_fkey" FOREIGN KEY ("referralUserId") REFERENCES "referral_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_gacha_histories" ADD CONSTRAINT "free_gacha_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_gacha_histories" ADD CONSTRAINT "free_gacha_histories_gachaTypeId_fkey" FOREIGN KEY ("gachaTypeId") REFERENCES "gacha_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_gachaHistoryId_fkey" FOREIGN KEY ("gachaHistoryId") REFERENCES "gacha_histories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_purchaseLogId_fkey" FOREIGN KEY ("purchaseLogId") REFERENCES "point_purchase_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_purchase_logs" ADD CONSTRAINT "point_purchase_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_asset_categories" ADD CONSTRAINT "video_asset_categories_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "video_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_tier_weights" ADD CONSTRAINT "gacha_tier_weights_gachaTypeId_fkey" FOREIGN KEY ("gachaTypeId") REFERENCES "gacha_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_tier_weights" ADD CONSTRAINT "gacha_tier_weights_tierCode_fkey" FOREIGN KEY ("tierCode") REFERENCES "prize_tiers"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_point_balances" ADD CONSTRAINT "user_point_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_gacha_settings" ADD CONSTRAINT "free_gacha_settings_referrerGachaTypeId_fkey" FOREIGN KEY ("referrerGachaTypeId") REFERENCES "gacha_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_gacha_settings" ADD CONSTRAINT "free_gacha_settings_refereeGachaTypeId_fkey" FOREIGN KEY ("refereeGachaTypeId") REFERENCES "gacha_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

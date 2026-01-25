-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'INVALID', 'FRAUD');

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

-- CreateEnum
CREATE TYPE "UserItemStatus" AS ENUM ('UNUSED', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PrizeRewardType" AS ENUM ('ITEM', 'POINTS');

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
    "prizeWeights" JSONB,
    "prizeHands" JSONB,
    "prizeOrder" JSONB,
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
    "itemId" INTEGER,
    "tierCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pointsUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "gacha_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_usage_logs" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "userItemId" INTEGER,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_items" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "gachaHistoryId" INTEGER,
    "status" "UserItemStatus" NOT NULL DEFAULT 'UNUSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gacha_prize_assignments" (
    "id" SERIAL NOT NULL,
    "gachaTypeId" INTEGER NOT NULL,
    "tierCode" TEXT NOT NULL,
    "itemId" INTEGER,
    "rewardType" "PrizeRewardType" NOT NULL DEFAULT 'ITEM',
    "points" INTEGER NOT NULL DEFAULT 0,
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
    "expiresAt" TIMESTAMP(3),
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
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "additionalRewardGranted" BOOLEAN NOT NULL DEFAULT false,
    "additionalRewardGrantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "gachaCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referralUserId" INTEGER,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
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
    "historyTable" TEXT,
    "historyTableId" INTEGER,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "paymentSucceededAt" TIMESTAMP(3),
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
    "adminUserId" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "freeAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_point_balances_pkey" PRIMARY KEY ("id")
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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantOnReferralComplete" BOOLEAN NOT NULL DEFAULT true,
    "referrerGachaTypeId" INTEGER,
    "refereeGachaTypeId" INTEGER,
    "expirationDays" INTEGER,
    "referrerPoints" INTEGER NOT NULL DEFAULT 100,
    "refereePoints" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_gacha_settings_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "app_settings" (
    "id" SERIAL NOT NULL,
    "pickupGachaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "gacha_types_isActive_startAt_endAt_idx" ON "gacha_types"("isActive", "startAt", "endAt");

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
CREATE UNIQUE INDEX "item_usage_logs_userItemId_key" ON "item_usage_logs"("userItemId");

-- CreateIndex
CREATE INDEX "item_usage_logs_userId_usedAt_idx" ON "item_usage_logs"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "item_usage_logs_itemId_idx" ON "item_usage_logs"("itemId");

-- CreateIndex
CREATE INDEX "item_usage_logs_userItemId_idx" ON "item_usage_logs"("userItemId");

-- CreateIndex
CREATE INDEX "item_usage_logs_usedAt_idx" ON "item_usage_logs"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_items_gachaHistoryId_key" ON "user_items"("gachaHistoryId");

-- CreateIndex
CREATE INDEX "user_items_userId_status_idx" ON "user_items"("userId", "status");

-- CreateIndex
CREATE INDEX "user_items_userId_itemId_idx" ON "user_items"("userId", "itemId");

-- CreateIndex
CREATE INDEX "user_items_gachaHistoryId_idx" ON "user_items"("gachaHistoryId");

-- CreateIndex
CREATE INDEX "user_items_itemId_idx" ON "user_items"("itemId");

-- CreateIndex
CREATE INDEX "gacha_prize_assignments_gachaTypeId_tierCode_isActive_idx" ON "gacha_prize_assignments"("gachaTypeId", "tierCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "gacha_prize_assignments_gachaTypeId_tierCode_itemId_key" ON "gacha_prize_assignments"("gachaTypeId", "tierCode", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referralLinkId_key" ON "referrals"("referralLinkId");

-- CreateIndex
CREATE INDEX "referrals_userId_idx" ON "referrals"("userId");

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
CREATE INDEX "referral_users_additionalRewardGranted_idx" ON "referral_users"("additionalRewardGranted");

-- CreateIndex
CREATE UNIQUE INDEX "referral_users_userId_toUserId_key" ON "referral_users"("userId", "toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_activities_userId_key" ON "user_activities"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_activities_referralUserId_key" ON "user_activities"("referralUserId");

-- CreateIndex
CREATE INDEX "user_activities_userId_idx" ON "user_activities"("userId");

-- CreateIndex
CREATE INDEX "point_histories_userId_createdAt_idx" ON "point_histories"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "point_histories_transactionType_idx" ON "point_histories"("transactionType");

-- CreateIndex
CREATE INDEX "point_histories_historyTable_historyTableId_idx" ON "point_histories"("historyTable", "historyTableId");

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
CREATE UNIQUE INDEX "user_point_balances_userId_key" ON "user_point_balances"("userId");

-- CreateIndex
CREATE INDEX "user_point_balances_userId_idx" ON "user_point_balances"("userId");

-- CreateIndex
CREATE INDEX "point_purchase_plans_isActive_displayOrder_idx" ON "point_purchase_plans"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "point_purchase_plans_displayOrder_idx" ON "point_purchase_plans"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "user_tags_tagId_userId_idx" ON "user_tags"("tagId", "userId");

-- CreateIndex
CREATE INDEX "user_tags_userId_idx" ON "user_tags"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_tags_userId_tagId_key" ON "user_tags"("userId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "result_message_templates_code_key" ON "result_message_templates"("code");

-- CreateIndex
CREATE INDEX "result_message_templates_isActive_idx" ON "result_message_templates"("isActive");

-- CreateIndex
CREATE INDEX "message_queues_userId_isSent_type_idx" ON "message_queues"("userId", "isSent", "type");

-- CreateIndex
CREATE INDEX "message_queues_userId_createdAt_idx" ON "message_queues"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "message_queues_isSent_type_idx" ON "message_queues"("isSent", "type");

-- AddForeignKey
ALTER TABLE "gacha_types" ADD CONSTRAINT "gacha_types_resultMessageTemplateId_fkey" FOREIGN KEY ("resultMessageTemplateId") REFERENCES "result_message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_histories" ADD CONSTRAINT "gacha_histories_gachaTypeId_fkey" FOREIGN KEY ("gachaTypeId") REFERENCES "gacha_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_histories" ADD CONSTRAINT "gacha_histories_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "gacha_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_histories" ADD CONSTRAINT "gacha_histories_tierCode_fkey" FOREIGN KEY ("tierCode") REFERENCES "prize_tiers"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_usage_logs" ADD CONSTRAINT "item_usage_logs_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "gacha_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_usage_logs" ADD CONSTRAINT "item_usage_logs_userItemId_fkey" FOREIGN KEY ("userItemId") REFERENCES "user_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "gacha_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_gachaHistoryId_fkey" FOREIGN KEY ("gachaHistoryId") REFERENCES "gacha_histories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_prize_assignments" ADD CONSTRAINT "gacha_prize_assignments_gachaTypeId_fkey" FOREIGN KEY ("gachaTypeId") REFERENCES "gacha_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_prize_assignments" ADD CONSTRAINT "gacha_prize_assignments_tierCode_fkey" FOREIGN KEY ("tierCode") REFERENCES "prize_tiers"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_prize_assignments" ADD CONSTRAINT "gacha_prize_assignments_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "gacha_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_asset_categories" ADD CONSTRAINT "video_asset_categories_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "video_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_tier_weights" ADD CONSTRAINT "gacha_tier_weights_gachaTypeId_fkey" FOREIGN KEY ("gachaTypeId") REFERENCES "gacha_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_tier_weights" ADD CONSTRAINT "gacha_tier_weights_tierCode_fkey" FOREIGN KEY ("tierCode") REFERENCES "prize_tiers"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_gacha_settings" ADD CONSTRAINT "free_gacha_settings_referrerGachaTypeId_fkey" FOREIGN KEY ("referrerGachaTypeId") REFERENCES "gacha_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_gacha_settings" ADD CONSTRAINT "free_gacha_settings_refereeGachaTypeId_fkey" FOREIGN KEY ("refereeGachaTypeId") REFERENCES "gacha_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_pickupGachaId_fkey" FOREIGN KEY ("pickupGachaId") REFERENCES "gacha_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

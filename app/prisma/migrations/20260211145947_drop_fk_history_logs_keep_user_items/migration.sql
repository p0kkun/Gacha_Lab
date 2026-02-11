-- DropForeignKey
ALTER TABLE "gacha_histories" DROP CONSTRAINT "gacha_histories_gachaTypeId_fkey";

-- DropForeignKey
ALTER TABLE "gacha_histories" DROP CONSTRAINT "gacha_histories_itemId_fkey";

-- DropForeignKey
ALTER TABLE "gacha_histories" DROP CONSTRAINT "gacha_histories_tierCode_fkey";

-- DropForeignKey
ALTER TABLE "item_usage_logs" DROP CONSTRAINT "item_usage_logs_itemId_fkey";

-- DropForeignKey
ALTER TABLE "item_usage_logs" DROP CONSTRAINT "item_usage_logs_userItemId_fkey";

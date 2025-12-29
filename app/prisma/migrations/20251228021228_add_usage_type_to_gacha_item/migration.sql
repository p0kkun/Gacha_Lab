-- CreateEnum
CREATE TYPE "ItemUsageType" AS ENUM ('QR_CODE', 'SHOW_TO_STAFF');

-- AlterTable
ALTER TABLE "gacha_items" ADD COLUMN     "usageType" "ItemUsageType" NOT NULL DEFAULT 'QR_CODE';

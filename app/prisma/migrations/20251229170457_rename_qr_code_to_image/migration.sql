/*
  Warnings:

  - The values [QR_CODE] on the enum `ItemUsageType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ItemUsageType_new" AS ENUM ('IMAGE', 'SHOW_TO_STAFF');
ALTER TABLE "public"."gacha_items" ALTER COLUMN "usageType" DROP DEFAULT;
ALTER TABLE "gacha_items" ALTER COLUMN "usageType" TYPE "ItemUsageType_new" USING (
  CASE 
    WHEN "usageType"::text = 'QR_CODE' THEN 'IMAGE'::"ItemUsageType_new"
    WHEN "usageType"::text = 'SHOW_TO_STAFF' THEN 'SHOW_TO_STAFF'::"ItemUsageType_new"
    ELSE 'IMAGE'::"ItemUsageType_new"
  END
);
ALTER TYPE "ItemUsageType" RENAME TO "ItemUsageType_old";
ALTER TYPE "ItemUsageType_new" RENAME TO "ItemUsageType";
DROP TYPE "public"."ItemUsageType_old";
ALTER TABLE "gacha_items" ALTER COLUMN "usageType" SET DEFAULT 'IMAGE';
COMMIT;

-- AlterTable
ALTER TABLE "gacha_items" ALTER COLUMN "usageType" SET DEFAULT 'IMAGE';

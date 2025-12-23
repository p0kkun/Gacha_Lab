/*
  Warnings:

  - You are about to drop the `bsop_charges` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bsop_prize_redemptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bsop_prizes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bsop_setting_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bsop_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bsop_charges" DROP CONSTRAINT "bsop_charges_userId_fkey";

-- DropForeignKey
ALTER TABLE "bsop_prize_redemptions" DROP CONSTRAINT "bsop_prize_redemptions_chargeId_fkey";

-- DropForeignKey
ALTER TABLE "bsop_prize_redemptions" DROP CONSTRAINT "bsop_prize_redemptions_userId_fkey";

-- DropForeignKey
ALTER TABLE "bsop_prizes" DROP CONSTRAINT "bsop_prizes_settingId_fkey";

-- DropForeignKey
ALTER TABLE "bsop_setting_history" DROP CONSTRAINT "bsop_setting_history_settingId_fkey";

-- DropTable
DROP TABLE "bsop_charges";

-- DropTable
DROP TABLE "bsop_prize_redemptions";

-- DropTable
DROP TABLE "bsop_prizes";

-- DropTable
DROP TABLE "bsop_setting_history";

-- DropTable
DROP TABLE "bsop_settings";

-- DropEnum
DROP TYPE "BsopPrizeStatus";

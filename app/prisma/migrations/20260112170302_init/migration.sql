-- AlterTable
ALTER TABLE "free_gacha_settings" ADD COLUMN     "refereePoints" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "referrerPoints" INTEGER NOT NULL DEFAULT 100;

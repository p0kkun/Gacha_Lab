-- CreateEnum
CREATE TYPE "GachaVideoType" AS ENUM ('COMMON', 'RARITY');

-- CreateTable
CREATE TABLE "gacha_videos" (
    "id" SERIAL NOT NULL,
    "videoType" "GachaVideoType" NOT NULL,
    "rarity" "Rarity",
    "s3Key" TEXT NOT NULL,
    "s3Url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gacha_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gacha_videos_videoType_rarity_isActive_idx" ON "gacha_videos"("videoType", "rarity", "isActive");

-- CreateIndex
CREATE INDEX "gacha_videos_isActive_idx" ON "gacha_videos"("isActive");

-- CreateIndex
CREATE INDEX "gacha_videos_displayOrder_idx" ON "gacha_videos"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "gacha_videos_videoType_rarity_s3Key_key" ON "gacha_videos"("videoType", "rarity", "s3Key");

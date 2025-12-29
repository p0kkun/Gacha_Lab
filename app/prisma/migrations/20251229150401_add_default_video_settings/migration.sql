-- AlterTable
ALTER TABLE "gacha_types" ADD COLUMN     "useDefaultVideos" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "default_gacha_video_settings" (
    "id" SERIAL NOT NULL,
    "commonVideoIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "rarityVideoIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_gacha_video_settings_pkey" PRIMARY KEY ("id")
);

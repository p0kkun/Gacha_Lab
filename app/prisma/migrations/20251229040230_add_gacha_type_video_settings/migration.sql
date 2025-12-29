-- AlterTable
ALTER TABLE "gacha_types" ADD COLUMN     "commonVideoIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "rarityVideoIds" JSONB;

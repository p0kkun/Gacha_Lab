-- AlterTable
ALTER TABLE "gacha_items" ADD COLUMN     "gachaTypeId" TEXT;

-- CreateIndex
CREATE INDEX "gacha_items_gachaTypeId_rarity_isActive_idx" ON "gacha_items"("gachaTypeId", "rarity", "isActive");

-- AddForeignKey
ALTER TABLE "gacha_items" ADD CONSTRAINT "gacha_items_gachaTypeId_fkey" FOREIGN KEY ("gachaTypeId") REFERENCES "gacha_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

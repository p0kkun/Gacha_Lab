-- AlterTable
ALTER TABLE "gacha_items" ADD COLUMN     "useEndAt" TIMESTAMP(3),
ADD COLUMN     "useStartAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "gacha_items_useStartAt_idx" ON "gacha_items"("useStartAt");

-- CreateIndex
CREATE INDEX "gacha_items_useEndAt_idx" ON "gacha_items"("useEndAt");

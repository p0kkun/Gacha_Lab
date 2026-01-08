-- AlterTable
ALTER TABLE "gacha_histories" ADD COLUMN     "rarity" "Rarity";

-- CreateTable
CREATE TABLE "gacha_prize_assignments" (
    "id" SERIAL NOT NULL,
    "gachaTypeId" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "itemId" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gacha_prize_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gacha_prize_assignments_gachaTypeId_rarity_isActive_idx" ON "gacha_prize_assignments"("gachaTypeId", "rarity", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "gacha_prize_assignments_gachaTypeId_rarity_itemId_key" ON "gacha_prize_assignments"("gachaTypeId", "rarity", "itemId");

-- CreateIndex
CREATE INDEX "gacha_histories_rarity_idx" ON "gacha_histories"("rarity");

-- AddForeignKey
ALTER TABLE "gacha_prize_assignments" ADD CONSTRAINT "gacha_prize_assignments_gachaTypeId_fkey" FOREIGN KEY ("gachaTypeId") REFERENCES "gacha_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gacha_prize_assignments" ADD CONSTRAINT "gacha_prize_assignments_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "gacha_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

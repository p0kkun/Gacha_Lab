-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('PURCHASE', 'CONSUME', 'GRANT', 'REFUND');

-- AlterTable
ALTER TABLE "gacha_histories" ADD COLUMN     "pointsUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "gacha_types" ADD COLUMN     "pointCost" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "point_histories" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionType" "PointTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "stripePaymentId" TEXT,
    "gachaHistoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "point_histories_userId_createdAt_idx" ON "point_histories"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "point_histories_transactionType_idx" ON "point_histories"("transactionType");

-- CreateIndex
CREATE INDEX "point_histories_stripePaymentId_idx" ON "point_histories"("stripePaymentId");

-- CreateIndex
CREATE INDEX "point_histories_gachaHistoryId_idx" ON "point_histories"("gachaHistoryId");

-- CreateIndex
CREATE INDEX "users_points_idx" ON "users"("points");

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_histories" ADD CONSTRAINT "point_histories_gachaHistoryId_fkey" FOREIGN KEY ("gachaHistoryId") REFERENCES "gacha_histories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PointType" AS ENUM ('PAID', 'FREE');

-- AlterEnum
ALTER TYPE "PointTransactionType" ADD VALUE 'REFERRAL_REWARD';

-- CreateTable
CREATE TABLE "point_balances" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "pointType" "PointType" NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "point_balances_userId_idx" ON "point_balances"("userId");

-- CreateIndex
CREATE INDEX "point_balances_expiresAt_idx" ON "point_balances"("expiresAt");

-- CreateIndex
CREATE INDEX "point_balances_pointType_idx" ON "point_balances"("pointType");

-- CreateIndex
CREATE UNIQUE INDEX "point_balances_userId_pointType_key" ON "point_balances"("userId", "pointType");

-- AddForeignKey
ALTER TABLE "point_balances" ADD CONSTRAINT "point_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

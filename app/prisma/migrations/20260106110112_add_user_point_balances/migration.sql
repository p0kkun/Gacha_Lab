-- CreateTable
CREATE TABLE "user_point_balances" (
    "userId" TEXT NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "freeAmount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_point_balances_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "user_point_balances_expiresAt_idx" ON "user_point_balances"("expiresAt");

-- AddForeignKey
ALTER TABLE "user_point_balances" ADD CONSTRAINT "user_point_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

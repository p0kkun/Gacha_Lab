-- AlterTable
ALTER TABLE "referral_histories" ADD COLUMN     "refereeUserId" TEXT,
ADD COLUMN     "referrerUserId" TEXT;

-- CreateIndex
CREATE INDEX "referral_histories_referrerUserId_referredAt_idx" ON "referral_histories"("referrerUserId", "referredAt");

-- CreateIndex
CREATE INDEX "referral_histories_refereeUserId_referredAt_idx" ON "referral_histories"("refereeUserId", "referredAt");

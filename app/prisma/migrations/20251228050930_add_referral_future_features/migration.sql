-- AlterTable
ALTER TABLE "referral_histories" ADD COLUMN     "additionalRewardGranted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "additionalRewardGrantedAt" TIMESTAMP(3),
ADD COLUMN     "botDetectionReason" TEXT,
ADD COLUMN     "isBotDetected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "refereeGachaCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refereeLastActiveAt" TIMESTAMP(3),
ADD COLUMN     "refereeTotalSpent" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "referral_histories_isFraudDetected_idx" ON "referral_histories"("isFraudDetected");

-- CreateIndex
CREATE INDEX "referral_histories_isBotDetected_idx" ON "referral_histories"("isBotDetected");

-- CreateIndex
CREATE INDEX "referral_histories_additionalRewardGranted_idx" ON "referral_histories"("additionalRewardGranted");

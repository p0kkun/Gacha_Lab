-- CreateIndex
CREATE INDEX "gacha_histories_usedAt_idx" ON "gacha_histories"("usedAt");

-- CreateIndex
CREATE INDEX "gacha_histories_userId_usedAt_idx" ON "gacha_histories"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "point_balances_expiresAt_amount_idx" ON "point_balances"("expiresAt", "amount");

-- CreateIndex
CREATE INDEX "point_balances_userId_expiresAt_idx" ON "point_balances"("userId", "expiresAt");

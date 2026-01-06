import { PointType, PointTransactionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function calcUnifiedExpiry(from: Date): Date {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

async function ensureUserPointBalance(userId: string) {
  const existing = await prisma.userPointBalance.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return await prisma.userPointBalance.create({
    data: { userId, paidAmount: 0, freeAmount: 0, expiresAt: null },
  });
}

/**
 * ポイント残高を取得（有効期限切れを考慮）
 */
export async function getPointBalances(userId: string) {
  await ensureUserPointBalance(userId);
  // 有効期限切れのポイントを0に更新
  await expirePoints(userId);

  const balance = await prisma.userPointBalance.findUnique({ where: { userId } });
  const paid = balance?.paidAmount ?? 0;
  const free = balance?.freeAmount ?? 0;

  return {
    paid,
    free,
    total: paid + free,
    // 後方互換のため paid/free それぞれ返すが、値は同一
    paidExpiresAt: balance?.expiresAt ?? null,
    freeExpiresAt: balance?.expiresAt ?? null,
    lastUpdated: balance?.lastUpdated ?? null,
  };
}

/**
 * 有効期限切れのポイントを0に更新
 */
async function expirePoints(userId: string) {
  const now = new Date();
  const balance = await prisma.userPointBalance.findUnique({ where: { userId } });
  if (!balance) return;

  const shouldExpire =
    (balance.paidAmount + balance.freeAmount) > 0 &&
    balance.expiresAt &&
    balance.expiresAt <= now;
  if (!shouldExpire) return;

  await prisma.userPointBalance.update({
    where: { userId },
    data: {
      paidAmount: 0,
      freeAmount: 0,
      expiresAt: null,
      // lastUpdatedは上書きしない（表示用）
    },
  });
}

/**
 * ポイントを付与（有償ポイント）
 * @param userId ユーザーID
 * @param amount ポイント数
 * @param expiresAt 有効期限（nullの場合は最終更新日から1年後）
 * @param description 説明
 * @param stripePaymentId Stripe決済ID（購入の場合）
 */
export async function grantPaidPoints(
  userId: string,
  amount: number,
  // NOTE: 互換性のため残すが、要件により expiresAt は常に「最終更新日から1年後」で統一する
  expiresAt: Date | null = null,
  description: string = 'ポイント購入',
  stripePaymentId?: string
) {
  if (amount <= 0) {
    throw new Error('ポイント数は1以上である必要があります');
  }

  // 要件: 有償/無償合計で「最終更新日から1年後」に両方が同時に失効
  // （有償/無償の切り分け・表示は維持）
  const now = new Date();
  const unifiedExpiresAt = calcUnifiedExpiry(now);

  return await prisma.$transaction(async (tx) => {
    // 残高行を確実に作成
    const existing = await tx.userPointBalance.findUnique({ where: { userId } });
    if (!existing) {
      await tx.userPointBalance.create({
        data: { userId, paidAmount: 0, freeAmount: 0, expiresAt: null, lastUpdated: now },
      });
    }

    // PAIDを加算し、有効期限/最終更新を更新
    const updatedBalance = await tx.userPointBalance.update({
      where: { userId },
      data: {
        paidAmount: { increment: amount },
        expiresAt: unifiedExpiresAt,
        lastUpdated: now,
      },
    });

    // User.pointsへの更新は停止（PointBalanceのみで管理）
    // const totalBalances = await getTotalBalances(tx, userId);
    // await tx.user.update({
    //   where: { userId },
    //   data: { points: totalBalances },
    // });

    // ポイント履歴を記録
    const totalBalances = await getTotalBalances(tx, userId);
    await tx.pointHistory.create({
      data: {
        userId,
        transactionType: PointTransactionType.PURCHASE,
        amount,
        balanceAfter: totalBalances,
        description,
        stripePaymentId,
      },
    });

    return updatedBalance;
  });
}

/**
 * ポイントを付与（無償ポイント）
 * @param userId ユーザーID
 * @param amount ポイント数
 * @param expiresAt 有効期限（nullの場合は最終更新日から1年後）
 * @param description 説明
 * @param transactionType 取引タイプ（GRANT または REFERRAL_REWARD）
 */
export async function grantFreePoints(
  userId: string,
  amount: number,
  // NOTE: 互換性のため残すが、要件により expiresAt は常に「最終更新日から1年後」で統一する
  expiresAt: Date | null = null,
  description: string = 'ポイント付与',
  transactionType: PointTransactionType = PointTransactionType.GRANT
) {
  if (amount <= 0) {
    throw new Error('ポイント数は1以上である必要があります');
  }

  const now = new Date();
  const unifiedExpiresAt = calcUnifiedExpiry(now);

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.userPointBalance.findUnique({ where: { userId } });
    if (!existing) {
      await tx.userPointBalance.create({
        data: { userId, paidAmount: 0, freeAmount: 0, expiresAt: null, lastUpdated: now },
      });
    }

    const updatedBalance = await tx.userPointBalance.update({
      where: { userId },
      data: {
        freeAmount: { increment: amount },
        expiresAt: unifiedExpiresAt,
        lastUpdated: now,
      },
    });

    // User.pointsへの更新は停止（PointBalanceのみで管理）
    // const totalBalances = await getTotalBalances(tx, userId);
    // await tx.user.update({
    //   where: { userId },
    //   data: { points: totalBalances },
    // });

    // ポイント履歴を記録
    const totalBalances = await getTotalBalances(tx, userId);
    await tx.pointHistory.create({
      data: {
        userId,
        transactionType,
        amount,
        balanceAfter: totalBalances,
        description,
      },
    });

    return updatedBalance;
  });
}

/**
 * ポイントを消費（無償ポイントから優先的に消費）
 * @param userId ユーザーID
 * @param amount 消費ポイント数
 * @param description 説明
 * @param gachaHistoryId ガチャ履歴ID（消費の場合）
 */
export async function consumePoints(
  userId: string,
  amount: number,
  description: string = 'ポイント消費',
  gachaHistoryId?: number
) {
  if (amount <= 0) {
    throw new Error('消費ポイント数は1以上である必要があります');
  }

  return await prisma.$transaction(async (tx) => {
    const now = new Date();
    const unifiedExpiresAt = calcUnifiedExpiry(now);

    const existing = await tx.userPointBalance.findUnique({ where: { userId } });
    if (!existing) {
      await tx.userPointBalance.create({
        data: { userId, paidAmount: 0, freeAmount: 0, expiresAt: null, lastUpdated: now },
      });
    }

    // 有効期限切れなら同時に0へ（lastUpdatedは上書きしない）
    const before = await tx.userPointBalance.findUnique({ where: { userId } });
    if (
      before &&
      (before.paidAmount + before.freeAmount) > 0 &&
      before.expiresAt &&
      before.expiresAt <= now
    ) {
      await tx.userPointBalance.update({
        where: { userId },
        data: { paidAmount: 0, freeAmount: 0, expiresAt: null },
      });
    }

    const balance = await tx.userPointBalance.findUnique({ where: { userId } });
    const freeAmount = balance?.freeAmount ?? 0;
    const paidAmount = balance?.paidAmount ?? 0;
    const totalAmount = freeAmount + paidAmount;

    if (totalAmount < amount) {
      throw new Error('ポイントが不足しています');
    }

    const consumeFromFree = Math.min(freeAmount, amount);
    const remaining = amount - consumeFromFree;
    const consumeFromPaid = remaining;

    const newFree = freeAmount - consumeFromFree;
    const newPaid = paidAmount - consumeFromPaid;
    const newTotal = newFree + newPaid;

    await tx.userPointBalance.update({
      where: { userId },
      data: {
        freeAmount: newFree,
        paidAmount: newPaid,
        expiresAt: newTotal > 0 ? unifiedExpiresAt : null,
        lastUpdated: now,
      },
    });

    // User.pointsへの更新は停止（PointBalanceのみで管理）
    // const totalBalances = await getTotalBalances(tx, userId);
    // await tx.user.update({
    //   where: { userId },
    //   data: { points: totalBalances },
    // });

    // ポイント履歴を記録
    const totalBalances = await getTotalBalances(tx, userId);
    await tx.pointHistory.create({
      data: {
        userId,
        transactionType: PointTransactionType.CONSUME,
        amount: -amount,
        balanceAfter: totalBalances,
        description,
        gachaHistoryId,
      },
    });

    return totalBalances;
  });
}

/**
 * 合計ポイント残高を取得（内部用）
 */
async function getTotalBalances(tx: any, userId: string): Promise<number> {
  const b = await tx.userPointBalance.findUnique({ where: { userId } });
  return (b?.freeAmount ?? 0) + (b?.paidAmount ?? 0);
}


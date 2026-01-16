import { PointTransactionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { deleteCache } from './cache';

async function ensureUserPointBalance(userId: string) {
  const existing = await prisma.userPointBalance.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return await prisma.userPointBalance.create({
    data: { userId, paidAmount: 0, freeAmount: 0 },
  });
}

/**
 * ポイント残高を取得（有効期限切れを考慮）
 * 有効期限は updatedAt + 1年で計算される
 */
export async function getPointBalances(userId: string) {
  await ensureUserPointBalance(userId);
  // 有効期限切れのポイントを0に更新
  const wasUpdated = await expirePoints(userId);

  // 有効期限切れポイントが更新された場合、キャッシュを削除
  if (wasUpdated) {
    await deleteCache(`point-balance:${userId}`);
  }

  const balance = await prisma.userPointBalance.findUnique({ where: { userId } });
  const paid = balance?.paidAmount ?? 0;
  const free = balance?.freeAmount ?? 0;

  // 有効期限は updatedAt + 1年で計算
  const expiresAt = balance?.updatedAt 
    ? new Date(balance.updatedAt.getTime() + 365 * 24 * 60 * 60 * 1000)
    : null;

  return {
    paid,
    free,
    total: paid + free,
    // 有償・無償ともに同じ有効期限（updatedAt + 1年）
    paidExpiresAt: expiresAt?.toISOString() ?? null,
    freeExpiresAt: expiresAt?.toISOString() ?? null,
    lastUpdated: balance?.updatedAt ?? null,
  };
}

/**
 * 有効期限切れのポイントを0に更新
 * 注意: スキーマにexpiresAtフィールドがないため、この機能は無効化されています
 * @returns 更新があった場合true、更新がなかった場合false
 */
async function expirePoints(userId: string): Promise<boolean> {
  // スキーマにexpiresAtフィールドがないため、何もしない
  return false;
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
  stripePaymentId?: string,
  purchaseLogId?: number
) {
  if (amount <= 0) {
    throw new Error('ポイント数は1以上である必要があります');
  }

  // updatedAtが自動更新されるため、有効期限は updatedAt + 1年で計算される
  const now = new Date();

  const updatedBalance = await prisma.$transaction(async (tx) => {
    // 残高行を確実に作成
    const existing = await tx.userPointBalance.findUnique({ where: { userId } });
    if (!existing) {
      await tx.userPointBalance.create({
        data: { userId, paidAmount: 0, freeAmount: 0 },
      });
    }

    const beforeTotal = (existing?.paidAmount ?? 0) + (existing?.freeAmount ?? 0);

    // PAIDを加算
    const updatedBalance = await tx.userPointBalance.update({
      where: { userId },
      data: {
        paidAmount: { increment: amount },
      },
    });

    // User.pointsへの更新は停止（PointBalanceのみで管理）
    // const totalBalances = await getTotalBalances(tx, userId);
    // await tx.user.update({
    //   where: { userId },
    //   data: { points: totalBalances },
    // });

    // ポイント履歴を記録
    const totalBalances =
      (updatedBalance.paidAmount ?? 0) + (updatedBalance.freeAmount ?? 0);
    await tx.pointHistory.create({
      data: {
        userId,
        transactionType: PointTransactionType.PURCHASE,
        amount,
        balanceBefore: beforeTotal,
        balanceAfter: totalBalances,
        description,
        historyTable: purchaseLogId ? 'point_purchase_logs' : null,
        historyTableId: purchaseLogId || null,
      },
    });

    return updatedBalance;
  });

  // トランザクション完了後にキャッシュを削除
  await deleteCache(`point-balance:${userId}`);
  
  return updatedBalance;
}

/**
 * 購入ポイントを付与（有償 + おまけ無償を同時付与、Stripeの重複付与対策）
 *
 * - 1つのPaymentIntentにつき1回のみ付与されることを担保したい
 * - 同一stripePaymentIdでpoint_historiesが存在する場合は二重付与しない
 */
export async function grantPurchasePoints(
  userId: string,
  paidPoints: number,
  bonusFreePoints: number,
  stripePaymentId: string,
  purchaseLogId?: number
) {
  if (!stripePaymentId || stripePaymentId.trim() === "") {
    throw new Error("stripePaymentId が必要です");
  }
  if (paidPoints <= 0) {
    throw new Error("有償ポイント数は1以上である必要があります");
  }
  if (bonusFreePoints < 0) {
    throw new Error("おまけ無償ポイントは0以上である必要があります");
  }

  // updatedAtが自動更新されるため、有効期限は updatedAt + 1年で計算される
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // 既に付与済みなら何もしない（idempotent）
    const existing = purchaseLogId
      ? await tx.pointHistory.findFirst({
          where: {
            historyTable: 'point_purchase_logs',
            historyTableId: purchaseLogId,
          },
          select: { id: true },
        })
      : null;
    if (existing) {
      return { alreadyGranted: true };
    }

    // 残高行を確実に作成
    const balance = await tx.userPointBalance.findUnique({ where: { userId } });
    if (!balance) {
      await tx.userPointBalance.create({
        data: { userId, paidAmount: 0, freeAmount: 0 },
      });
    }

    const before = await tx.userPointBalance.findUnique({ where: { userId } });
    const beforeTotal = (before?.paidAmount ?? 0) + (before?.freeAmount ?? 0);

    // まず有償ポイントを加算（履歴のbefore/afterを正確にする）
    const afterPaid = await tx.userPointBalance.update({
      where: { userId },
      data: {
        paidAmount: { increment: paidPoints },
      },
    });

    const afterPaidTotal = (afterPaid.paidAmount ?? 0) + (afterPaid.freeAmount ?? 0);
    await tx.pointHistory.create({
      data: {
        userId,
        transactionType: PointTransactionType.PURCHASE,
        amount: paidPoints,
        balanceBefore: beforeTotal,
        balanceAfter: afterPaidTotal,
        description: `${paidPoints}ポイント購入`,
        historyTable: purchaseLogId ? 'point_purchase_logs' : null,
        historyTableId: purchaseLogId || null,
      },
    });

    // おまけ（無償）履歴（任意）
    if (bonusFreePoints > 0) {
      const afterBonus = await tx.userPointBalance.update({
        where: { userId },
        data: {
          freeAmount: { increment: bonusFreePoints },
        },
      });
      const afterBonusTotal =
        (afterBonus.paidAmount ?? 0) + (afterBonus.freeAmount ?? 0);
      await tx.pointHistory.create({
        data: {
          userId,
          transactionType: PointTransactionType.GRANT,
          amount: bonusFreePoints,
          balanceBefore: afterPaidTotal,
          balanceAfter: afterBonusTotal,
          description: `購入特典（無償） +${bonusFreePoints}pt`,
          historyTable: purchaseLogId ? 'point_purchase_logs' : null,
          historyTableId: purchaseLogId || null,
        },
      });
    }

    const updatedBalance = await tx.userPointBalance.findUnique({ where: { userId } });
    return { alreadyGranted: false, updatedBalance };
  });

  // トランザクション完了後にキャッシュを削除
  if (!result.alreadyGranted) {
    await deleteCache(`point-balance:${userId}`);
  }
  
  return result;
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

  // updatedAtが自動更新されるため、有効期限は updatedAt + 1年で計算される
  const now = new Date();

  const updatedBalance = await prisma.$transaction(async (tx) => {
    const existing = await tx.userPointBalance.findUnique({ where: { userId } });
    if (!existing) {
      await tx.userPointBalance.create({
        data: { userId, paidAmount: 0, freeAmount: 0 },
      });
    }

    const beforeTotal = (existing?.paidAmount ?? 0) + (existing?.freeAmount ?? 0);

    const updatedBalance = await tx.userPointBalance.update({
      where: { userId },
      data: {
        freeAmount: { increment: amount },
      },
    });

    // User.pointsへの更新は停止（PointBalanceのみで管理）
    // const totalBalances = await getTotalBalances(tx, userId);
    // await tx.user.update({
    //   where: { userId },
    //   data: { points: totalBalances },
    // });

    // ポイント履歴を記録
    const totalBalances =
      (updatedBalance.paidAmount ?? 0) + (updatedBalance.freeAmount ?? 0);
    await tx.pointHistory.create({
      data: {
        userId,
        transactionType,
        amount,
        balanceBefore: beforeTotal,
        balanceAfter: totalBalances,
        description,
      },
    });

    return updatedBalance;
  });

  // トランザクション完了後にキャッシュを削除
  await deleteCache(`point-balance:${userId}`);
  
  return updatedBalance;
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

  const newTotal = await prisma.$transaction(async (tx) => {
    const now = new Date();
    // updatedAtが自動更新されるため、有効期限は updatedAt + 1年で計算される

    const existing = await tx.userPointBalance.findUnique({ where: { userId } });
    if (!existing) {
      await tx.userPointBalance.create({
        data: { userId, paidAmount: 0, freeAmount: 0 },
      });
    }

    const balance = await tx.userPointBalance.findUnique({ where: { userId } });
    const freeAmount = balance?.freeAmount ?? 0;
    const paidAmount = balance?.paidAmount ?? 0;
    const totalAmount = freeAmount + paidAmount;
    const beforeTotal = totalAmount;

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
      },
    });

    // User.pointsへの更新は停止（PointBalanceのみで管理）
    // const totalBalances = await getTotalBalances(tx, userId);
    // await tx.user.update({
    //   where: { userId },
    //   data: { points: totalBalances },
    // });

    // ポイント履歴を記録
    await tx.pointHistory.create({
      data: {
        userId,
        transactionType: PointTransactionType.CONSUME,
        amount: -amount,
        balanceBefore: beforeTotal,
        balanceAfter: newTotal,
        description,
        historyTable: gachaHistoryId ? 'gacha_histories' : null,
        historyTableId: gachaHistoryId || null,
      },
    });

    return newTotal;
  });

  // トランザクション完了後にキャッシュを削除
  await deleteCache(`point-balance:${userId}`);
  
  return newTotal;
}

/**
 * 合計ポイント残高を取得（内部用）
 */
async function getTotalBalances(tx: any, userId: string): Promise<number> {
  const b = await tx.userPointBalance.findUnique({ where: { userId } });
  return (b?.freeAmount ?? 0) + (b?.paidAmount ?? 0);
}


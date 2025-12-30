import { PointType, PointTransactionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * ポイント残高を取得（有効期限切れを考慮）
 */
export async function getPointBalances(userId: string) {
  // 有効期限切れのポイントを0に更新
  await expirePoints(userId);

  const balances = await prisma.pointBalance.findMany({
    where: { userId },
    orderBy: { pointType: 'asc' },
  });

  const paidBalance = balances.find((b) => b.pointType === PointType.PAID);
  const freeBalance = balances.find((b) => b.pointType === PointType.FREE);

  return {
    paid: paidBalance?.amount || 0,
    free: freeBalance?.amount || 0,
    total: (paidBalance?.amount || 0) + (freeBalance?.amount || 0),
    paidExpiresAt: paidBalance?.expiresAt,
    freeExpiresAt: freeBalance?.expiresAt,
    lastUpdated: paidBalance?.lastUpdated || freeBalance?.lastUpdated || null,
  };
}

/**
 * 有効期限切れのポイントを0に更新
 */
async function expirePoints(userId: string) {
  const now = new Date();
  await prisma.pointBalance.updateMany({
    where: {
      userId,
      expiresAt: { lte: now },
      amount: { gt: 0 },
    },
    data: { amount: 0 },
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
  expiresAt: Date | null = null,
  description: string = 'ポイント購入',
  stripePaymentId?: string
) {
  if (amount <= 0) {
    throw new Error('ポイント数は1以上である必要があります');
  }

  // 有効期限が指定されていない場合は、最終更新日から1年後
  if (!expiresAt) {
    expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  return await prisma.$transaction(async (tx) => {
    // 既存の有償ポイント残高を取得または作成
    let balance = await tx.pointBalance.findUnique({
      where: { userId_pointType: { userId, pointType: PointType.PAID } },
    });

    if (!balance) {
      balance = await tx.pointBalance.create({
        data: {
          userId,
          pointType: PointType.PAID,
          amount: 0,
          expiresAt,
          lastUpdated: new Date(),
        },
      });
    }

    // 有効期限を更新（新しいポイントの有効期限に合わせる）
    const newExpiresAt = expiresAt > balance.expiresAt! ? expiresAt : balance.expiresAt;

    // ポイントを追加
    const newAmount = balance.amount + amount;
    const updatedBalance = await tx.pointBalance.update({
      where: { id: balance.id },
      data: {
        amount: newAmount,
        expiresAt: newExpiresAt,
        lastUpdated: new Date(),
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
  expiresAt: Date | null = null,
  description: string = 'ポイント付与',
  transactionType: PointTransactionType = PointTransactionType.GRANT
) {
  if (amount <= 0) {
    throw new Error('ポイント数は1以上である必要があります');
  }

  // 有効期限が指定されていない場合は、最終更新日から1年後
  if (!expiresAt) {
    expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  return await prisma.$transaction(async (tx) => {
    // 既存の無償ポイント残高を取得または作成
    let balance = await tx.pointBalance.findUnique({
      where: { userId_pointType: { userId, pointType: PointType.FREE } },
    });

    if (!balance) {
      balance = await tx.pointBalance.create({
        data: {
          userId,
          pointType: PointType.FREE,
          amount: 0,
          expiresAt,
          lastUpdated: new Date(),
        },
      });
    }

    // 有効期限を更新（新しいポイントの有効期限に合わせる）
    const newExpiresAt = expiresAt > balance.expiresAt! ? expiresAt : balance.expiresAt;

    // ポイントを追加
    const newAmount = balance.amount + amount;
    const updatedBalance = await tx.pointBalance.update({
      where: { id: balance.id },
      data: {
        amount: newAmount,
        expiresAt: newExpiresAt,
        lastUpdated: new Date(),
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
    // 有効期限切れのポイントを0に更新
    const now = new Date();
    await tx.pointBalance.updateMany({
      where: {
        userId,
        expiresAt: { lte: now },
        amount: { gt: 0 },
      },
      data: { amount: 0 },
    });

    // 現在のポイント残高を取得
    const balances = await tx.pointBalance.findMany({
      where: { userId },
    });

    const freeBalance = balances.find((b) => b.pointType === PointType.FREE);
    const paidBalance = balances.find((b) => b.pointType === PointType.PAID);

    const freeAmount = freeBalance?.amount || 0;
    const paidAmount = paidBalance?.amount || 0;
    const totalAmount = freeAmount + paidAmount;

    if (totalAmount < amount) {
      throw new Error('ポイントが不足しています');
    }

    let remainingAmount = amount;
    const nowDate = new Date();

    // 無償ポイントから優先的に消費
    if (freeBalance && freeAmount > 0) {
      const consumeFromFree = Math.min(freeAmount, remainingAmount);
      const newFreeAmount = freeAmount - consumeFromFree;

      // 無償ポイント残高を更新
      await tx.pointBalance.update({
        where: { id: freeBalance.id },
        data: {
          amount: newFreeAmount,
          // 残高が0になったら有効期限をクリア
          expiresAt: newFreeAmount === 0 ? null : freeBalance.expiresAt,
          lastUpdated: nowDate,
        },
      });

      remainingAmount -= consumeFromFree;
    }

    // 有償ポイントから消費（まだ残っている場合）
    if (remainingAmount > 0 && paidBalance) {
      const newPaidAmount = paidAmount - remainingAmount;

      // 有償ポイント残高を更新
      await tx.pointBalance.update({
        where: { id: paidBalance.id },
        data: {
          amount: newPaidAmount,
          // 残高が0になったら有効期限をクリア
          expiresAt: newPaidAmount === 0 ? null : paidBalance.expiresAt,
          // 消費後の有効期限再設定（最終更新日から1年後）
          lastUpdated: nowDate,
        },
      });

      // 有効期限を再設定（最終更新日から1年後）
      if (newPaidAmount > 0 && paidBalance.expiresAt) {
        const newExpiresAt = new Date(nowDate);
        newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);
        await tx.pointBalance.update({
          where: { id: paidBalance.id },
          data: { expiresAt: newExpiresAt },
        });
      }
    }

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
  const balances = await tx.pointBalance.findMany({
    where: { userId },
  });

  const freeAmount = balances.find((b: any) => b.pointType === PointType.FREE)?.amount || 0;
  const paidAmount = balances.find((b: any) => b.pointType === PointType.PAID)?.amount || 0;

  return freeAmount + paidAmount;
}


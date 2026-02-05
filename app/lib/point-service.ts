/**
 * ポイントサービスクラス
 * ポイントの加減算処理を共通化し、キャッシュ削除を自動で行う
 * 
 * このサービスクラスを経由することで、キャッシュ削除処理を確実に実行できます。
 */
import { prisma } from '@/lib/prisma';
import { deleteCache } from './cache';
import { CacheKeys } from './cache-keys';
import { PointTransactionType } from '@prisma/client';

/**
 * ポイント残高のキャッシュを削除（共通処理）
 */
async function invalidatePointBalanceCache(userId: string): Promise<void> {
  await deleteCache(CacheKeys.pointBalance(userId));
}

/**
 * ポイントを付与（有償ポイント）
 * キャッシュ削除を自動で行う
 */
export async function grantPaidPoints(
  userId: string,
  amount: number,
  expiresAt: Date | null = null,
  description: string = 'ポイント購入',
  stripePaymentId?: string,
  purchaseLogId?: number
) {
  if (amount <= 0) {
    throw new Error('ポイント数は1以上である必要があります');
  }

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
  await invalidatePointBalanceCache(userId);

  return updatedBalance;
}

/**
 * ポイントを付与（無償ポイント）
 * キャッシュ削除を自動で行う
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
  await invalidatePointBalanceCache(userId);

  return updatedBalance;
}

/**
 * ポイントを消費（無償ポイントから優先的に消費）
 * キャッシュ削除を自動で行う
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
  await invalidatePointBalanceCache(userId);

  return newTotal;
}

/**
 * 購入ポイントを付与（有償 + おまけ無償を同時付与、Stripeの重複付与対策）
 * キャッシュ削除を自動で行う
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

  const result = await prisma.$transaction(async (tx) => {
    // 既に付与済みなら何もしない（idempotent）
    // purchaseLogIdがない場合でも、stripePaymentIdで重複チェックを行う
    let existing = null;
    if (purchaseLogId) {
      existing = await tx.pointHistory.findFirst({
        where: {
          historyTable: 'point_purchase_logs',
          historyTableId: purchaseLogId,
        },
        select: { id: true },
      });
    }
    
    // purchaseLogIdがない場合、stripePaymentIdで重複チェック
    if (!existing && stripePaymentId) {
      // pointHistoryのdescriptionにstripePaymentIdが含まれているか確認
      // または、pointPurchaseLogから履歴を確認
      const prismaAny = tx as unknown as {
        pointPurchaseLog: {
          findFirst: (args: {
            where: { providerPaymentIntentId: string };
            select: { id: true };
          }) => Promise<{ id: number } | null>;
        };
        pointHistory: {
          findFirst: (args: {
            where: {
              historyTable: 'point_purchase_logs';
              historyTableId: number;
            };
            select: { id: true };
          }) => Promise<{ id: number } | null>;
        };
      };
      
      const existingLog = await prismaAny.pointPurchaseLog.findFirst({
        where: { providerPaymentIntentId: stripePaymentId },
        select: { id: true },
      });
      
      if (existingLog) {
        existing = await prismaAny.pointHistory.findFirst({
          where: {
            historyTable: 'point_purchase_logs',
            historyTableId: existingLog.id,
          },
          select: { id: true },
        });
      }
    }
    
    if (existing) {
      console.log("ポイントは既に付与済みです:", {
        purchaseLogId,
        stripePaymentId,
        historyId: existing.id,
      });
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
    await invalidatePointBalanceCache(userId);
  }

  return result;
}

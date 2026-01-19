import { PointTransactionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { deleteCache } from './cache';
import { CacheKeys } from './cache-keys';

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
  const wasUpdated = await expirePoints();

  // 有効期限切れポイントが更新された場合、キャッシュを削除
  if (wasUpdated) {
    await deleteCache(CacheKeys.pointBalance(userId));
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
async function expirePoints(): Promise<boolean> {
  // スキーマにexpiresAtフィールドがないため、何もしない
  return false;
}

/**
 * ポイントを付与（有償ポイント）
 * 後方互換性のため、point-service.tsの実装を使用
 * @deprecated 新規コードでは point-service.ts の grantPaidPoints を直接使用してください
 */
export async function grantPaidPoints(
  userId: string,
  amount: number,
  expiresAt: Date | null = null,
  description: string = 'ポイント購入',
  stripePaymentId?: string,
  purchaseLogId?: number
) {
  const { grantPaidPoints: grantPaidPointsService } = await import('./point-service');
  return await grantPaidPointsService(
    userId,
    amount,
    expiresAt,
    description,
    stripePaymentId,
    purchaseLogId
  );
}

/**
 * 購入ポイントを付与（有償 + おまけ無償を同時付与、Stripeの重複付与対策）
 * 後方互換性のため、point-service.tsの実装を使用
 * @deprecated 新規コードでは point-service.ts の grantPurchasePoints を直接使用してください
 */
export async function grantPurchasePoints(
  userId: string,
  paidPoints: number,
  bonusFreePoints: number,
  stripePaymentId: string,
  purchaseLogId?: number
) {
  const { grantPurchasePoints: grantPurchasePointsService } = await import('./point-service');
  return await grantPurchasePointsService(
    userId,
    paidPoints,
    bonusFreePoints,
    stripePaymentId,
    purchaseLogId
  );
}

/**
 * ポイントを付与（無償ポイント）
 * 後方互換性のため、point-service.tsの実装を使用
 * @deprecated 新規コードでは point-service.ts の grantFreePoints を直接使用してください
 */
export async function grantFreePoints(
  userId: string,
  amount: number,
  expiresAt: Date | null = null,
  description: string = 'ポイント付与',
  transactionType: PointTransactionType = PointTransactionType.GRANT
) {
  const { grantFreePoints: grantFreePointsService } = await import('./point-service');
  return await grantFreePointsService(
    userId,
    amount,
    expiresAt,
    description,
    transactionType
  );
}

/**
 * ポイントを消費（無償ポイントから優先的に消費）
 * 後方互換性のため、point-service.tsの実装を使用
 * @deprecated 新規コードでは point-service.ts の consumePoints を直接使用してください
 */
export async function consumePoints(
  userId: string,
  amount: number,
  description: string = 'ポイント消費',
  gachaHistoryId?: number
) {
  const { consumePoints: consumePointsService } = await import('./point-service');
  return await consumePointsService(
    userId,
    amount,
    description,
    gachaHistoryId
  );
}

// 未使用のため削除: getTotalBalances関数は現在使用されていない


import { ReferralStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * 紹介リンクを生成
 */
export async function generateReferralLink(userId: string): Promise<{
  referralLinkId: string;
  referralLink: string;
  qrCodeUrl?: string;
}> {
  // 既存の有効な紹介リンクをチェック
  const existingLink = await prisma.referralHistory.findFirst({
    where: {
      referrerId: userId,
      status: ReferralStatus.PENDING,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingLink) {
    return {
      referralLinkId: existingLink.referralLinkId,
      referralLink: existingLink.referralLink,
    };
  }

  // 新しい紹介リンクを生成
  const referralLinkId = crypto.randomUUID();
  const liffUrl = process.env.NEXT_PUBLIC_LIFF_URL || '';
  
  // 紹介リンクはLIFFアプリのURLを使用
  // 注意: 認証されていないLINE公式アカウントでも動作します
  // 友だち追加は別途行ってもらう必要がありますが、紹介リンクの検証はLIFFアプリにアクセスした時点で行えます
  if (!liffUrl) {
    throw new Error('NEXT_PUBLIC_LIFF_URLが設定されていません');
  }
  
  const referralLink = `${liffUrl}?ref=${referralLinkId}`;
  
  // 有効期限は30日後
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const referral = await prisma.referralHistory.create({
    data: {
      referrerId: userId,
      referralLinkId,
      referralLink,
      expiresAt,
      status: ReferralStatus.PENDING,
      isFraudDetected: false,
    },
  });

  return {
    referralLinkId: referral.referralLinkId,
    referralLink: referral.referralLink,
  };
}

/**
 * 紹介リンクを検証（LIFFアプリアクセス時）
 */
export async function verifyReferralLink(
  referralLinkId: string,
  ipAddress?: string,
  deviceInfo?: string
): Promise<{
  isValid: boolean;
  reason?: string;
  referralId?: number;
}> {
  const referral = await prisma.referralHistory.findUnique({
    where: { referralLinkId },
  });

  if (!referral) {
    return {
      isValid: false,
      reason: '紹介リンクが見つかりません',
    };
  }

  // 有効期限チェック
  if (new Date() > referral.expiresAt) {
    await prisma.referralHistory.update({
      where: { id: referral.id },
      data: { status: ReferralStatus.EXPIRED },
    });
    return {
      isValid: false,
      reason: '紹介リンクの有効期限が切れています',
    };
  }

  // ステータスチェック
  if (referral.status !== ReferralStatus.PENDING) {
    return {
      isValid: false,
      reason: 'この紹介リンクは既に使用済みです',
    };
  }

  // IPアドレスとデバイス情報を更新
  await prisma.referralHistory.update({
    where: { id: referral.id },
    data: {
      ipAddress: ipAddress || null,
      deviceInfo: deviceInfo || null,
      referredAt: new Date(),
    },
  });

  return {
    isValid: true,
    referralId: referral.id,
  };
}

/**
 * 不正検知処理
 */
export async function detectFraud(referralId: number, refereeId: string): Promise<{
  isFraud: boolean;
  reason?: string;
}> {
  const referral = await prisma.referralHistory.findUnique({
    where: { id: referralId },
  });

  if (!referral) {
    return { isFraud: false };
  }

  // 1. 自己紹介チェック
  if (referral.referrerId === refereeId) {
    await prisma.referralHistory.update({
      where: { id: referralId },
      data: {
        isFraudDetected: true,
        fraudReason: '自己紹介が検出されました',
        status: ReferralStatus.FRAUD,
      },
    });
    return {
      isFraud: true,
      reason: '自己紹介が検出されました',
    };
  }

  // 2. 重複紹介チェック（同じ紹介者から既に紹介されている）
  const existingCompleted = await prisma.referralHistory.findFirst({
    where: {
      referrerId: referral.referrerId,
      refereeId: refereeId,
      status: ReferralStatus.COMPLETED,
    },
  });

  if (existingCompleted) {
    await prisma.referralHistory.update({
      where: { id: referralId },
      data: {
        isFraudDetected: true,
        fraudReason: '重複紹介が検出されました',
        status: ReferralStatus.INVALID,
      },
    });
    return {
      isFraud: true,
      reason: '重複紹介が検出されました',
    };
  }

  // 3. 同一IPアドレスからの複数紹介チェック（24時間以内に3回以上）
  if (referral.ipAddress) {
    const recentSameIP = await prisma.referralHistory.count({
      where: {
        ipAddress: referral.ipAddress,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24時間以内
        },
        status: ReferralStatus.COMPLETED,
      },
    });

    if (recentSameIP >= 3) {
      await prisma.referralHistory.update({
        where: { id: referralId },
        data: {
          isFraudDetected: true,
          fraudReason: '同一IPアドレスからの異常な紹介が検出されました',
          status: ReferralStatus.FRAUD,
        },
      });
      return {
        isFraud: true,
        reason: '同一IPアドレスからの異常な紹介が検出されました',
      };
    }
  }

  // 4. bot検知（将来的な拡張用）
  // 例: 短時間での大量アクセス、異常な行動パターンなど
  // 現在は基本的なチェックのみ

  return { isFraud: false };
}

/**
 * 紹介成立処理（友だち追加時）
 */
export async function completeReferral(
  referralId: number,
  refereeId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const referral = await tx.referralHistory.findUnique({
      where: { id: referralId },
    });

    if (!referral || referral.status !== ReferralStatus.PENDING) {
      throw new Error('紹介履歴が見つからないか、既に処理済みです');
    }

    // 不正検知
    const fraudCheck = await detectFraud(referralId, refereeId);
    if (fraudCheck.isFraud) {
      await tx.referralHistory.update({
        where: { id: referralId },
        data: {
          refereeId: refereeId,
          status: ReferralStatus.FRAUD,
          isFraudDetected: true,
          fraudReason: fraudCheck.reason,
        },
      });
      return;
    }

    // 紹介成立
    await tx.referralHistory.update({
      where: { id: referralId },
      data: {
        refereeId: refereeId,
        status: ReferralStatus.COMPLETED,
        completedAt: new Date(),
        refereeLastActiveAt: new Date(),
      },
    });

    // 紹介者と被紹介者に無償ポイントを付与
    const { grantFreePoints } = await import('@/lib/point-management');
    const { PointTransactionType } = await import('@prisma/client');

    // 紹介者への特典（100ポイント）
    await grantFreePoints(
      referral.referrerId,
      100,
      null,
      '友だち紹介特典（紹介者）',
      PointTransactionType.REFERRAL_REWARD
    );

    // 被紹介者への特典（100ポイント）
    await grantFreePoints(
      refereeId,
      100,
      null,
      '友だち紹介特典（被紹介者）',
      PointTransactionType.REFERRAL_REWARD
    );

    console.log(`紹介成立: 紹介者 ${referral.referrerId} → 被紹介者 ${refereeId}`);
  });
}

/**
 * 紹介者の紹介人数を取得
 */
export async function getReferralCount(referrerId: string): Promise<number> {
  return await prisma.referralHistory.count({
    where: {
      referrerId,
      status: ReferralStatus.COMPLETED,
      isFraudDetected: false,
    },
  });
}

/**
 * 紹介者の紹介履歴を取得
 */
export async function getReferralHistory(referrerId: string) {
  return await prisma.referralHistory.findMany({
    where: {
      referrerId,
      status: ReferralStatus.COMPLETED,
      isFraudDetected: false,
    },
    include: {
      referee: {
        select: {
          userId: true,
          displayName: true,
          pictureUrl: true,
          createdAt: true,
        },
      },
    },
    orderBy: { completedAt: 'desc' },
  });
}

/**
 * 被紹介者の行動を更新（課金額、ガチャ実行回数など）
 * 将来の追加報酬機能用
 */
export async function updateRefereeActivity(refereeId: string) {
  // 被紹介者の紹介履歴を取得
  const referral = await prisma.referralHistory.findFirst({
    where: {
      refereeId,
      status: ReferralStatus.COMPLETED,
    },
  });

  if (!referral) {
    return;
  }

  // 被紹介者の課金額を計算
  const pointHistories = await prisma.pointHistory.findMany({
    where: {
      userId: refereeId,
      transactionType: 'PURCHASE',
    },
  });

  const totalSpent = pointHistories.reduce((sum, history) => sum + history.amount, 0);

  // 被紹介者のガチャ実行回数
  const gachaCount = await prisma.gachaHistory.count({
    where: { userId: refereeId },
  });

  // 紹介履歴を更新
  await prisma.referralHistory.update({
    where: { id: referral.id },
    data: {
      refereeTotalSpent: totalSpent,
      refereeGachaCount: gachaCount,
      refereeLastActiveAt: new Date(),
    },
  });

  // 将来の追加報酬機能: 一定期間・一定金額使用したら追加報酬
  // 例: 30日以内に1000円以上課金したら追加100ポイント
  const daysSinceCompletion = referral.completedAt
    ? Math.floor((Date.now() - referral.completedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (
    !referral.additionalRewardGranted &&
    daysSinceCompletion <= 30 &&
    totalSpent >= 1000 &&
    gachaCount >= 1
  ) {
    const { grantFreePoints } = await import('@/lib/point-management');
    const { PointTransactionType } = await import('@prisma/client');

    await grantFreePoints(
      referral.referrerId,
      100,
      null,
      '友だち紹介追加報酬（被紹介者の課金特典）',
      PointTransactionType.REFERRAL_REWARD
    );

    await prisma.referralHistory.update({
      where: { id: referral.id },
      data: {
        additionalRewardGranted: true,
        additionalRewardGrantedAt: new Date(),
      },
    });
  }
}


import { PointTransactionType, ReferralStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { deleteCache, getCache, setCache } from "./cache";
import { CacheKeys } from "./cache-keys";

/**
 * 紹介リンクを生成
 * - 1ユーザー1リンク固定
 * - 既存リンクがあればそれを返す
 * - 無ければ新しいリンクを作成する
 */
export async function generateReferralLink(userId: string): Promise<{
  referralLinkId: string;
  referralLink: string;
  expiresAt: Date | null;
  qrCodeUrl?: string;
}> {
  // データベース接続を確認
  try {
    await prisma.$connect();
  } catch (dbError) {
    const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
    console.error("[generateReferralLink] データベース接続エラー:", errorMessage);
    throw new Error(`データベースに接続できません: ${errorMessage}`);
  }

  // 既存の紹介リンクを検索（1ユーザー1リンク固定）
  let existingReferral;
  try {
    existingReferral = await prisma.referral.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[generateReferralLink] 紹介リンク検索エラー:", errorMessage);
    throw new Error(`紹介リンクの検索に失敗しました: ${errorMessage}`);
  }

  if (existingReferral) {
    return {
      referralLinkId: existingReferral.referralLinkId,
      referralLink: existingReferral.referralLink,
      expiresAt: existingReferral.expiresAt ?? null,
    };
  }

  const liffUrl = process.env.NEXT_PUBLIC_LIFF_URL || "";
  if (!liffUrl) {
    throw new Error("NEXT_PUBLIC_LIFF_URLが設定されていません");
  }

  const referralLinkId = crypto.randomUUID();
  const referralLink = `${liffUrl}?ref=${referralLinkId}`;

  await prisma.referral.create({
    data: {
      userId,
      referralLinkId,
      referralLink,
      status: ReferralStatus.PENDING,
      expiresAt: null,
    },
  });

  return { referralLinkId, referralLink, expiresAt: null };
}

/**
 * 有効な紹介リンクを取得
 */
export async function getActiveReferralLink(userId: string): Promise<{
  referralLinkId: string;
  referralLink: string;
  expiresAt: Date | null;
} | null> {
  const existingReferral = await prisma.referral.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!existingReferral) {
    return null;
  }

  if (
    existingReferral.status === ReferralStatus.INVALID ||
    existingReferral.status === ReferralStatus.FRAUD
  ) {
    return null;
  }

  return {
    referralLinkId: existingReferral.referralLinkId,
    referralLink: existingReferral.referralLink,
    expiresAt: existingReferral.expiresAt ?? null,
  };
}

/**
 * 紹介リンクを検証（LIFFアプリアクセス時）
 * ReferralHistoryにアクセス履歴をインサート
 * userIdを指定すると、User.lastAccessedReferralLinkIdに記録される
 */
export async function verifyReferralLink(
  referralLinkId: string,
  ipAddress?: string,
  deviceInfo?: string,
  userId?: string
): Promise<{
  isValid: boolean;
  reason?: string;
  referralId?: number;
}> {
  // Userデータキャッシュ取得（userIdが指定されている場合のみ）
  if (userId) {
    const userCacheKey = CacheKeys.user(userId);
    let user = await getCache<{ userId: string }>(userCacheKey);

    if (!user) {
      // LineIDをもとにusersデータ取得
      const dbUser = await prisma.user.findUnique({
        where: { userId },
        select: { userId: true },
      });

      if (dbUser) {
        // Userデータキャッシュ保存
        user = dbUser;
        await setCache(userCacheKey, user, 300); // TTL: 5分
      }
    }
  }

  const referral = await prisma.referral.findUnique({
    where: { referralLinkId },
  });

  if (!referral) {
    return {
      isValid: false,
      reason: "紹介リンクが見つかりません",
    };
  }

  // ステータスチェック（INVALID/FRAUDは無効）
  if (
    referral.status === ReferralStatus.INVALID ||
    referral.status === ReferralStatus.FRAUD
  ) {
    return {
      isValid: false,
      reason: "この紹介リンクは既に使用済みです",
    };
  }

  // ReferralHistoryにアクセス履歴をインサート（更新しない）
  await prisma.referralHistory.create({
    data: {
      referralId: referral.id,
      referralLinkId: referral.referralLinkId,
      referrerUserId: referral.userId,
      refereeUserId: userId ?? null,
      ipAddress: ipAddress || null,
      deviceInfo: deviceInfo || null,
      status: ReferralStatus.PENDING,
      referredAt: new Date(),
    },
  });

  // userIdが指定されている場合、User.lastAccessedReferralLinkIdに記録
  // これにより、友だち追加時に「誰のリンクから追加されたか」を特定できる
  if (userId) {
    try {
      await prisma.user.update({
        where: { userId },
        data: {
          lastAccessedReferralLinkId: referralLinkId,
          lastAccessedReferralAt: new Date(),
        },
      });
    } catch {
      // ユーザーが存在しない場合は無視（初回アクセス時など）
      console.log("紹介リンク記録時にユーザーが見つかりませんでした:", userId);
    }
  }

  return {
    isValid: true,
    referralId: referral.id,
  };
}

/**
 * 不正検知処理
 */
export async function detectFraud(
  referralId: number,
  refereeId: string
): Promise<{
  isFraud: boolean;
  reason?: string;
}> {
  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
  });

  if (!referral) {
    return { isFraud: false };
  }

  // 1. 自己紹介チェック
  if (referral.userId === refereeId) {
    return {
      isFraud: true,
      reason: "自己紹介が検出されました",
    };
  }

  // 2. 重複紹介チェック（同じ紹介者から既に紹介されている）
  const existingReferralUser = await prisma.referralUser.findFirst({
    where: {
      userId: referral.userId,
      toUserId: refereeId,
    },
  });

  if (existingReferralUser) {
    return {
      isFraud: true,
      reason: "重複紹介が検出されました",
    };
  }

  // 3. 同一IPアドレスからの複数紹介チェック（24時間以内に3回以上）
  const recentHistories = await prisma.referralHistory.findMany({
    where: {
      referralId: referral.id,
      ipAddress: { not: null },
      referredAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24時間以内
      },
    },
  });

  // 同じIPアドレスで3回以上アクセスしている場合
  const ipCounts = new Map<string, number>();
  for (const history of recentHistories) {
    if (history.ipAddress) {
      ipCounts.set(
        history.ipAddress,
        (ipCounts.get(history.ipAddress) || 0) + 1
      );
    }
  }

  for (const [ip, count] of ipCounts.entries()) {
    if (count >= 3) {
      // 最新の履歴を更新
      const latestHistory = recentHistories
        .filter((h) => h.ipAddress === ip)
        .sort((a, b) => b.referredAt.getTime() - a.referredAt.getTime())[0];

      if (latestHistory) {
        await prisma.referralHistory.update({
          where: { id: latestHistory.id },
          data: {
            referrerUserId: referral.userId,
            refereeUserId: refereeId,
            isFraudDetected: true,
            fraudReason: "同一IPアドレスからの異常な紹介が検出されました",
            status: ReferralStatus.FRAUD,
          },
        });
      }

      return {
        isFraud: true,
        reason: "同一IPアドレスからの異常な紹介が検出されました",
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
  // トランザクション外で使用するため、変数を宣言（トランザクション内で管理画面の設定値を代入）
  let referrerPoints: number | undefined;
  let refereePoints: number | undefined;
  let referrerUserId: string | undefined;

  await prisma.$transaction(async (tx) => {
    const referral = await tx.referral.findUnique({
      where: { id: referralId },
    });

    if (!referral) {
      throw new Error("紹介履歴が見つかりません");
    }

    if (
      referral.status === ReferralStatus.INVALID ||
      referral.status === ReferralStatus.FRAUD
    ) {
      throw new Error("この紹介リンクは無効です");
    }

    // 既に同じ被紹介者で成立済みの紹介がないかチェック
    const existingReferralUser = await tx.referralUser.findFirst({
      where: {
        userId: referral.userId,
        toUserId: refereeId,
      },
    });

    if (existingReferralUser) {
      throw new Error("既にこの被紹介者との紹介は成立済みです");
    }

    // 不正検知
    const fraudCheck = await detectFraud(referralId, refereeId);
    if (fraudCheck.isFraud) {
      // ReferralHistoryの最新履歴を更新
      const latestHistory = await tx.referralHistory.findFirst({
        where: {
          referralId: referral.id,
        },
        orderBy: { referredAt: "desc" },
      });

      if (latestHistory) {
        await tx.referralHistory.update({
          where: { id: latestHistory.id },
          data: {
            referrerUserId: referral.userId,
            refereeUserId: refereeId,
            isFraudDetected: true,
            fraudReason: fraudCheck.reason,
            status: ReferralStatus.FRAUD,
          },
        });
      }

      return;
    }

    // ReferralUserを作成（紹介成立情報）
    const referralUser = await tx.referralUser.create({
      data: {
        userId: referral.userId,
        toUserId: refereeId,
        completedAt: new Date(),
        additionalRewardGranted: false,
      },
    });

    // UserActivityを作成（被紹介者行動情報）
    await tx.userActivity.create({
      data: {
        userId: refereeId,
        referralUserId: referralUser.id,
        gachaCount: 0,
        totalSpent: 0,
      },
    });

    // ReferralHistoryの最新履歴を更新
    const latestHistory = await tx.referralHistory.findFirst({
      where: {
        referralId: referral.id,
      },
      orderBy: { referredAt: "desc" },
    });

    if (latestHistory) {
      await tx.referralHistory.update({
        where: { id: latestHistory.id },
        data: {
          referrerUserId: referral.userId,
          refereeUserId: refereeId,
          status: ReferralStatus.COMPLETED,
        },
      });
    }

    // 紹介報酬ポイント設定を取得（管理画面で設定した値を使用、設定がない場合は100をデフォルト値として使用）
    const referralRewardSettings = await tx.freeGachaSettings.findFirst();
    referrerPoints = referralRewardSettings?.referrerPoints ?? 100;
    refereePoints = referralRewardSettings?.refereePoints ?? 100;
    referrerUserId = referral.userId;

    // 紹介者と被紹介者に無償ポイントを付与
    const { grantFreePoints } = await import("@/lib/point-management");
    const { PointTransactionType } = await import("@prisma/client");

    // 紹介者への特典（設定されたポイント）
    if (referrerPoints > 0) {
      await grantFreePoints(
        referral.userId,
        referrerPoints,
        null,
        `友だち紹介特典（紹介者）: ${referrerPoints}ポイント`,
        PointTransactionType.REFERRAL_REWARD
      );
      // grantFreePoints内でキャッシュ削除されるが、念のためトランザクション完了後にも削除
    }

    // 被紹介者への特典（設定されたポイント）
    if (refereePoints > 0) {
      await grantFreePoints(
        refereeId,
        refereePoints,
        null,
        `友だち紹介特典（被紹介者）: ${refereePoints}ポイント`,
        PointTransactionType.REFERRAL_REWARD
      );
      // grantFreePoints内でキャッシュ削除されるが、念のためトランザクション完了後にも削除
    }

    // 無料ガチャ設定を取得
    const freeGachaSettings = await tx.freeGachaSettings.findFirst();

    // 無料ガチャ機能が有効で、紹介成立時に付与する設定になっている場合
    if (
      freeGachaSettings?.isActive &&
      freeGachaSettings.grantOnReferralComplete
    ) {
      const now = new Date();
      let expiresAt: Date | null = null;

      // 有効期限の計算
      if (
        freeGachaSettings.expirationDays &&
        freeGachaSettings.expirationDays > 0
      ) {
        expiresAt = new Date(now);
        expiresAt.setDate(
          expiresAt.getDate() + freeGachaSettings.expirationDays
        );
      }

      // 無料ガチャ機能は将来実装予定
      // FreeGachaHistoryモデルが存在しないため、コメントアウト
      // if (freeGachaSettings.referrerGachaTypeId) {
      //   await tx.freeGachaHistory.create({
      //     data: {
      //       userId: referral.userId,
      //       referralUserId: referralUser.id,
      //       gachaTypeId: freeGachaSettings.referrerGachaTypeId,
      //       grantType: "REFERRER",
      //       expiresAt,
      //       isUsed: false,
      //     },
      //   });
      // }

      // if (freeGachaSettings.refereeGachaTypeId) {
      //   await tx.freeGachaHistory.create({
      //     data: {
      //       userId: refereeId,
      //       referralUserId: referralUser.id,
      //       gachaTypeId: freeGachaSettings.refereeGachaTypeId,
      //       grantType: "REFEREE",
      //       expiresAt,
      //       isUsed: false,
      //     },
      //   });
      // }
    }

    console.log(`紹介成立: 紹介者 ${referral.userId} → 被紹介者 ${refereeId}`);
  });

  // トランザクション完了後、キャッシュを削除（念のため）
  // grantFreePoints内でも削除されるが、トランザクション完了後に確実に削除
  // 不正検知の場合は早期リターンするため、変数は初期化されない（その場合はポイント付与も行われないため、キャッシュ削除も不要）
  if (referrerPoints !== undefined && referrerPoints > 0 && referrerUserId) {
    await deleteCache(CacheKeys.pointBalance(referrerUserId));
  }
  if (refereePoints !== undefined && refereePoints > 0) {
    await deleteCache(CacheKeys.pointBalance(refereeId));
  }
}

/**
 * 紹介者の紹介人数を取得
 */
export async function getReferralCount(referrerId: string): Promise<number> {
  return await prisma.referralUser.count({
    where: {
      userId: referrerId,
    },
  });
}

/**
 * 紹介者の紹介履歴を取得
 */
export async function getReferralHistory(
  referrerId: string,
  page: number = 1,
  limit: number = 50
) {
  const totalCount = await prisma.referralUser.count({
    where: {
      userId: referrerId,
    },
  });

  const skip = (page - 1) * limit;
  const referralUsers = await prisma.referralUser.findMany({
    where: {
      userId: referrerId,
    },
    orderBy: { completedAt: "desc" },
    skip,
    take: limit,
  });

  // toUserの情報を取得
  const toUserIds = referralUsers.map((ru) => ru.toUserId);
  const toUsers = await prisma.user.findMany({
    where: {
      userId: { in: toUserIds },
    },
    select: {
      userId: true,
      displayName: true,
      pictureUrl: true,
      createdAt: true,
    },
  });

  const toUserMap = new Map(toUsers.map((u) => [u.userId, u]));

  // UserActivityをreferralUserIdで取得
  const referralUserIds = referralUsers.map((ru) => ru.id);
  const userActivities = await prisma.userActivity.findMany({
    where: {
      referralUserId: { in: referralUserIds },
    },
  });

  // referralUserIdをキーにしたマップを作成
  const activityMap = new Map(
    userActivities.map((ua) => [ua.referralUserId, ua])
  );

  // 紹介者特典の付与内容（point_histories）を取得
  const rewardEntries = await Promise.all(
    referralUsers.map(async (ru) => {
      const grantedAt = ru.completedAt ?? ru.createdAt;
      const windowStart = new Date(grantedAt.getTime() - 10 * 60 * 1000);
      const windowEnd = new Date(grantedAt.getTime() + 10 * 60 * 1000);

      const rewardHistory = await prisma.pointHistory.findFirst({
        where: {
          userId: ru.userId,
          transactionType: PointTransactionType.REFERRAL_REWARD,
          description: { contains: "友だち紹介特典（紹介者）" },
          createdAt: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          amount: true,
          description: true,
          createdAt: true,
        },
      });

      return [ru.id, rewardHistory] as const;
    })
  );
  const rewardMap = new Map(rewardEntries);

  // 各referralUserにtoUserとactivityを追加
  const items = referralUsers.map((ru) => ({
    ...ru,
    toUser: toUserMap.get(ru.toUserId) || null,
    refereeActivity: activityMap.get(ru.id) || null,
    additionalReward: rewardMap.get(ru.id)
      ? {
          points: rewardMap.get(ru.id)!.amount,
          description: rewardMap.get(ru.id)!.description,
          grantedAt: rewardMap.get(ru.id)!.createdAt,
        }
      : null,
  }));

  return {
    items,
    totalCount,
  };
}

/**
 * 被紹介者の行動を更新（課金額、ガチャ実行回数など）
 * 将来の追加報酬機能用
 */
export async function updateRefereeActivity(refereeId: string) {
  // 被紹介者の紹介成立情報を取得
  const referralUser = await prisma.referralUser.findFirst({
    where: {
      toUserId: refereeId,
    },
  });

  if (!referralUser) {
    return;
  }

  // 被紹介者の課金額を計算
  const pointHistories = await prisma.pointHistory.findMany({
    where: {
      userId: refereeId,
      transactionType: "PURCHASE",
    },
  });

  const totalSpent = pointHistories.reduce(
    (sum, history) => sum + history.amount,
    0
  );

  // 被紹介者のガチャ実行回数
  const gachaCount = await prisma.gachaHistory.count({
    where: { userId: refereeId },
  });

  // UserActivityを更新または作成
  const existingActivity = await prisma.userActivity.findFirst({
    where: {
      referralUserId: referralUser.id,
    },
  });

  if (existingActivity) {
    await prisma.userActivity.update({
      where: { id: existingActivity.id },
      data: {
        totalSpent,
        gachaCount,
      },
    });
  } else {
    await prisma.userActivity.create({
      data: {
        userId: refereeId,
        referralUserId: referralUser.id,
        totalSpent,
        gachaCount,
      },
    });
  }

  // 追加報酬（被紹介者の課金条件達成時）は廃止。
  // 現在は行動集計の更新のみを行う。
}

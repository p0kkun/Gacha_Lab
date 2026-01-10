import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

/**
 * 友達紹介履歴を取得
 * GET /api/admin/referrals
 */
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const referrerId = searchParams.get("referrerId");
    const refereeId = searchParams.get("refereeId");
    const status = searchParams.get("status");

    // ReferralUser（紹介成立情報）を取得
    const whereReferralUser: any = {};

    if (referrerId) {
      whereReferralUser.userId = referrerId;
    }

    if (refereeId) {
      whereReferralUser.toUserId = refereeId;
    }

    // ReferralHistory（リンクアクセス履歴）の条件
    const whereHistory: any = {};

    if (status) {
      whereHistory.status = status;
    }

    // リンクアクセス済みだがLINE未追加のユーザーも取得
    // lastAccessedReferralLinkIdが設定されていて、対応するReferralUserが存在しないケース
    const pendingUsers = await prisma.user.findMany({
      where: {
        lastAccessedReferralLinkId: { not: null },
      },
      select: {
        userId: true,
        displayName: true,
        pictureUrl: true,
        lastAccessedReferralLinkId: true,
        lastAccessedReferralAt: true,
      },
      orderBy: { lastAccessedReferralAt: "desc" },
      take: 100, // 最新100件
    });

    // リンクアクセス済みユーザーに対応するReferralを取得
    const pendingLinkIds = pendingUsers
      .map((u) => u.lastAccessedReferralLinkId)
      .filter((id): id is string => id !== null);

    // ReferralUserを取得（紹介成立情報）
    const [referralUsers, totalReferralUsers] = await Promise.all([
      prisma.referralUser.findMany({
        where: whereReferralUser,
        include: {
          user: {
            select: {
              userId: true,
              displayName: true,
              pictureUrl: true,
            },
          },
          toUser: {
            select: {
              userId: true,
              displayName: true,
              pictureUrl: true,
            },
          },
          referral: {
            select: {
              id: true,
              referralLinkId: true,
              referralLink: true,
              status: true,
            },
          },
          freeGachaHistories: {
            include: {
              gachaType: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          refereeActivity: true,
        },
        orderBy: { completedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.referralUser.count({ where: whereReferralUser }),
    ]);

    // ReferralHistoryを取得（リンクアクセス履歴、フィルタ条件がある場合）
    let histories: any[] = [];
    let totalHistories = 0;

    if (Object.keys(whereHistory).length > 0 || pendingLinkIds.length > 0) {
      const whereClause: any = { ...whereHistory };

      // リンクアクセス済みだがLINE未追加のケースを含める
      if (pendingLinkIds.length > 0) {
        whereClause.OR = [
          whereHistory, // 通常のフィルタ条件
          {
            referralLinkId: { in: pendingLinkIds },
            referral: {
              status: { not: "COMPLETED" }, // まだ成立していない
            },
          },
        ];
      }

      [histories, totalHistories] = await Promise.all([
        prisma.referralHistory.findMany({
          where: whereClause,
          include: {
            referral: {
              include: {
                user: {
                  select: {
                    userId: true,
                    displayName: true,
                    pictureUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { referredAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.referralHistory.count({ where: whereClause }),
      ]);
    }

    // リンクアクセス済みユーザー情報をマージ
    const historiesWithPending = histories.map((history) => {
      const pendingUser = pendingUsers.find(
        (u) => u.lastAccessedReferralLinkId === history.referralLinkId
      );
      return {
        ...history,
        pendingReferee: pendingUser
          ? {
              userId: pendingUser.userId,
              displayName: pendingUser.displayName,
              pictureUrl: pendingUser.pictureUrl,
              lastAccessedAt: pendingUser.lastAccessedReferralAt,
            }
          : null,
      };
    });

    // レスポンスを構築
    // ReferralUser（紹介成立情報）とReferralHistory（リンクアクセス履歴）を統合
    const allHistories = [
      ...referralUsers.map((ru) => ({
        type: "completed" as const,
        referralUser: ru,
        referralHistory: null,
        pendingReferee: null,
      })),
      ...historiesWithPending.map((h) => ({
        type: "history" as const,
        referralUser: null,
        referralHistory: h,
        pendingReferee: h.pendingReferee,
      })),
    ].sort((a, b) => {
      const dateA =
        a.type === "completed"
          ? a.referralUser?.completedAt.getTime() || 0
          : a.referralHistory?.referredAt.getTime() || 0;
      const dateB =
        b.type === "completed"
          ? b.referralUser?.completedAt.getTime() || 0
          : b.referralHistory?.referredAt.getTime() || 0;
      return dateB - dateA;
    });

    return NextResponse.json({
      histories: allHistories,
      pagination: {
        page,
        limit,
        total: totalReferralUsers + totalHistories,
        totalPages: Math.ceil((totalReferralUsers + totalHistories) / limit),
      },
    });
  } catch (error) {
    console.error("紹介履歴取得エラー:", error);
    return NextResponse.json(
      { error: "紹介履歴の取得に失敗しました" },
      { status: 500 }
    );
  }
}

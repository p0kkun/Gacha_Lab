import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * 統計情報を取得
 * GET /api/admin/statistics?period=month
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // 'day' | 'month' | 'custom'
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // 期間の開始日と終了日を計算
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (period === 'custom' && startDateParam && endDateParam) {
      // カスタム期間
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      // 終了日の時刻を23:59:59に設定
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // ガチャごとの統計
    const gachaStats = await prisma.gachaHistory.groupBy({
      by: ['gachaTypeId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // ガチャタイプ情報を取得
    const gachaTypeIds = gachaStats.map((stat) => stat.gachaTypeId);
    const gachaTypes = await prisma.gachaType.findMany({
      where: { id: { in: gachaTypeIds } },
      select: { id: true, name: true },
    });

    // レアリティ別の統計
    const rarityStatsRaw = await prisma.gachaHistory.groupBy({
      by: ['itemId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // アイテム情報を取得してレアリティ別に集計
    const itemIds = rarityStatsRaw.map((stat) => stat.itemId);
    const items = await prisma.gachaItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, rarity: true },
    });

    const rarityCounts: Record<string, number> = {};
    rarityStatsRaw.forEach((stat) => {
      const item = items.find((i) => i.id === stat.itemId);
      if (item) {
        rarityCounts[item.rarity] = (rarityCounts[item.rarity] || 0) + stat._count.id;
      }
    });

    // 日別の集計（生SQLを使用）
    // Prismaのマッピング: createdAt -> "createdAt" (キャメルケースのまま)
    // データベースの実際のカラム名を確認する必要がある
    // Prismaのデフォルトではキャメルケースがそのまま使われるが、@@mapでテーブル名のみ変更
    // カラム名はPrismaの命名規則に従う（デフォルトではキャメルケース）
    const dailyStats = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT
        DATE("createdAt") as date,
        COUNT(*)::bigint as count
      FROM "gacha_histories"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT 30
    `;

    // 総ユーザー数
    const totalUsers = await prisma.user.count();

    // 総ガチャ実行回数
    const totalGachaCount = await prisma.gachaHistory.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return NextResponse.json({
      period,
      startDate,
      endDate,
      totalUsers,
      totalGachaCount,
      gachaStats: gachaStats.map((stat) => {
        const gachaType = gachaTypes.find((gt) => gt.id === stat.gachaTypeId);
        return {
          gachaTypeId: stat.gachaTypeId,
          gachaTypeName: gachaType?.name || stat.gachaTypeId,
          count: stat._count.id,
        };
      }),
      rarityStats: rarityCounts,
      dailyStats: dailyStats.map((stat) => ({
        date: stat.date,
        count: Number(stat.count),
      })),
    });
  } catch (error) {
    console.error('統計情報取得エラー:', error);
    return NextResponse.json(
      { error: '統計情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}



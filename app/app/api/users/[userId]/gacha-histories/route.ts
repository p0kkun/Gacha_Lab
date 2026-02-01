import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    const [histories, total] = await Promise.all([
      prisma.gachaHistory.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          gachaTypeId: true,
          itemId: true,
          tierCode: true,
          createdAt: true,
          pointsUsed: true,
          gachaType: {
            select: { id: true, name: true },
          },
          item: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.gachaHistory.count({
        where: { userId },
      }),
    ]);

    // ItemUsageLogから使用日時を取得
    const historyIds = histories.map((h) => h.id);
    const usageLogs = await prisma.itemUsageLog.findMany({
      where: {
        userId,
        itemId: { in: histories.filter((h) => h.itemId).map((h) => h.itemId!) },
      },
      select: {
        itemId: true,
        usedAt: true,
      },
    });

    // itemIdをキーにしたマップを作成
    const usageLogMap = new Map(
      usageLogs.map((log) => [log.itemId, log.usedAt])
    );

    const mapped = histories.map((h) => ({
      ...h,
      // 新方式: gacha_histories.tierCode を等級として返す
      item: {
        ...h.item,
        rarity: h.tierCode ?? 'UNKNOWN',
      },
      usedAt: h.itemId ? usageLogMap.get(h.itemId)?.toISOString() ?? null : null,
    }));

    return NextResponse.json({
      histories: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('ガチャ履歴取得エラー:', error);
    return NextResponse.json(
      { error: 'ガチャ履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}



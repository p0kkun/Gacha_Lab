import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/error-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  let userId: string | undefined;
  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    userId = (await params).userId;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    // ユーザーが獲得したアイテム（ガチャ履歴から取得）
    const [histories, total] = await Promise.all([
      prisma.gachaHistory.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          tierCode: true,
          itemId: true,
          item: {
            select: {
              id: true,
              name: true,
              description: true,
              usageType: true,
              imageUrl: true,
              useStartAt: true,
              useEndAt: true,
            },
          },
        },
      }),
      prisma.gachaHistory.count({
        where: { userId },
      }),
    ]);

    // ItemUsageLogから使用日時を取得
    const itemIds = histories.filter((h) => h.itemId).map((h) => h.itemId!);
    const usageLogs = await prisma.itemUsageLog.findMany({
      where: {
        userId,
        itemId: { in: itemIds },
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

    const items = histories.map((history) => ({
      id: history.id,
      item: {
        ...history.item,
        rarity: history.tierCode ?? 'UNKNOWN',
      },
      createdAt: history.createdAt,
      usedAt: history.itemId ? usageLogMap.get(history.itemId)?.toISOString() ?? null : null,
    }));

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    await logError(
      error,
      { userId, route: '/api/users/[userId]/items' },
      request
    );
    return NextResponse.json(
      { error: 'アイテムの取得に失敗しました' },
      { status: 500 }
    );
  }
}



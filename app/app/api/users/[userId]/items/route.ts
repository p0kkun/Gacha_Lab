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

    // ユーザーが獲得したアイテム（UserItemから取得）
    const [userItems, total] = await Promise.all([
      prisma.userItem.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          status: true,
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
          gachaHistory: {
            select: {
              tierCode: true,
            },
          },
        },
      }),
      prisma.userItem.count({
        where: { userId },
      }),
    ]);

    // ItemUsageLogから使用日時を取得
    const userItemIds = userItems.map((ui) => ui.id);
    const usageLogs = await prisma.itemUsageLog.findMany({
      where: {
        userId,
        userItemId: { in: userItemIds },
      },
      select: {
        userItemId: true,
        usedAt: true,
      },
    });

    // userItemIdをキーにしたマップを作成
    const usageLogMap = new Map(
      usageLogs.map((log) => [log.userItemId, log.usedAt])
    );

    const items = userItems.map((userItem) => {
      const usedAt =
        usageLogMap.get(userItem.id)?.toISOString() ??
        (userItem.status === 'USED' ? userItem.updatedAt.toISOString() : null);
      return {
        id: userItem.id,
        item: {
          ...userItem.item,
          rarity: userItem.gachaHistory?.tierCode ?? 'UNKNOWN',
        },
        createdAt: userItem.createdAt,
        usedAt,
      };
    });

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


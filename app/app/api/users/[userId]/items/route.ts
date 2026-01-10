import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    const { userId } = await params;

    // ユーザーが獲得したアイテム（ガチャ履歴から取得）
    const histories = await prisma.gachaHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        tierCode: true,
        usageLog: { select: { usedAt: true } },
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
    });

    const items = histories.map((history) => ({
      id: history.id,
      item: {
        ...history.item,
        rarity: history.tierCode ?? 'UNKNOWN',
      },
      createdAt: history.createdAt,
      usedAt: history.usageLog?.usedAt ? history.usageLog.usedAt.toISOString() : null,
    }));

    return NextResponse.json({
      items,
    });
  } catch (error) {
    console.error('アイテム取得エラー:', error);
    return NextResponse.json(
      { error: 'アイテムの取得に失敗しました' },
      { status: 500 }
    );
  }
}



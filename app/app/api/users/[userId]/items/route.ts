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
      include: {
        item: {
          select: {
            id: true,
            name: true,
            rarity: true,
          },
        },
      },
    });

    // アイテム使用履歴を取得（将来的に実装）
    // 現在は使用済みフラグがないため、ガチャ履歴から直接取得

    const items = histories.map((history) => ({
      id: history.id,
      item: history.item,
      createdAt: history.createdAt,
      usedAt: null as string | null, // 将来的に実装
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



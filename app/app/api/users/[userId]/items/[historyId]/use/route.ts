import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// アイテム使用API（使用済みフラグを更新）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; historyId: string }> }
) {
  try {
    const { userId, historyId } = await params;
    const historyIdNum = parseInt(historyId);

    // ガチャ履歴を取得して、ユーザーIDが一致するか確認
    const history = await prisma.gachaHistory.findFirst({
      where: {
        id: historyIdNum,
        userId: userId,
      },
    });

    if (!history) {
      return NextResponse.json(
        { error: 'アイテムが見つかりません' },
        { status: 404 }
      );
    }

    // 既に使用済みの場合はエラー
    if (history.usedAt) {
      return NextResponse.json(
        { error: 'このアイテムは既に使用済みです' },
        { status: 400 }
      );
    }

    // 使用済みフラグを更新
    const updatedHistory = await prisma.gachaHistory.update({
      where: {
        id: historyIdNum,
      },
      data: {
        usedAt: new Date(),
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            rarity: true,
            usageType: true,
            imageUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: updatedHistory.id,
        item: updatedHistory.item,
        createdAt: updatedHistory.createdAt,
        usedAt: updatedHistory.usedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('アイテム使用エラー:', error);
    return NextResponse.json(
      { error: 'アイテムの使用に失敗しました' },
      { status: 500 }
    );
  }
}


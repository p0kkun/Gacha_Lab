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
      include: {
        item: {
          select: {
            useStartAt: true,
            useEndAt: true,
          },
        },
      },
    });

    if (!history) {
      return NextResponse.json(
        { error: 'アイテムが見つかりません' },
        { status: 404 }
      );
    }

    // 既に使用済みの場合はエラー（ItemUsageLogで判定）
    if (history.itemId) {
      const existingUsage = await prisma.itemUsageLog.findFirst({
        where: {
          userId: userId,
          itemId: history.itemId,
        },
        select: { id: true, usedAt: true },
      });
      if (existingUsage) {
        return NextResponse.json(
          { error: 'このアイテムは既に使用済みです' },
          { status: 400 }
        );
      }
    }

    // 使用可能期間のチェック（任意設定）
    const now = new Date();
    const useStartAt = history.item?.useStartAt ?? null;
    const useEndAt = history.item?.useEndAt ?? null;
    if (useStartAt && now < useStartAt) {
      return NextResponse.json(
        { error: 'このアイテムはまだ使用できません（使用開始前）' },
        { status: 400 }
      );
    }
    if (useEndAt && now > useEndAt) {
      return NextResponse.json(
        { error: 'このアイテムの使用期限が切れています' },
        { status: 400 }
      );
    }

    if (!history.itemId) {
      return NextResponse.json(
        { error: 'アイテムIDが見つかりません' },
        { status: 400 }
      );
    }

    // 使用ログを作成（ItemUsageLog）
    await prisma.itemUsageLog.create({
      data: {
        userId: userId,
        itemId: history.itemId,
        usedAt: new Date(),
      },
    });

    // ガチャ履歴からアイテム情報を再取得
    const historyWithItem = await prisma.gachaHistory.findFirst({
      where: {
        id: historyIdNum,
        userId: userId,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            usageType: true,
            imageUrl: true,
            useStartAt: true,
            useEndAt: true,
          },
        },
      },
    });

    if (!historyWithItem || !historyWithItem.item) {
      return NextResponse.json(
        { error: 'アイテム情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item: {
        id: historyWithItem.id,
        item: historyWithItem.item,
        createdAt: historyWithItem.createdAt,
        usedAt: new Date().toISOString(),
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


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/error-logger';

// アイテム使用API（使用済みフラグを更新）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; historyId: string }> }
) {
  let userId: string | undefined;
  let historyId: string | undefined;
  try {
    const resolvedParams = await params;
    userId = resolvedParams.userId;
    historyId = resolvedParams.historyId;
    const historyIdNum = parseInt(historyId, 10);

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
      await logError(
        new Error('アイテムが見つかりません'),
        {
          userId,
          route: '/api/users/[userId]/items/[historyId]/use',
          customData: { historyId: historyIdNum },
        },
        request
      );
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
        await logError(
          new Error('このアイテムは既に使用済みです'),
          {
            userId,
            route: '/api/users/[userId]/items/[historyId]/use',
            customData: { historyId: historyIdNum, itemId: history.itemId },
          },
          request
        );
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
      await logError(
        new Error('このアイテムはまだ使用できません（使用開始前）'),
        {
          userId,
          route: '/api/users/[userId]/items/[historyId]/use',
          customData: {
            historyId: historyIdNum,
            useStartAt,
            now: now.toISOString(),
          },
        },
        request
      );
      return NextResponse.json(
        { error: 'このアイテムはまだ使用できません（使用開始前）' },
        { status: 400 }
      );
    }
    if (useEndAt && now > useEndAt) {
      await logError(
        new Error('このアイテムの使用期限が切れています'),
        {
          userId,
          route: '/api/users/[userId]/items/[historyId]/use',
          customData: {
            historyId: historyIdNum,
            useEndAt,
            now: now.toISOString(),
          },
        },
        request
      );
      return NextResponse.json(
        { error: 'このアイテムの使用期限が切れています' },
        { status: 400 }
      );
    }

    if (!history.itemId) {
      await logError(
        new Error('アイテムIDが見つかりません'),
        {
          userId,
          route: '/api/users/[userId]/items/[historyId]/use',
          customData: { historyId: historyIdNum },
        },
        request
      );
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
      await logError(
        new Error('アイテム情報の取得に失敗しました'),
        {
          userId,
          route: '/api/users/[userId]/items/[historyId]/use',
          customData: { historyId: historyIdNum },
        },
        request
      );
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
    await logError(
      error,
      { userId, route: '/api/users/[userId]/items/[historyId]/use' },
      request
    );
    return NextResponse.json(
      { error: 'アイテムの使用に失敗しました' },
      { status: 500 }
    );
  }
}


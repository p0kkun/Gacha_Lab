import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/error-logger';

// アイテム使用API（使用済みフラグを更新）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; historyId: string }> }
) {
  let userId: string | undefined;
  let userItemId: string | undefined;
  try {
    const resolvedParams = await params;
    userId = resolvedParams.userId;
    userItemId = resolvedParams.historyId;
    const userItemIdNum = parseInt(userItemId, 10);

    // ユーザーのアイテムを取得して、ユーザーIDが一致するか確認
    const userItem = await prisma.userItem.findFirst({
      where: {
        id: userItemIdNum,
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

    if (!userItem) {
      await logError(
        new Error('アイテムが見つかりません'),
        {
          userId,
          route: '/api/users/[userId]/items/[historyId]/use',
          customData: { userItemId: userItemIdNum },
        },
        request
      );
      return NextResponse.json(
        { error: 'アイテムが見つかりません' },
        { status: 404 }
      );
    }

    // 既に使用済みの場合はエラー（UserItem.statusで判定）
    if (userItem.status === 'USED') {
      await logError(
        new Error('このアイテムは既に使用済みです'),
        {
          userId,
          route: '/api/users/[userId]/items/[historyId]/use',
          customData: { userItemId: userItemIdNum },
        },
        request
      );
      return NextResponse.json(
        { error: 'このアイテムは既に使用済みです' },
        { status: 400 }
      );
    }

    // 使用可能期間のチェック（任意設定）
    const now = new Date();
    const useStartAt = userItem.item?.useStartAt ?? null;
    const useEndAt = userItem.item?.useEndAt ?? null;
    if (useStartAt && now < useStartAt) {
      await logError(
        new Error('このアイテムはまだ使用できません（使用開始前）'),
        {
          userId,
          route: '/api/users/[userId]/items/[historyId]/use',
          customData: {
            userItemId: userItemIdNum,
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
            userItemId: userItemIdNum,
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

    if (!userItem.itemId) {
      await logError(
        new Error('アイテムIDが見つかりません'),
        {
          userId,
          route: '/api/users/[userId]/items/[historyId]/use',
          customData: { userItemId: userItemIdNum },
        },
        request
      );
      return NextResponse.json(
        { error: 'アイテムIDが見つかりません' },
        { status: 400 }
      );
    }

    // UserItemを使用済みに更新
    await prisma.userItem.update({
      where: {
        id: userItemIdNum,
        userId: userId,
      },
      data: {
        status: 'USED',
      },
    });

    // 使用ログを作成（ItemUsageLog）
    await prisma.itemUsageLog.create({
      data: {
        userId: userId,
        itemId: userItem.itemId,
        userItemId: userItemIdNum,
        usedAt: new Date(),
      },
    });

    // UserItemからアイテム情報を再取得
    const userItemWithItem = await prisma.userItem.findFirst({
      where: {
        id: userItemIdNum,
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

    if (!userItemWithItem || !userItemWithItem.item) {
      await logError(
        new Error('アイテム情報の取得に失敗しました'),
        {
          userId,
          route: '/api/users/[userId]/items/[historyId]/use',
          customData: { userItemId: userItemIdNum },
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
        id: userItemWithItem.id,
        item: userItemWithItem.item,
        createdAt: userItemWithItem.createdAt,
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

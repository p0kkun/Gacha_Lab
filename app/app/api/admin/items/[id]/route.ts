import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * アイテム詳細を取得
 * GET /api/admin/items/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

    const item = await prisma.gachaItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            gachaHistories: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'アイテムが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('アイテム詳細取得エラー:', error);
    return NextResponse.json(
      { error: 'アイテム詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * アイテムを更新
 * PUT /api/admin/items/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      rarity,
      videoUrl,
      imageUrl,
      gachaTypeId,
      usageType,
      isActive,
      useStartAt,
      useEndAt,
    } = body;

    // バリデーション
    if (!name || !rarity) {
      return NextResponse.json(
        { error: '名前とレアリティは必須です' },
        { status: 400 }
      );
    }

    const start = typeof useStartAt === 'string' && useStartAt ? new Date(useStartAt) : null;
    const end = typeof useEndAt === 'string' && useEndAt ? new Date(useEndAt) : null;
    if (start && Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: '使用開始日時が無効です' }, { status: 400 });
    }
    if (end && Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: '使用期限が無効です' }, { status: 400 });
    }
    if (start && end && start > end) {
      return NextResponse.json(
        { error: '使用期限は使用開始日時より後である必要があります' },
        { status: 400 }
      );
    }

    const item = await prisma.gachaItem.update({
      where: { id },
      data: {
        name,
        rarity,
        videoUrl: videoUrl || '',
        imageUrl: imageUrl || null,
        gachaTypeId: gachaTypeId || null,
        usageType: usageType || 'IMAGE',
        isActive: isActive ?? true,
        useStartAt: start,
        useEndAt: end,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('アイテム更新エラー:', error);
    return NextResponse.json(
      { error: 'アイテムの更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * アイテムを削除（論理削除）
 * DELETE /api/admin/items/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Next.js 16ではparamsがPromiseなので、awaitでアンラップする必要がある
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

    // 論理削除（isActiveをfalseに設定）
    const item = await prisma.gachaItem.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('アイテム削除エラー:', error);
    return NextResponse.json(
      { error: 'アイテムの削除に失敗しました' },
      { status: 500 }
    );
  }
}



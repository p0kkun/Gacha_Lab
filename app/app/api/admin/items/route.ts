import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * アイテム一覧を取得
 * GET /api/admin/items?isActive=true
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const name = searchParams.get('name');

    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    if (name && name.trim()) {
      where.name = {
        contains: name.trim(),
        mode: 'insensitive',
      };
    }

    const items = await prisma.gachaItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('アイテム一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'アイテム一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * アイテムを作成
 * POST /api/admin/items
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      imageUrl,
      usageType,
      isActive,
      useStartAt,
      useEndAt,
    } = body;

    // バリデーション
    if (!name) {
      return NextResponse.json(
        { error: '名前は必須です' },
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

    const item = await prisma.gachaItem.create({
      data: {
        name,
        description: description ?? null,
        imageUrl: imageUrl || null,
        usageType: usageType || 'IMAGE',
        isActive: isActive ?? true,
        useStartAt: start,
        useEndAt: end,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('アイテム作成エラー:', error);
    return NextResponse.json(
      { error: 'アイテムの作成に失敗しました' },
      { status: 500 }
    );
  }
}



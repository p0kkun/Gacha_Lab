import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * アイテム一覧を取得
 * GET /api/admin/items?rarity=xxx&isActive=true
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const rarity = searchParams.get('rarity');
    const gachaTypeId = searchParams.get('gachaTypeId');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (rarity) {
      where.rarity = rarity;
    }
    if (gachaTypeId) {
      if (gachaTypeId === 'null') {
        where.gachaTypeId = null;
      } else {
        where.gachaTypeId = gachaTypeId;
      }
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
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
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name, rarity, videoUrl, gachaTypeId, isActive } = body;

    // バリデーション
    if (!name || !rarity) {
      return NextResponse.json(
        { error: '名前とレアリティは必須です' },
        { status: 400 }
      );
    }

    const item = await prisma.gachaItem.create({
      data: {
        name,
        rarity,
        videoUrl: videoUrl || '',
        gachaTypeId: gachaTypeId || null,
        isActive: isActive ?? true,
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



import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * タグ一覧を取得
 * GET /api/admin/tags
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
    const tags = await prisma.tag.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            userTags: true,
          },
        },
      },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('タグ一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'タグ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * タグを作成
 * POST /api/admin/tags
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
    const { name, description } = body;

    // バリデーション
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'タグ名は必須です' },
        { status: 400 }
      );
    }

    // タグ名の重複チェック
    const existingTag = await prisma.tag.findUnique({
      where: { name: name.trim() },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'このタグ名は既に使用されています' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        description: description || null,
      },
    });

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('タグ作成エラー:', error);
    return NextResponse.json(
      { error: 'タグの作成に失敗しました' },
      { status: 500 }
    );
  }
}





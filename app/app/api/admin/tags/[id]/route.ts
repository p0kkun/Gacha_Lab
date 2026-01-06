import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * タグ詳細を取得
 * GET /api/admin/tags/[id]
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
    const { id } = await params;
    const tagId = parseInt(id);

    if (isNaN(tagId)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        _count: {
          select: {
            userTags: true,
          },
        },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('タグ詳細取得エラー:', error);
    return NextResponse.json(
      { error: 'タグ詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * タグを更新
 * PUT /api/admin/tags/[id]
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
    const { id } = await params;
    const tagId = parseInt(id);

    if (isNaN(tagId)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    // バリデーション
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'タグ名は必須です' },
        { status: 400 }
      );
    }

    // タグ名の重複チェック（自分自身を除く）
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: name.trim(),
        id: { not: tagId },
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'このタグ名は既に使用されています' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: {
        name: name.trim(),
        description: description || null,
      },
    });

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('タグ更新エラー:', error);
    return NextResponse.json(
      { error: 'タグの更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * タグを削除
 * DELETE /api/admin/tags/[id]
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
    const { id } = await params;
    const tagId = parseInt(id);

    if (isNaN(tagId)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

    // タグが使用されているかチェック
    const userTagCount = await prisma.userTag.count({
      where: { tagId },
    });

    if (userTagCount > 0) {
      return NextResponse.json(
        { error: `このタグは${userTagCount}人のユーザーに付与されているため削除できません。先にタグを削除してください。` },
        { status: 400 }
      );
    }

    await prisma.tag.delete({
      where: { id: tagId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('タグ削除エラー:', error);
    return NextResponse.json(
      { error: 'タグの削除に失敗しました' },
      { status: 500 }
    );
  }
}





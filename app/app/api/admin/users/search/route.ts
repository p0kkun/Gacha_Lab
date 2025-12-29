import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * ユーザー検索API
 * GET /api/admin/users/search?q=xxx
 * POST /api/admin/users/search (タグIDで検索)
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (!q.trim()) {
      return NextResponse.json({ users: [] });
    }

    // ユーザーを検索
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { userId: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        userId: true,
        displayName: true,
        pictureUrl: true,
        createdAt: true,
      },
      take: 50, // 最大50件
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('ユーザー検索エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー検索に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * タグIDでユーザーを検索
 * POST /api/admin/users/search
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tagIds } = body;

    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json({ users: [], count: 0 });
    }

    // タグIDの配列を数値に変換
    const tagIdNumbers = tagIds.map((id: string | number) => parseInt(String(id)));

    // タグに紐づくユーザーを取得
    const userTags = await prisma.userTag.findMany({
      where: {
        tagId: {
          in: tagIdNumbers,
        },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'], // 重複を除去
    });

    const userIds = userTags.map((ut) => ut.userId);

    if (userIds.length === 0) {
      return NextResponse.json({ users: [], count: 0 });
    }

    // ユーザー情報を取得
    const users = await prisma.user.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      select: {
        userId: true,
        displayName: true,
        pictureUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users, count: users.length });
  } catch (error) {
    console.error('タグユーザー検索エラー:', error);
    return NextResponse.json(
      { error: 'タグユーザー検索に失敗しました' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuthContext } from '@/lib/admin-auth';
import { recordTagAssignAction } from '@/lib/admin-action-history';

/**
 * ユーザーのタグ一覧を取得
 * GET /api/admin/users/[userId]/tags
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authContext = await getAdminAuthContext(request);
  if (!authContext) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { userId } = await params;

    const userTags = await prisma.userTag.findMany({
      where: { userId },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ userTags });
  } catch (error) {
    console.error('ユーザータグ取得エラー:', error);
    return NextResponse.json(
      { error: 'ユーザータグの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * ユーザーにタグを付与
 * POST /api/admin/users/[userId]/tags
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authContext = await getAdminAuthContext(request);
  if (!authContext) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { userId } = await params;
    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json(
        { error: 'タグIDが必要です' },
        { status: 400 }
      );
    }

    // ユーザーが存在するか確認
    const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // タグが存在するか確認
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      );
    }

    // 既に付与されているかチェック（重複防止）
    const existingUserTag = await prisma.userTag.findUnique({
      where: {
        userId_tagId: {
          userId,
          tagId,
        },
      },
    });

    if (existingUserTag) {
      return NextResponse.json(
        { error: 'このタグは既に付与されています' },
        { status: 400 }
      );
    }

    const userTag = await prisma.userTag.create({
      data: {
        userId,
        tagId,
      },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    const adminUser = await prisma.adminUser.findUnique({
      where: { id: authContext.adminUserId },
      select: { id: true, name: true },
    });

    // 操作履歴を記録
    await recordTagAssignAction({
      adminUserId: String(adminUser?.id ?? authContext.adminUserId),
      adminName: adminUser?.name ?? 'unknown',
      targetUserIds: [userId],
      tagId,
      tagName: tag.name,
      isBulk: false,
    });

    return NextResponse.json({ userTag });
  } catch (error) {
    console.error('タグ付与エラー:', error);
    return NextResponse.json(
      { error: 'タグの付与に失敗しました' },
      { status: 500 }
    );
  }
}


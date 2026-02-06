import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuthContext } from '@/lib/admin-auth';
import { recordAdminAction } from '@/lib/admin-action-history';
import { AdminActionType } from '@/lib/admin-action-types';

/**
 * ユーザーからタグを削除
 * DELETE /api/admin/users/[userId]/tags/[tagId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; tagId: string }> }
) {
  const authContext = await getAdminAuthContext(request);
  if (!authContext) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { userId, tagId } = await params;
    const tagIdNum = parseInt(tagId);

    if (isNaN(tagIdNum)) {
      return NextResponse.json(
        { error: '無効なタグIDです' },
        { status: 400 }
      );
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { id: authContext.adminUserId },
      select: { id: true, name: true },
    });

    const userTag = await prisma.userTag.findUnique({
      where: {
        userId_tagId: {
          userId,
          tagId: tagIdNum,
        },
      },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!userTag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      );
    }

    // ユーザータグを削除
    await prisma.userTag.delete({
      where: {
        userId_tagId: {
          userId,
          tagId: tagIdNum,
        },
      },
    });

    await recordAdminAction({
      actionType: AdminActionType.USER_TAG_REMOVE,
      adminUserId: String(adminUser?.id ?? authContext.adminUserId),
      adminName: adminUser?.name ?? 'unknown',
      targetUserId: userId,
      description: `ユーザーからタグ「${userTag.tag.name}」を削除`,
      metadata: {
        tagId: userTag.tag.id,
        tagName: userTag.tag.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // レコードが見つからない
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      );
    }

    console.error('タグ削除エラー:', error);
    return NextResponse.json(
      { error: 'タグの削除に失敗しました' },
      { status: 500 }
    );
  }
}









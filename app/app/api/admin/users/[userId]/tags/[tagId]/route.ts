import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * ユーザーからタグを削除
 * DELETE /api/admin/users/[userId]/tags/[tagId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; tagId: string }> }
) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
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

    // ユーザータグを削除
    await prisma.userTag.delete({
      where: {
        userId_tagId: {
          userId,
          tagId: tagIdNum,
        },
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




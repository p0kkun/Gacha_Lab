import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { recordVideoUpdateAction, recordVideoDeleteAction } from '@/lib/admin-action-history';

/**
 * 動画を更新
 * PATCH /api/admin/videos/[id]
 */
export async function PATCH(
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
    const videoId = parseInt(id);
    const body = await request.json();

    // 更新前のデータを取得
    const beforeVideo = await prisma.gachaVideo.findUnique({
      where: { id: videoId },
    });

    if (!beforeVideo) {
      return NextResponse.json(
        { error: '動画が見つかりません' },
        { status: 404 }
      );
    }

    const updatedVideo = await prisma.gachaVideo.update({
      where: { id: videoId },
      data: {
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        displayOrder: body.displayOrder !== undefined ? body.displayOrder : undefined,
        description: body.description !== undefined ? body.description : undefined,
      },
    });

    // 変更内容を記録
    const changes: Record<string, any> = {};
    if (body.isActive !== undefined && body.isActive !== beforeVideo.isActive) {
      changes.isActive = { from: beforeVideo.isActive, to: body.isActive };
    }
    if (body.displayOrder !== undefined && body.displayOrder !== beforeVideo.displayOrder) {
      changes.displayOrder = { from: beforeVideo.displayOrder, to: body.displayOrder };
    }
    if (body.description !== undefined && body.description !== beforeVideo.description) {
      changes.description = { from: beforeVideo.description, to: body.description };
    }

    // 操作履歴を記録
    if (Object.keys(changes).length > 0) {
      await recordVideoUpdateAction({
        videoId: updatedVideo.id,
        videoType: updatedVideo.videoType,
        rarity: updatedVideo.rarity,
        fileName: updatedVideo.fileName,
        changes,
      });
    }

    return NextResponse.json({
      success: true,
      video: updatedVideo,
    });
  } catch (error) {
    console.error('動画更新エラー:', error);
    return NextResponse.json(
      { error: '動画の更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * 動画を削除
 * DELETE /api/admin/videos/[id]
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
    const videoId = parseInt(id);

    // 削除前のデータを取得
    const video = await prisma.gachaVideo.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json(
        { error: '動画が見つかりません' },
        { status: 404 }
      );
    }

    // 削除前に操作履歴を記録（削除後に記録するとデータが取得できないため）
    try {
      await recordVideoDeleteAction({
        videoId: video.id,
        videoType: video.videoType,
        rarity: video.rarity ? String(video.rarity) : null,
        fileName: video.fileName,
      });
    } catch (historyError) {
      // 履歴記録の失敗はログに記録するが、削除操作は続行
      console.error('動画削除の操作履歴記録エラー:', historyError);
    }

    await prisma.gachaVideo.delete({
      where: { id: videoId },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('動画削除エラー:', error);
    return NextResponse.json(
      { error: '動画の削除に失敗しました' },
      { status: 500 }
    );
  }
}


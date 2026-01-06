import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

/**
 * 動画一覧を取得
 * GET /api/admin/videos?videoType=COMMON&rarity=FIRST_PRIZE
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
    const videoType = searchParams.get('videoType');
    const rarity = searchParams.get('rarity');

    const where: any = {};
    if (videoType) {
      where.videoType = videoType;
    }
    if (rarity) {
      where.rarity = rarity;
    }

    const videos = await prisma.gachaVideo.findMany({
      where,
      orderBy: [
        { videoType: 'asc' },
        { rarity: 'asc' },
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      videos,
    });
  } catch (error) {
    console.error('動画一覧取得エラー:', error);
    return NextResponse.json(
      { error: '動画一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}





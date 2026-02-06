import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { getVideoUrl } from '@/lib/s3-upload';

/**
 * 動画一覧を取得
 * GET /api/admin/videos?videoType=COMMON
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
    const videoType = searchParams.get('videoType');
    // NOTE: 旧API互換のため残すが、VideoAssetは等級を持たない（割当は別管理）
    // const rarity = searchParams.get('rarity');

    const where: any = {};

    // videoType=COMMON|RARITY のフィルタはカテゴリで表現
    const categoryFilter =
      videoType === 'COMMON'
        ? 'COMMON'
        : videoType === 'RARITY'
        ? 'TIER'
        : null;

    if (categoryFilter) {
      where.categories = { some: { category: categoryFilter } };
    }

    const assets = await prisma.videoAsset.findMany({
      where,
      include: { categories: true },
      orderBy: [{ createdAt: 'desc' }],
    });

    const videos = assets.map((a) => {
      const categories = (a.categories || []).map((c: any) => c.category);
      const inferredVideoType =
        categories.includes('COMMON') && !categories.includes('TIER')
          ? 'COMMON'
          : !categories.includes('COMMON') && categories.includes('TIER')
          ? 'RARITY'
          : categories.length > 0
          ? categories.includes('COMMON')
            ? 'COMMON'
            : 'RARITY'
          : 'COMMON';

      return {
        id: a.id,
        videoType: inferredVideoType,
        rarity: null,
        s3Key: a.s3Key,
        s3Url: getVideoUrl(a.s3Key),
        fileName: a.fileName,
        fileSize: a.fileSize,
        description: a.description,
        isActive: a.isActive,
        displayOrder: 0,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        categories,
      };
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




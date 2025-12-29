import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * デフォルト動画設定を取得
 * GET /api/admin/videos/default-settings
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
    // デフォルト設定を取得（1件のみ想定）
    const settings = await prisma.defaultGachaVideoSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    // 設定が存在しない場合は空の設定を返す
    if (!settings) {
      return NextResponse.json({
        settings: {
          id: null,
          commonVideoIds: [],
          rarityVideoIds: null,
        },
      });
    }

    return NextResponse.json({
      settings: {
        id: settings.id,
        commonVideoIds: settings.commonVideoIds || [],
        rarityVideoIds: settings.rarityVideoIds,
      },
    });
  } catch (error) {
    console.error('デフォルト動画設定取得エラー:', error);
    return NextResponse.json(
      { error: 'デフォルト動画設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * デフォルト動画設定を更新
 * POST /api/admin/videos/default-settings
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
    const { commonVideoIds, rarityVideoIds } = body;

    // バリデーション
    if (!Array.isArray(commonVideoIds)) {
      return NextResponse.json(
        { error: 'commonVideoIdsは配列である必要があります' },
        { status: 400 }
      );
    }

    // 既存の設定を取得
    const existingSettings = await prisma.defaultGachaVideoSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (existingSettings) {
      // 既存の設定を更新
      const updated = await prisma.defaultGachaVideoSettings.update({
        where: { id: existingSettings.id },
        data: {
          commonVideoIds: commonVideoIds || [],
          rarityVideoIds: rarityVideoIds || null,
        },
      });

      return NextResponse.json({
        success: true,
        settings: {
          id: updated.id,
          commonVideoIds: updated.commonVideoIds || [],
          rarityVideoIds: updated.rarityVideoIds,
        },
      });
    } else {
      // 新規作成
      const created = await prisma.defaultGachaVideoSettings.create({
        data: {
          commonVideoIds: commonVideoIds || [],
          rarityVideoIds: rarityVideoIds || null,
        },
      });

      return NextResponse.json({
        success: true,
        settings: {
          id: created.id,
          commonVideoIds: created.commonVideoIds || [],
          rarityVideoIds: created.rarityVideoIds,
        },
      });
    }
  } catch (error) {
    console.error('デフォルト動画設定更新エラー:', error);
    return NextResponse.json(
      { error: 'デフォルト動画設定の更新に失敗しました' },
      { status: 500 }
    );
  }
}


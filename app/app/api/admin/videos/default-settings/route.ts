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

    console.log('[デフォルト設定保存] リクエスト受信:', {
      commonVideoIds: commonVideoIds?.length || 0,
      rarityVideoIds: rarityVideoIds ? Object.keys(rarityVideoIds).length : 0,
    });

    // バリデーション
    if (!Array.isArray(commonVideoIds)) {
      console.error('[デフォルト設定保存] バリデーションエラー: commonVideoIdsが配列ではありません');
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
      console.log('[デフォルト設定保存] 既存設定を更新:', existingSettings.id);
      // 既存の設定を更新
      const updated = await prisma.defaultGachaVideoSettings.update({
        where: { id: existingSettings.id },
        data: {
          commonVideoIds: commonVideoIds || [],
          rarityVideoIds: rarityVideoIds || null,
        },
      });

      console.log('[デフォルト設定保存] 更新成功:', {
        id: updated.id,
        commonVideoIds: updated.commonVideoIds?.length || 0,
        rarityVideoIds: updated.rarityVideoIds ? Object.keys(updated.rarityVideoIds as Record<string, number[]>).length : 0,
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
      console.log('[デフォルト設定保存] 新規作成');
      // 新規作成
      const created = await prisma.defaultGachaVideoSettings.create({
        data: {
          commonVideoIds: commonVideoIds || [],
          rarityVideoIds: rarityVideoIds || null,
        },
      });

      console.log('[デフォルト設定保存] 作成成功:', {
        id: created.id,
        commonVideoIds: created.commonVideoIds?.length || 0,
        rarityVideoIds: created.rarityVideoIds ? Object.keys(created.rarityVideoIds as Record<string, number[]>).length : 0,
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
    console.error('[デフォルト設定保存] エラー:', error);
    return NextResponse.json(
      { error: 'デフォルト動画設定の更新に失敗しました' },
      { status: 500 }
    );
  }
}


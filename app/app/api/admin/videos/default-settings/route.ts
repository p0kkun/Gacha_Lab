import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * デフォルト動画設定を取得
 * GET /api/admin/videos/default-settings
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
    // デフォルト設定を取得（1件のみ想定）
    const settings = await prisma.defaultGachaVideoSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    // 設定が存在しない場合は空の設定を返す
    if (!settings) {
      return NextResponse.json({
        settings: {
          id: null,
          // commonVideoAssetIds: [], // 共通動画は使用しないためコメントアウト
          tierVideoAssetIds: null,
        },
      });
    }

    return NextResponse.json({
      settings: {
        id: settings.id,
        // commonVideoAssetIds: (settings as any).commonVideoAssetIds || [], // 共通動画は使用しないためコメントアウト
        tierVideoAssetIds: (settings as any).tierVideoAssetIds,
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
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    // const { commonVideoAssetIds, tierVideoAssetIds } = body; // 共通動画は使用しないためコメントアウト
    const { tierVideoAssetIds } = body;

    console.log('[デフォルト設定保存] リクエスト受信:', {
      // commonVideoAssetIds: commonVideoAssetIds?.length || 0, // 共通動画は使用しないためコメントアウト
      tierVideoAssetIds: tierVideoAssetIds ? Object.keys(tierVideoAssetIds).length : 0,
    });

    // バリデーション（共通動画は使用しないためコメントアウト）
    // if (!Array.isArray(commonVideoAssetIds)) {
    //   console.error('[デフォルト設定保存] バリデーションエラー: commonVideoIdsが配列ではありません');
    //   return NextResponse.json(
    //     { error: 'commonVideoAssetIdsは配列である必要があります' },
    //     { status: 400 }
    //   );
    // }

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
          // commonVideoAssetIds: commonVideoAssetIds || [], // 共通動画は使用しないためコメントアウト
          tierVideoAssetIds: tierVideoAssetIds || null,
        },
      });

      console.log('[デフォルト設定保存] 更新成功:', {
        id: updated.id,
        // commonVideoAssetIds: (updated as any).commonVideoAssetIds?.length || 0, // 共通動画は使用しないためコメントアウト
        tierVideoAssetIds: (updated as any).tierVideoAssetIds ? Object.keys((updated as any).tierVideoAssetIds as Record<string, number[]>).length : 0,
      });

      return NextResponse.json({
        success: true,
        settings: {
          id: updated.id,
          // commonVideoAssetIds: (updated as any).commonVideoAssetIds || [], // 共通動画は使用しないためコメントアウト
          tierVideoAssetIds: (updated as any).tierVideoAssetIds,
        },
      });
    } else {
      console.log('[デフォルト設定保存] 新規作成');
      // 新規作成
      const created = await prisma.defaultGachaVideoSettings.create({
        data: {
          // commonVideoAssetIds: commonVideoAssetIds || [], // 共通動画は使用しないためコメントアウト
          tierVideoAssetIds: tierVideoAssetIds || null,
        },
      });

      console.log('[デフォルト設定保存] 作成成功:', {
        id: created.id,
        // commonVideoAssetIds: (created as any).commonVideoAssetIds?.length || 0, // 共通動画は使用しないためコメントアウト
        tierVideoAssetIds: (created as any).tierVideoAssetIds ? Object.keys((created as any).tierVideoAssetIds as Record<string, number[]>).length : 0,
      });

      return NextResponse.json({
        success: true,
        settings: {
          id: created.id,
          // commonVideoAssetIds: (created as any).commonVideoAssetIds || [], // 共通動画は使用しないためコメントアウト
          tierVideoAssetIds: (created as any).tierVideoAssetIds,
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


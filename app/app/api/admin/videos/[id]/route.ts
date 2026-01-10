import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { recordVideoUpdateAction, recordVideoDeleteAction } from '@/lib/admin-action-history';
import { getVideoUrl } from '@/lib/s3-upload';

/**
 * 動画の使用状況を取得
 * GET /api/admin/videos/[id]/usage
 */
export async function GET(
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

    // 動画が存在するか確認
    const video = await prisma.videoAsset.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json(
        { error: '動画が見つかりません' },
        { status: 404 }
      );
    }

    // 使用状況を確認
    const usageInfo: {
      inDefaultSettings: boolean;
      inGachaTypes: Array<{ id: string; name: string }>;
    } = {
      inDefaultSettings: false,
      inGachaTypes: [],
    };

    // デフォルト設定で使用されているか確認
    const defaultSettings = await prisma.defaultGachaVideoSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (defaultSettings) {
      const commonVideoIds = (defaultSettings as any).commonVideoAssetIds || [];
      if (commonVideoIds.includes(videoId)) {
        usageInfo.inDefaultSettings = true;
      } else if ((defaultSettings as any).tierVideoAssetIds) {
        try {
          const rarityVideoIdsObj =
            typeof (defaultSettings as any).tierVideoAssetIds === 'string'
              ? JSON.parse((defaultSettings as any).tierVideoAssetIds)
              : (defaultSettings as any).tierVideoAssetIds;
          if (typeof rarityVideoIdsObj === 'object' && rarityVideoIdsObj !== null) {
            for (const rarity in rarityVideoIdsObj) {
              if (Array.isArray(rarityVideoIdsObj[rarity]) && rarityVideoIdsObj[rarity].includes(videoId)) {
                usageInfo.inDefaultSettings = true;
                break;
              }
            }
          }
        } catch (error) {
          // JSON解析エラーは無視
        }
      }
    }

    // 個別設定で使用されているガチャタイプを確認
    const allGachaTypes = await prisma.gachaType.findMany();
    for (const gachaType of allGachaTypes) {
      let isUsed = false;
      if ((gachaType as any).commonVideoAssetIds && Array.isArray((gachaType as any).commonVideoAssetIds) && (gachaType as any).commonVideoAssetIds.includes(videoId)) {
        isUsed = true;
      } else if ((gachaType as any).tierVideoAssetIds) {
        try {
          const rarityVideoIdsObj =
            typeof (gachaType as any).tierVideoAssetIds === 'string'
              ? JSON.parse((gachaType as any).tierVideoAssetIds)
              : (gachaType as any).tierVideoAssetIds;
          if (typeof rarityVideoIdsObj === 'object' && rarityVideoIdsObj !== null) {
            for (const rarity in rarityVideoIdsObj) {
              if (Array.isArray(rarityVideoIdsObj[rarity]) && rarityVideoIdsObj[rarity].includes(videoId)) {
                isUsed = true;
                break;
              }
            }
          }
        } catch (error) {
          // JSON解析エラーは無視
        }
      }
      if (isUsed) {
        usageInfo.inGachaTypes.push({
          id: (gachaType as any).code ?? String(gachaType.id),
          name: gachaType.name,
        });
      }
    }

    return NextResponse.json({
      usageInfo,
    });
  } catch (error) {
    console.error('使用状況取得エラー:', error);
    return NextResponse.json(
      { error: '使用状況の取得に失敗しました' },
      { status: 500 }
    );
  }
}

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
    const beforeVideo = await prisma.videoAsset.findUnique({
      where: { id: videoId },
    });

    if (!beforeVideo) {
      return NextResponse.json(
        { error: '動画が見つかりません' },
        { status: 404 }
      );
    }

    const updatedVideo = await prisma.videoAsset.update({
      where: { id: videoId },
      data: {
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        description: body.description !== undefined ? body.description : undefined,
      },
    });

    // 変更内容を記録
    const changes: Record<string, any> = {};
    if (body.isActive !== undefined && body.isActive !== beforeVideo.isActive) {
      changes.isActive = { from: beforeVideo.isActive, to: body.isActive };
    }
    if (body.description !== undefined && body.description !== beforeVideo.description) {
      changes.description = { from: beforeVideo.description, to: body.description };
    }

    // 操作履歴を記録
    if (Object.keys(changes).length > 0) {
      await recordVideoUpdateAction({
        videoId: updatedVideo.id,
        videoType: 'UNKNOWN',
        rarity: null,
        fileName: updatedVideo.fileName,
        changes,
      });
    }

    return NextResponse.json({
      success: true,
      video: {
        ...updatedVideo,
        s3Url: getVideoUrl(updatedVideo.s3Key),
      },
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
    const video = await prisma.videoAsset.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json(
        { error: '動画が見つかりません' },
        { status: 404 }
      );
    }

    // 使用状況を確認
    const usageInfo: {
      inDefaultSettings: boolean;
      inGachaTypes: Array<{ id: string; name: string }>;
    } = {
      inDefaultSettings: false,
      inGachaTypes: [],
    };

    // デフォルト設定で使用されているか確認
    const defaultSettings = await prisma.defaultGachaVideoSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (defaultSettings) {
      const commonVideoIds = (defaultSettings as any).commonVideoAssetIds || [];
      if (commonVideoIds.includes(videoId)) {
        usageInfo.inDefaultSettings = true;
      } else if ((defaultSettings as any).tierVideoAssetIds) {
        try {
          const rarityVideoIdsObj =
            typeof (defaultSettings as any).tierVideoAssetIds === 'string'
              ? JSON.parse((defaultSettings as any).tierVideoAssetIds)
              : (defaultSettings as any).tierVideoAssetIds;
          if (typeof rarityVideoIdsObj === 'object' && rarityVideoIdsObj !== null) {
            for (const rarity in rarityVideoIdsObj) {
              if (Array.isArray(rarityVideoIdsObj[rarity]) && rarityVideoIdsObj[rarity].includes(videoId)) {
                usageInfo.inDefaultSettings = true;
                break;
              }
            }
          }
        } catch (error) {
          // JSON解析エラーは無視
        }
      }
    }

    // 個別設定で使用されているガチャタイプを確認
    const allGachaTypes = await prisma.gachaType.findMany();
    for (const gachaType of allGachaTypes) {
      let isUsed = false;
      if ((gachaType as any).commonVideoAssetIds && Array.isArray((gachaType as any).commonVideoAssetIds) && (gachaType as any).commonVideoAssetIds.includes(videoId)) {
        isUsed = true;
      } else if ((gachaType as any).tierVideoAssetIds) {
        try {
          const rarityVideoIdsObj = typeof (gachaType as any).tierVideoAssetIds === 'string'
            ? JSON.parse((gachaType as any).tierVideoAssetIds)
            : (gachaType as any).tierVideoAssetIds;
          if (typeof rarityVideoIdsObj === 'object' && rarityVideoIdsObj !== null) {
            for (const rarity in rarityVideoIdsObj) {
              if (Array.isArray(rarityVideoIdsObj[rarity]) && rarityVideoIdsObj[rarity].includes(videoId)) {
                isUsed = true;
                break;
              }
            }
          }
        } catch (error) {
          // JSON解析エラーは無視
        }
      }
      if (isUsed) {
        usageInfo.inGachaTypes.push({
          id: (gachaType as any).code ?? String(gachaType.id),
          name: gachaType.name,
        });
      }
    }

    // 削除前に操作履歴を記録（削除後に記録するとデータが取得できないため）
    try {
      await recordVideoDeleteAction({
        videoId: video.id,
        videoType: 'UNKNOWN',
        rarity: null,
        fileName: video.fileName,
      });
    } catch (historyError) {
      // 履歴記録の失敗はログに記録するが、削除操作は続行
      console.error('動画削除の操作履歴記録エラー:', historyError);
    }

    // デフォルト設定から動画IDを削除
    try {
      const defaultSettings = await prisma.defaultGachaVideoSettings.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (defaultSettings) {
        let needsUpdate = false;
        const updatedCommonVideoIds = (defaultSettings as any).commonVideoAssetIds || [];
        const updatedRarityVideoIds = (defaultSettings as any).tierVideoAssetIds
          ? (typeof (defaultSettings as any).tierVideoAssetIds === 'string'
              ? JSON.parse((defaultSettings as any).tierVideoAssetIds)
              : (defaultSettings as any).tierVideoAssetIds)
          : null;

        // 共通動画から削除
        if (updatedCommonVideoIds.includes(videoId)) {
          const index = updatedCommonVideoIds.indexOf(videoId);
          updatedCommonVideoIds.splice(index, 1);
          needsUpdate = true;
          console.log(`[動画削除] デフォルト設定の共通動画からID ${videoId} を削除`);
        }

        // 等級別動画から削除
        if (updatedRarityVideoIds && typeof updatedRarityVideoIds === 'object') {
          const rarityVideoIdsObj = updatedRarityVideoIds as Record<string, number[]>;
          for (const rarity in rarityVideoIdsObj) {
            if (Array.isArray(rarityVideoIdsObj[rarity])) {
              const index = rarityVideoIdsObj[rarity].indexOf(videoId);
              if (index !== -1) {
                rarityVideoIdsObj[rarity].splice(index, 1);
                needsUpdate = true;
                console.log(`[動画削除] デフォルト設定の等級別動画(${rarity})からID ${videoId} を削除`);
              }
            }
          }
        }

        if (needsUpdate) {
          await prisma.defaultGachaVideoSettings.update({
            where: { id: defaultSettings.id },
            data: {
              commonVideoAssetIds: updatedCommonVideoIds,
              tierVideoAssetIds: updatedRarityVideoIds,
            },
          });
          console.log(`[動画削除] デフォルト設定を更新しました`);
        }
      }
    } catch (defaultSettingsError) {
      // デフォルト設定の更新失敗はログに記録するが、削除操作は続行
      console.error('デフォルト設定からの動画ID削除エラー:', defaultSettingsError);
    }

    // 個別設定（GachaType）から動画IDを削除
    try {
      // すべてのガチャタイプを取得して、JavaScriptでフィルタリング
      const allGachaTypes = await prisma.gachaType.findMany();
      const gachaTypes = allGachaTypes.filter((gt) => {
        // 共通動画に含まれているか確認
        if (gt.commonVideoAssetIds && Array.isArray(gt.commonVideoAssetIds) && gt.commonVideoAssetIds.includes(videoId)) {
          return true;
        }
        // 等級別動画に含まれているか確認
        if (gt.tierVideoAssetIds) {
          try {
            const tierVideoAssetIdsObj = typeof gt.tierVideoAssetIds === 'string'
              ? JSON.parse(gt.tierVideoAssetIds)
              : gt.tierVideoAssetIds;
            if (typeof tierVideoAssetIdsObj === 'object' && tierVideoAssetIdsObj !== null) {
              for (const tier in tierVideoAssetIdsObj) {
                if (Array.isArray(tierVideoAssetIdsObj[tier]) && tierVideoAssetIdsObj[tier].includes(videoId)) {
                  return true;
                }
              }
            }
          } catch (error) {
            // JSON解析エラーは無視
          }
        }
        return false;
      });

      for (const gachaType of gachaTypes) {
        let needsUpdate = false;
        const updatedCommonVideoIds = (gachaType as any).commonVideoAssetIds || [];
        const updatedRarityVideoIds = (gachaType as any).tierVideoAssetIds
          ? (typeof (gachaType as any).tierVideoAssetIds === 'string'
              ? JSON.parse((gachaType as any).tierVideoAssetIds)
              : (gachaType as any).tierVideoAssetIds)
          : null;

        // 共通動画から削除
        if (updatedCommonVideoIds.includes(videoId)) {
          const index = updatedCommonVideoIds.indexOf(videoId);
          updatedCommonVideoIds.splice(index, 1);
          needsUpdate = true;
          console.log(`[動画削除] ガチャタイプ ${gachaType.id} の共通動画からID ${videoId} を削除`);
        }

        // 等級別動画から削除
        if (updatedRarityVideoIds && typeof updatedRarityVideoIds === 'object') {
          const rarityVideoIdsObj = updatedRarityVideoIds as Record<string, number[]>;
          for (const rarity in rarityVideoIdsObj) {
            if (Array.isArray(rarityVideoIdsObj[rarity])) {
              const index = rarityVideoIdsObj[rarity].indexOf(videoId);
              if (index !== -1) {
                rarityVideoIdsObj[rarity].splice(index, 1);
                needsUpdate = true;
                console.log(`[動画削除] ガチャタイプ ${gachaType.id} の等級別動画(${rarity})からID ${videoId} を削除`);
              }
            }
          }
        }

        if (needsUpdate) {
          await prisma.gachaType.update({
            where: { id: gachaType.id },
            data: {
              commonVideoAssetIds: updatedCommonVideoIds,
              tierVideoAssetIds: updatedRarityVideoIds,
            } as any,
          });
          console.log(`[動画削除] ガチャタイプ ${gachaType.id} の設定を更新しました`);
        }
      }
    } catch (gachaTypeError) {
      // 個別設定の更新失敗はログに記録するが、削除操作は続行
      console.error('個別設定からの動画ID削除エラー:', gachaTypeError);
    }

    // 動画を削除
    await prisma.videoAsset.delete({
      where: { id: videoId },
    });

    console.log(`[動画削除] 動画ID ${videoId} の削除が完了しました`);

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


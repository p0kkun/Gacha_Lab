import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { recordVideoUploadAction } from "@/lib/admin-action-history";
import { getVideoUrl } from "@/lib/s3-upload";

/**
 * S3にアップロードされた動画をDBに登録
 * POST /api/admin/videos/register
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { s3Key, fileName, fileSize, videoType, rarity, description } = body;

    if (!s3Key || !fileName || !videoType) {
      return NextResponse.json(
        { error: "必要なパラメータが不足しています" },
        { status: 400 }
      );
    }

    if (videoType !== "COMMON" && videoType !== "RARITY") {
      return NextResponse.json(
        { error: "動画タイプが不正です" },
        { status: 400 }
      );
    }

    // 等級はガチャ設定側で選択するため、ここではバリデーションしない

    // DBに登録（VideoAsset）
    const asset = await prisma.videoAsset.create({
      data: {
        s3Key,
        fileName,
        fileSize: fileSize || 0,
        description: description || null,
        isActive: true,
      },
    });

    // カテゴリ付与（用途はマスタから分離）
    const category = videoType === "COMMON" ? "COMMON" : "TIER";
    await prisma.videoAssetCategory.create({
      data: { assetId: asset.id, category },
    });

    // 操作履歴を記録
    await recordVideoUploadAction({
      videoId: asset.id,
      videoType: videoType,
      rarity: rarity || null,
      fileName,
      fileSize: fileSize || 0,
      description: description || null,
    });

    return NextResponse.json({
      success: true,
      video: {
        id: asset.id,
        videoType: videoType,
        rarity: null,
        s3Url: getVideoUrl(asset.s3Key),
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        description: asset.description,
        isActive: asset.isActive,
      },
    });
  } catch (error) {
    console.error("動画登録エラー:", error);
    const errorMessage =
      error instanceof Error ? error.message : "動画の登録に失敗しました";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

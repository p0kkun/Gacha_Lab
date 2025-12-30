import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { GachaVideoType, Rarity } from ".prisma/client";
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

    if (videoType === "RARITY" && !rarity) {
      return NextResponse.json(
        { error: "等級別動画の場合は等級を指定してください" },
        { status: 400 }
      );
    }

    // S3 URLを生成
    const s3Url = getVideoUrl(s3Key);

    // DBに登録
    const gachaVideo = await prisma.gachaVideo.create({
      data: {
        videoType: videoType as GachaVideoType,
        rarity: rarity ? (rarity as Rarity) : null,
        s3Key,
        s3Url,
        fileName,
        fileSize: fileSize || 0,
        description: description || null,
        isActive: true,
        displayOrder: 0,
        updatedAt: new Date(),
      },
    });

    // 操作履歴を記録
    await recordVideoUploadAction({
      videoId: gachaVideo.id,
      videoType: videoType,
      rarity: rarity || null,
      fileName,
      fileSize: fileSize || 0,
      description: description || null,
    });

    return NextResponse.json({
      success: true,
      video: {
        id: gachaVideo.id,
        videoType: gachaVideo.videoType,
        rarity: gachaVideo.rarity,
        s3Url: gachaVideo.s3Url,
        fileName: gachaVideo.fileName,
        fileSize: gachaVideo.fileSize,
        description: gachaVideo.description,
        isActive: gachaVideo.isActive,
      },
    });
  } catch (error) {
    console.error("動画登録エラー:", error);
    const errorMessage =
      error instanceof Error ? error.message : "動画の登録に失敗しました";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

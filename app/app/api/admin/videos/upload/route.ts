import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { uploadVideoToS3, generateS3Key } from "@/lib/s3-upload";
import { prisma } from "@/lib/prisma";
import { recordVideoUploadAction } from "@/lib/admin-action-history";
import { getVideoUrl } from "@/lib/s3-upload";

/**
 * 動画ファイルをS3にアップロードし、DBに登録
 * POST /api/admin/videos/upload
 *
 * 注意: AWS Amplifyのリクエストサイズ制限（約4MB）を超える場合は、
 * Presigned URL方式の実装を検討してください。
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const videoType = formData.get("videoType") as string;
    const rarity = formData.get("rarity") as string | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが指定されていません" },
        { status: 400 }
      );
    }

    if (!videoType || (videoType !== "COMMON" && videoType !== "RARITY")) {
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

    // ファイルサイズチェック（100MB制限）
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "ファイルサイズが100MBを超えています" },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "サポートされていないファイル形式です。MP4、WebM、MOVのみ対応しています",
        },
        { status: 400 }
      );
    }

    // S3キーを生成（動画ファイルとして）
    const s3Key = generateS3Key(
      "video",
      videoType as "COMMON" | "RARITY",
      rarity,
      file.name
    );

    // S3にアップロード
    await uploadVideoToS3(file, s3Key, file.type);

    // DBに登録（VideoAsset）
    const asset = await prisma.videoAsset.create({
      data: {
        s3Key,
        fileName: file.name,
        fileSize: file.size,
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
    const adminUserId = formData.get('adminUserId')?.toString() || 'unknown';
    const adminName = formData.get('adminName')?.toString() || 'unknown';
    await recordVideoUploadAction({
      adminUserId,
      adminName,
      videoId: asset.id,
      videoType: videoType,
      rarity: rarity || null,
      fileName: file.name,
      fileSize: file.size,
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
    console.error("動画アップロードエラー:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "動画のアップロードに失敗しました";
    const errorDetails = error instanceof Error ? error.stack : String(error);

    // エラーの詳細をログに記録（本番環境でも確認できるように）
    console.error("動画アップロードエラー詳細:", {
      message: errorMessage,
      details: errorDetails,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generatePresignedUploadUrl, generateS3Key } from "@/lib/s3-upload";

/**
 * 動画アップロード用のPresigned URLを生成
 * POST /api/admin/videos/presigned-url
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fileName, videoType, rarity, contentType, fileSize } = body;

    if (!fileName || !videoType || !contentType) {
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

    // ファイルサイズチェック（100MB制限）
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: "ファイルサイズが100MBを超えています" },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        {
          error:
            "サポートされていないファイル形式です。MP4、WebM、MOVのみ対応しています",
        },
        { status: 400 }
      );
    }

    // S3キーを生成
    const s3Key = generateS3Key(
      "video",
      videoType as "COMMON" | "RARITY",
      rarity || null,
      fileName
    );

    // Presigned URLを生成（1時間有効）
    const presignedUrl = await generatePresignedUploadUrl(
      s3Key,
      contentType,
      3600
    );

    return NextResponse.json({
      success: true,
      presignedUrl,
      s3Key,
    });
  } catch (error) {
    console.error("Presigned URL生成エラー:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Presigned URLの生成に失敗しました";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

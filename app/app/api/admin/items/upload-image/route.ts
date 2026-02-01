import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { uploadImageToS3, generateItemImageS3Key } from '@/lib/s3-upload';

/**
 * アイテムの使用画像をS3にアップロード
 * POST /api/admin/items/upload-image
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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const itemId = formData.get('itemId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        { error: 'アイテムIDが指定されていません' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ファイルサイズが10MBを超えています' },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です。PNG、JPEG、GIF、WebPのみ対応しています' },
        { status: 400 }
      );
    }

    // S3キーを生成
    const s3Key = generateItemImageS3Key(parseInt(itemId), file.name);

    // S3にアップロード
    const { s3Url } = await uploadImageToS3(file, s3Key, file.type);

    return NextResponse.json({
      success: true,
      imageUrl: s3Url,
      s3Key,
    });
  } catch (error) {
    console.error('画像アップロードエラー:', error);
    return NextResponse.json(
      { error: '画像のアップロードに失敗しました' },
      { status: 500 }
    );
  }
}









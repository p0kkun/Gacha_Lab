import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthContext, verifyAdminAuth } from '@/lib/admin-auth';
import { uploadImageToS3, generateGachaTypeIconS3Key } from '@/lib/s3-upload';
import { prisma } from '@/lib/prisma';
import { recordAdminAction } from '@/lib/admin-action-history';
import { AdminActionType } from '@/lib/admin-action-types';

/**
 * ガチャタイプのアイコン画像をS3にアップロード
 * POST /api/admin/gacha-types/upload-icon
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
    const authContext = await getAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { id: authContext.adminUserId },
      select: { id: true, name: true, email: true },
    });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const gachaTypeId = formData.get('gachaTypeId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    if (!gachaTypeId) {
      return NextResponse.json(
        { error: 'ガチャタイプIDが指定されていません' },
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
    const s3Key = generateGachaTypeIconS3Key(gachaTypeId, file.name);

    // S3にアップロード
    const { s3Url } = await uploadImageToS3(file, s3Key, file.type);

    await recordAdminAction({
      actionType: AdminActionType.GACHA_TYPE_ICON_UPDATE,
      adminUserId: String(adminUser?.id ?? authContext.adminUserId),
      adminName: adminUser?.name ?? adminUser?.email ?? String(authContext.adminUserId),
      description: `ガチャタイプのアイコンを更新: ${gachaTypeId}`,
      metadata: {
        gachaTypeId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        s3Key,
        imageUrl: s3Url,
      },
    });

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









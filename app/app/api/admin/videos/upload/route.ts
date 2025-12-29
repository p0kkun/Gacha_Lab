import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { uploadVideoToS3, generateS3Key } from '@/lib/s3-upload';
import { prisma } from '@/lib/prisma';
import { GachaVideoType, Rarity } from '@prisma/client';
import { recordVideoUploadAction } from '@/lib/admin-action-history';

/**
 * 動画ファイルをS3にアップロードし、DBに登録
 * POST /api/admin/videos/upload
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
    const videoType = formData.get('videoType') as string;
    const rarity = formData.get('rarity') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    if (!videoType || (videoType !== 'COMMON' && videoType !== 'RARITY')) {
      return NextResponse.json(
        { error: '動画タイプが不正です' },
        { status: 400 }
      );
    }

    if (videoType === 'RARITY' && !rarity) {
      return NextResponse.json(
        { error: '等級別動画の場合は等級を指定してください' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（100MB制限）
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ファイルサイズが100MBを超えています' },
        { status: 400 }
      );
    }

    // ファイルタイプチェック
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です。MP4、WebM、MOVのみ対応しています' },
        { status: 400 }
      );
    }

    // S3キーを生成（動画ファイルとして）
    const s3Key = generateS3Key(
      'video',
      videoType as 'COMMON' | 'RARITY',
      rarity,
      file.name
    );

    // S3にアップロード
    const { s3Url } = await uploadVideoToS3(file, s3Key, file.type);

    // DBに登録
    const gachaVideo = await prisma.gachaVideo.create({
      data: {
        videoType: videoType as GachaVideoType,
        rarity: rarity ? (rarity as Rarity) : null,
        s3Key,
        s3Url,
        fileName: file.name,
        fileSize: file.size,
        description: description || null,
        isActive: true,
        displayOrder: 0,
      },
    });

    // 操作履歴を記録
    await recordVideoUploadAction({
      videoId: gachaVideo.id,
      videoType: videoType,
      rarity: rarity || null,
      fileName: file.name,
      fileSize: file.size,
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
    console.error('動画アップロードエラー:', error);
    return NextResponse.json(
      { error: '動画のアップロードに失敗しました' },
      { status: 500 }
    );
  }
}


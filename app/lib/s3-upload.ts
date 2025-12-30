import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// LocalStackを使用するかどうか（環境変数で制御）
const USE_LOCALSTACK = process.env.USE_LOCALSTACK === 'true';
const LOCALSTACK_ENDPOINT = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';

// S3クライアントの初期化
const s3Client = new S3Client({
  region: process.env.S3_REGION || process.env.AWS_REGION || 'ap-northeast-1',
  endpoint: USE_LOCALSTACK ? LOCALSTACK_ENDPOINT : undefined,
  forcePathStyle: USE_LOCALSTACK, // LocalStackではパススタイルが必要
  credentials: USE_LOCALSTACK
    ? {
        // LocalStackでは任意の値でOK
        accessKeyId: 'test',
        secretAccessKey: 'test',
      }
    : {
        // AmplifyではAWS_で始まる環境変数が予約語のため、S3_プレフィックスを使用
        accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
      },
});

// AmplifyではAWS_で始まる環境変数が予約語のため、S3_プレフィックスを使用（後方互換性のためAWS_もサポート）
const BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || '';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || process.env.AWS_CLOUDFRONT_DOMAIN || '';
const LOCALSTACK_BASE_URL = process.env.LOCALSTACK_BASE_URL || 'http://localhost:4566';

/**
 * S3にファイルをアップロード（汎用）
 */
export async function uploadFileToS3(
  file: File | Buffer,
  key: string,
  contentType: string
): Promise<{ s3Key: string; s3Url: string }> {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAMEまたはAWS_S3_BUCKET_NAME環境変数が設定されていません');
  }

  const fileBuffer = file instanceof File ? await file.arrayBuffer() : file;
  const buffer = Buffer.from(fileBuffer instanceof ArrayBuffer ? new Uint8Array(fileBuffer) : fileBuffer);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'max-age=31536000', // 1年間キャッシュ
  });

  await s3Client.send(command);

  // URLを生成（LocalStackとAWSで異なる）
  let s3Url: string;
  if (USE_LOCALSTACK) {
    // LocalStackの場合: http://localhost:4566/[バケット名]/[キー]
    s3Url = `${LOCALSTACK_BASE_URL}/${BUCKET_NAME}/${key}`;
  } else if (CLOUDFRONT_DOMAIN) {
    // CloudFront経由のURL
    s3Url = `https://${CLOUDFRONT_DOMAIN}/${key}`;
  } else {
    // 直接S3のURL
    const region = process.env.S3_REGION || process.env.AWS_REGION || 'ap-northeast-1';
    s3Url = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
  }

  return {
    s3Key: key,
    s3Url,
  };
}

/**
 * S3に動画ファイルをアップロード
 */
export async function uploadVideoToS3(
  file: File | Buffer,
  key: string,
  contentType: string = 'video/mp4'
): Promise<{ s3Key: string; s3Url: string }> {
  return uploadFileToS3(file, key, contentType);
}

/**
 * S3に画像ファイルをアップロード
 */
export async function uploadImageToS3(
  file: File | Buffer,
  key: string,
  contentType: string = 'image/png'
): Promise<{ s3Key: string; s3Url: string }> {
  return uploadFileToS3(file, key, contentType);
}

/**
 * S3キーから動画URLを生成
 */
export function getVideoUrl(s3Key: string): string {
  if (USE_LOCALSTACK) {
    // LocalStackの場合
    return `${LOCALSTACK_BASE_URL}/${BUCKET_NAME}/${s3Key}`;
  } else if (CLOUDFRONT_DOMAIN) {
    // CloudFront経由のURL
    return `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
  }
  // 直接S3のURL
  const region = process.env.S3_REGION || process.env.AWS_REGION || 'ap-northeast-1';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;
}

/**
 * ファイルタイプ（動画 or 画像）
 */
export type FileType = 'video' | 'image';

/**
 * ファイルのS3キーを生成
 * @param fileType ファイルタイプ（video or image）
 * @param videoType 動画タイプ（COMMON or RARITY）
 * @param rarity 等級（RARITYの場合のみ）
 * @param fileName 元のファイル名
 */
export function generateS3Key(
  fileType: FileType,
  videoType: 'COMMON' | 'RARITY',
  rarity: string | null,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const basePath = fileType === 'video' ? 'videos' : 'images';

  if (videoType === 'COMMON') {
    return `${basePath}/common/${timestamp}_${sanitizedFileName}`;
  } else {
    const rarityPath = rarity?.toLowerCase().replace('_', '-') || 'unknown';
    return `${basePath}/rarity/${rarityPath}/${timestamp}_${sanitizedFileName}`;
  }
}

/**
 * ガチャタイプのアイコン画像のS3キーを生成
 * @param gachaTypeId ガチャタイプID
 * @param fileName 元のファイル名
 */
export function generateGachaTypeIconS3Key(
  gachaTypeId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const sanitizedGachaTypeId = gachaTypeId.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `images/gacha-types/${sanitizedGachaTypeId}/${timestamp}_${sanitizedFileName}`;
}

/**
 * アイテムの使用画像のS3キーを生成
 * @param itemId アイテムID
 * @param fileName 元のファイル名
 */
export function generateItemImageS3Key(
  itemId: number,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `images/items/${itemId}/${timestamp}_${sanitizedFileName}`;
}


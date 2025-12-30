import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // AWS Amplifyで環境変数がLambda関数に正しく渡されるようにする
  env: {
    // 環境変数を明示的に設定（AWS Amplifyの環境変数から読み込む）
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
    DATABASE_URL: process.env.DATABASE_URL || "",
    LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
    LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || "",
    ADMIN_ACCESS_KEYWORD: process.env.ADMIN_ACCESS_KEYWORD || "",
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL || "",
    // S3関連の環境変数（サーバーサイドでのみ使用、クライアントには公開しない）
    S3_REGION: process.env.S3_REGION || process.env.AWS_REGION || "",
    S3_ACCESS_KEY_ID:
      process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
    S3_SECRET_ACCESS_KEY:
      process.env.S3_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      "",
    S3_BUCKET_NAME:
      process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || "",
    CLOUDFRONT_DOMAIN:
      process.env.CLOUDFRONT_DOMAIN || process.env.AWS_CLOUDFRONT_DOMAIN || "",
    USE_LOCALSTACK: process.env.USE_LOCALSTACK || "false",
  },
};

export default nextConfig;

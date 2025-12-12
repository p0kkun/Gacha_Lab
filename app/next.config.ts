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
  },
};

export default nextConfig;

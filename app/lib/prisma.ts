// Prismaクライアントのシングルトン実装
// Next.jsの開発環境でのホットリロードに対応
// Prisma 7では、prisma.config.tsでDATABASE_URLを設定

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// PostgreSQLアダプターの作成（Prisma 7の新しい方式）
// AWS RDSへの接続時は、SSL設定を明示的に指定
const databaseUrl = process.env.DATABASE_URL || "";

// デバッグ用（本番環境では削除）
if (process.env.NODE_ENV === "development") {
  console.log("[Prisma] DATABASE_URL exists:", !!databaseUrl);
  console.log("[Prisma] DATABASE_URL starts with prisma+:", databaseUrl.startsWith("prisma+"));
  console.log("[Prisma] DATABASE_URL length:", databaseUrl.length);
  console.log("[Prisma] DATABASE_URL preview:", databaseUrl.substring(0, 50) + "...");
}

const isPrismaDataPlatform = databaseUrl.startsWith("prisma+");
const isRds = databaseUrl.includes("rds.amazonaws.com");

// Prisma Data Platformを使用する場合はadapterを使用しない
let adapter: PrismaPg | undefined = undefined;
if (!isPrismaDataPlatform && databaseUrl) {
  // DATABASE_URLからSSLパラメータを削除（pgのSSL設定で上書きするため）
  const cleanUrl = databaseUrl.replace(/[?&]sslmode=[^&]*/g, "");

  const pool = new Pool({
    connectionString: cleanUrl,
    // AWS RDSへの接続時は、SSLを有効化し、証明書の検証を無効化
    ssl: isRds
      ? {
          rejectUnauthorized: false, // AWS RDSの自己署名証明書を許可
        }
      : false, // ローカル環境ではSSLを無効化
  });

  adapter = new PrismaPg(pool);
}

// PrismaClientの初期化
// Prisma Data Platformを使用する場合はオプションなしで初期化
// 通常のPostgreSQL接続の場合はadapterを使用
const createPrismaClient = () => {
  const logOptions: ("query" | "error" | "warn")[] =
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"];

  // デバッグ用（本番環境では削除）
  if (process.env.NODE_ENV === "development") {
    console.log("[Prisma] Creating PrismaClient with options:", {
      isPrismaDataPlatform,
      hasAdapter: !!adapter,
      logOptions,
    });
  }

  // Prisma Data Platformを使用する場合は、オプションなしで初期化
  if (isPrismaDataPlatform) {
    const options = {
      log: logOptions,
    };
    if (process.env.NODE_ENV === "development") {
      console.log("[Prisma] Using Prisma Data Platform, options:", options);
    }
    return new PrismaClient(options);
  }

  // 通常のPostgreSQL接続でadapterが存在する場合は使用
  if (adapter) {
    const options = {
      adapter,
      log: logOptions,
    };
    if (process.env.NODE_ENV === "development") {
      console.log("[Prisma] Using adapter, options:", { hasAdapter: true, logOptions });
    }
    return new PrismaClient(options);
  }

  // その他の場合はlogのみ設定
  const options = {
    log: logOptions,
  };
  if (process.env.NODE_ENV === "development") {
    console.log("[Prisma] Using default options:", options);
  }
  return new PrismaClient(options);
};

// PrismaClientの初期化（デバッグログ付き）
if (process.env.NODE_ENV === "development") {
  console.log("[Prisma] Initializing PrismaClient...");
  console.log("[Prisma] globalForPrisma.prisma exists:", !!globalForPrisma.prisma);
}

// 既存のインスタンスが存在する場合でも、正しく初期化されているか確認
// 開発環境では、既存のインスタンスが問題を抱えている可能性があるため、再初期化を試みる
if (!globalForPrisma.prisma) {
  if (process.env.NODE_ENV === "development") {
    console.log("[Prisma] Creating new PrismaClient instance");
  }
  try {
    globalForPrisma.prisma = createPrismaClient();
    if (process.env.NODE_ENV === "development") {
      console.log("[Prisma] PrismaClient created successfully");
    }
  } catch (error) {
    console.error("[Prisma] Failed to create PrismaClient:", error);
    throw error;
  }
} else {
  // 既存のインスタンスが存在する場合、正しく動作するか確認
  if (process.env.NODE_ENV === "development") {
    console.log("[Prisma] Using existing PrismaClient instance");
    // 既存のインスタンスが正しく初期化されているか確認
    try {
      // インスタンスが正しく初期化されているか確認
      const instance = globalForPrisma.prisma;
      if (!instance || typeof instance.$connect !== 'function' || typeof instance.user === 'undefined') {
        console.warn("[Prisma] Existing instance seems invalid, recreating...");
        globalForPrisma.prisma = createPrismaClient();
        if (process.env.NODE_ENV === "development") {
          console.log("[Prisma] PrismaClient recreated successfully");
        }
      }
    } catch (error) {
      console.error("[Prisma] Error checking existing instance:", error);
      // エラーが発生した場合は再作成
      console.warn("[Prisma] Recreating PrismaClient due to error...");
      globalForPrisma.prisma = createPrismaClient();
      if (process.env.NODE_ENV === "development") {
        console.log("[Prisma] PrismaClient recreated successfully after error");
      }
    }
  }
}

export const prisma = globalForPrisma.prisma!;

// データベース接続をテストする関数
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    // 簡単なクエリで接続を確認
    await prisma.$queryRaw`SELECT 1`;
    console.log("[Prisma] データベース接続テスト成功");
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Prisma] データベース接続テスト失敗:", errorMessage);
    return false;
  }
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

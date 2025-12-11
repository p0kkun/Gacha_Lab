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
const isRds = databaseUrl.includes("rds.amazonaws.com");

// DATABASE_URLからSSLパラメータを削除（pgのSSL設定で上書きするため）
const cleanUrl = databaseUrl.replace(/[?&]sslmode=[^&]*/g, "");

const pool = databaseUrl
  ? new Pool({
      connectionString: cleanUrl,
      // AWS RDSへの接続時は、SSLを有効化し、証明書の検証を無効化
      ssl: isRds
        ? {
            rejectUnauthorized: false, // AWS RDSの自己署名証明書を許可
          }
        : false, // ローカル環境ではSSLを無効化
    })
  : undefined;

const adapter = pool ? new PrismaPg(pool) : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(adapter && { adapter }),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

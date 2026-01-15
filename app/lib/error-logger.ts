import { NextRequest } from "next/server";

/**
 * エラーログのメタデータ型
 */
type ErrorLogMetadata = {
  userId?: string;
  route?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  requestBody?: unknown;
  queryParams?: Record<string, string>;
  timestamp?: string;
  environment?: string;
  [key: string]: unknown;
};

/**
 * リクエストからメタデータを抽出
 */
function extractRequestMetadata(request: NextRequest): Partial<ErrorLogMetadata> {
  const url = new URL(request.url);
  const metadata: Partial<ErrorLogMetadata> = {
    route: url.pathname,
    method: request.method,
    userAgent: request.headers.get("user-agent") || undefined,
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      undefined,
    queryParams: Object.fromEntries(url.searchParams.entries()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
  };

  return metadata;
}

/**
 * リクエストボディからユーザーIDを抽出（共通パターン）
 */
async function extractUserIdFromRequest(
  request: NextRequest
): Promise<string | undefined> {
  try {
    // リクエストボディを取得（既に読み取られている場合はエラーになる可能性があるため、try-catchで囲む）
    const body = await request
      .clone()
      .json()
      .catch(() => null);

    if (body && typeof body === "object") {
      // 一般的なパターン: body.userId
      if (typeof body.userId === "string") {
        return body.userId;
      }
      // パスパラメータから取得（例: /api/users/[userId]/...）
      const url = new URL(request.url);
      const pathMatch = url.pathname.match(/\/users\/([^\/]+)/);
      if (pathMatch) {
        return pathMatch[1];
      }
    }
  } catch {
    // リクエストボディの読み取りに失敗した場合は無視
  }

  return undefined;
}

/**
 * エラーログを出力（CloudWatch対応）
 * AWS Amplifyは自動的にconsole.log/console.errorをCloudWatchに出力します
 *
 * @param error エラーオブジェクト
 * @param context コンテキスト情報（ユーザーID、ルーティング情報など）
 * @param request リクエストオブジェクト（オプション）
 */
export async function logError(
  error: unknown,
  context?: {
    userId?: string;
    route?: string;
    customData?: Record<string, unknown>;
  },
  request?: NextRequest
): Promise<void> {
  try {
    const metadata: ErrorLogMetadata = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      ...context,
    };

    // リクエストからメタデータを抽出
    if (request) {
      const requestMetadata = extractRequestMetadata(request);
      Object.assign(metadata, requestMetadata);

      // ユーザーIDがコンテキストにない場合、リクエストから抽出を試みる
      if (!metadata.userId) {
        const extractedUserId = await extractUserIdFromRequest(request);
        if (extractedUserId) {
          metadata.userId = extractedUserId;
        }
      }
    }

    // エラー情報を構造化
    const errorInfo = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
    };

    // CloudWatchに出力される構造化ログ
    // JSON形式で出力することで、CloudWatch Logs Insightsで検索・分析しやすくなる
    console.error(
      JSON.stringify({
        level: "ERROR",
        error: errorInfo,
        metadata,
        ...(context?.customData && { customData: context.customData }),
      })
    );

    // 人間が読みやすい形式でも出力（開発環境用）
    if (process.env.NODE_ENV === "development") {
      console.error("エラー詳細:", {
        エラーメッセージ: errorInfo.message,
        エラータイプ: errorInfo.name,
        ユーザーID: metadata.userId || "不明",
        ルート: metadata.route || "不明",
        メソッド: metadata.method || "不明",
        タイムスタンプ: metadata.timestamp,
        ...(context?.customData && { カスタムデータ: context.customData }),
      });
    }
  } catch (logError) {
    // ログ出力自体が失敗した場合（通常は発生しない）
    console.error("ログ出力エラー:", logError);
    console.error("元のエラー:", error);
  }
}

/**
 * 簡易版エラーログ（リクエストオブジェクトがない場合）
 */
export function logErrorSimple(
  error: unknown,
  context?: {
    userId?: string;
    route?: string;
    customData?: Record<string, unknown>;
  }
): void {
  const metadata: ErrorLogMetadata = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    ...context,
  };

  const errorInfo = {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.constructor.name : typeof error,
    stack: error instanceof Error ? error.stack : undefined,
  };

  // CloudWatchに出力される構造化ログ
  console.error(
    JSON.stringify({
      level: "ERROR",
      error: errorInfo,
      metadata,
      ...(context?.customData && { customData: context.customData }),
    })
  );

  // 人間が読みやすい形式でも出力（開発環境用）
  if (process.env.NODE_ENV === "development") {
    console.error("エラー詳細:", {
      エラーメッセージ: errorInfo.message,
      エラータイプ: errorInfo.name,
      ユーザーID: metadata.userId || "不明",
      ルート: metadata.route || "不明",
      タイムスタンプ: metadata.timestamp,
      ...(context?.customData && { カスタムデータ: context.customData }),
    });
  }
}

import Redis from "ioredis";

/**
 * Redisクライアントのシングルトンインスタンス
 */
let redisClient: Redis | null = null;

/**
 * Redisクライアントを取得（シングルトン）
 */
function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  let redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("REDIS_URLが設定されていません。キャッシュ機能は無効です。");
    return null;
  }

  // 環境変数にダブルクォートが含まれている場合に削除
  redisUrl = redisUrl.trim().replace(/^["']|["']$/g, "");

  try {
    // rediss://（TLS）接続の場合は、明示的にTLS設定を行う
    const isTls = redisUrl.startsWith("rediss://");
    const options: {
      maxRetriesPerRequest: number;
      retryStrategy: (times: number) => number;
      enableReadyCheck: boolean;
      enableOfflineQueue: boolean;
      lazyConnect?: boolean;
      tls?: {
        rejectUnauthorized: boolean;
      };
    } = {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
      enableOfflineQueue: true, // 接続確立前のリクエストをキューに保存
      lazyConnect: false, // 即座に接続を試みる
    };

    // TLS接続の場合
    if (isTls) {
      options.tls = {
        rejectUnauthorized: false, // Upstashの証明書検証をスキップ（必要に応じて）
      };
    }

    redisClient = new Redis(redisUrl, options);

    redisClient.on(
      "error",
      (error: Error & { code?: string; errno?: number; syscall?: string }) => {
        console.error("Redis接続エラー:", error);
        console.error("エラー詳細:", {
          message: error.message,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
        });
      }
    );

    redisClient.on("connect", () => {
      console.log("Redis接続成功");
    });

    redisClient.on("ready", () => {
      console.log("Redis準備完了");
    });

    return redisClient;
  } catch (error) {
    console.error("Redisクライアント初期化エラー:", error);
    console.error("エラー詳細:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    return null;
  }
}

/**
 * キャッシュから値を取得
 * @param key キャッシュキー
 * @returns キャッシュされた値（JSONパース済み）、存在しない場合やエラーの場合はnull
 *
 * Redisエラーが発生した場合、nullを返して呼び出し元で直接取得（DB取得）にフォールバックする
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) {
    // Redisクライアントが存在しない場合は、直接取得にフォールバック
    return null;
  }

  try {
    // Redis接続状態を確認
    if (client.status !== "ready") {
      console.warn(
        `Redis未接続のため直接取得にフォールバック (key: ${key}, status: ${client.status})`
      );
      return null;
    }

    const value = await client.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    // Redisエラーが発生した場合、ログに記録してnullを返す
    // 呼び出し元で直接取得（DB取得）にフォールバックする
    console.warn(
      `Redisエラーのため直接取得にフォールバック (key: ${key}):`,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * キャッシュに値を設定
 * @param key キャッシュキー
 * @param value キャッシュする値（JSONシリアライズ可能なオブジェクト）
 * @param ttlSeconds TTL（秒）
 *
 * Redisエラーが発生した場合、ログに記録するがアプリケーションの動作は継続する
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    // Redisクライアントが存在しない場合は、キャッシュ設定をスキップ（動作は継続）
    return;
  }

  try {
    // 接続が確立されていない場合は、短いタイムアウトで待機を試みる
    if (client.status !== "ready") {
      // 接続待機のタイムアウトを短縮（2秒）
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Redis接続タイムアウト"));
        }, 2000);

        if (client.status === "ready") {
          clearTimeout(timeout);
          resolve();
          return;
        }

        client.once("ready", () => {
          clearTimeout(timeout);
          resolve();
        });

        client.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }

    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
  } catch (error) {
    // Redisエラーが発生した場合、ログに記録するがアプリケーションの動作は継続
    // キャッシュはなくても動作するため、エラーを無視する
    console.warn(
      `キャッシュ設定エラー（動作は継続します） (key: ${key}):`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * キャッシュから値を削除
 * @param key キャッシュキー
 *
 * Redisエラーが発生した場合、ログに記録するがアプリケーションの動作は継続する
 */
export async function deleteCache(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    // 接続状態を確認
    if (client.status !== "ready") {
      console.warn(
        `Redis未接続のためキャッシュ削除をスキップ (key: ${key}, status: ${client.status})`
      );
      return;
    }

    await client.del(key);
  } catch (error) {
    // Redisエラーが発生した場合、ログに記録するがアプリケーションの動作は継続
    console.warn(
      `キャッシュ削除エラー（動作は継続します） (key: ${key}):`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 複数のキーを一括削除（パターンマッチ）
 * @param pattern キーパターン（例: 'point-balance:*'）
 *
 * Redisエラーが発生した場合、ログに記録するがアプリケーションの動作は継続する
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    // 接続状態を確認
    if (client.status !== "ready") {
      console.warn(
        `Redis未接続のためキャッシュパターン削除をスキップ (pattern: ${pattern}, status: ${client.status})`
      );
      return;
    }

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    // Redisエラーが発生した場合、ログに記録するがアプリケーションの動作は継続
    console.warn(
      `キャッシュパターン削除エラー（動作は継続します） (pattern: ${pattern}):`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Redis接続を閉じる（アプリケーション終了時など）
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

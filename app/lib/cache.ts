import Redis from 'ioredis';
import { logError } from './error-logger';

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

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('REDIS_URLが設定されていません。キャッシュ機能は無効です。');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
      enableOfflineQueue: false,
    });

    redisClient.on('error', (error) => {
      console.error('Redis接続エラー:', error);
    });

    redisClient.on('connect', () => {
      console.log('Redis接続成功');
    });

    return redisClient;
  } catch (error) {
    console.error('Redisクライアント初期化エラー:', error);
    return null;
  }
}

/**
 * キャッシュから値を取得
 * @param key キャッシュキー
 * @returns キャッシュされた値（JSONパース済み）、存在しない場合はnull
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const value = await client.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    // キャッシュエラーはログに記録するが、アプリケーションの動作は継続
    console.error(`キャッシュ取得エラー (key: ${key}):`, error);
    return null;
  }
}

/**
 * キャッシュに値を設定
 * @param key キャッシュキー
 * @param value キャッシュする値（JSONシリアライズ可能なオブジェクト）
 * @param ttlSeconds TTL（秒）
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
  } catch (error) {
    // キャッシュエラーはログに記録するが、アプリケーションの動作は継続
    console.error(`キャッシュ設定エラー (key: ${key}):`, error);
  }
}

/**
 * キャッシュから値を削除
 * @param key キャッシュキー
 */
export async function deleteCache(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    await client.del(key);
  } catch (error) {
    console.error(`キャッシュ削除エラー (key: ${key}):`, error);
  }
}

/**
 * 複数のキーを一括削除（パターンマッチ）
 * @param pattern キーパターン（例: 'point-balance:*'）
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error(`キャッシュパターン削除エラー (pattern: ${pattern}):`, error);
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

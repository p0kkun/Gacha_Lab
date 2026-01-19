/**
 * キャッシュキー管理クラス
 * 全てのキャッシュキーを一元管理し、キー生成と削除を統一する
 * 
 * 使用例:
 * - キー生成: CacheKeys.pointBalance(userId)
 * - パターン削除: deleteCachePattern(CacheKeys.pointBalancePattern())
 */
export class CacheKeys {
  // ========== ポイント残高 ==========
  /** ポイント残高キャッシュキー */
  static pointBalance(userId: string): string {
    return `point-balance:${userId}`;
  }
  /** ポイント残高キャッシュのパターン（全ユーザー） */
  static pointBalancePattern(): string {
    return 'point-balance:*';
  }

  // ========== ユーザー統計情報 ==========
  /** ユーザー統計情報（全体）キャッシュキー（後方互換性のため残す） */
  static userStats(userId: string): string {
    return `user-stats:${userId}`;
  }
  /** ユーザー統計情報（ガチャ実行情報）キャッシュキー */
  static userStatsGacha(userId: string): string {
    return `user-stats-gacha:${userId}`;
  }
  /** ユーザー統計情報（アイテム情報）キャッシュキー */
  static userStatsItems(userId: string): string {
    return `user-stats-items:${userId}`;
  }
  /** ユーザー統計情報キャッシュのパターン（全種類・全ユーザー） */
  static userStatsPattern(): string {
    return 'user-stats*:*';
  }

  // ========== マスターデータ ==========
  /** ポイント購入プラン一覧キャッシュキー */
  static pointPurchasePlans(): string {
    return 'point-purchase-plans';
  }

  // ========== パターン削除用 ==========
  /** 全てのキャッシュのパターン（全削除用・注意して使用） */
  static allPattern(): string {
    return '*';
  }
}

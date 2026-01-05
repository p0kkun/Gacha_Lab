/**
 * ポイント関連のユーティリティ関数
 */

/**
 * 有効期限の残り日数を計算
 * @param expiresAt 有効期限日時（Date | string | null）
 * @returns 残り日数（nullの場合はnull、期限切れの場合は0）
 */
export function calculateDaysUntilExpiry(expiresAt: Date | string | null): number | null {
  if (!expiresAt) {
    return null;
  }

  const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // 期限切れの場合は0を返す
  return diffDays < 0 ? 0 : diffDays;
}

/**
 * 有効期限の表示テキストを生成
 * @param expiresAt 有効期限日時（Date | string | null）
 * @returns 表示テキスト（例: "あと3日"、"期限切れ"、"無期限"）
 */
export function formatExpiryText(expiresAt: Date | string | null): string {
  if (!expiresAt) {
    return '無期限';
  }

  const days = calculateDaysUntilExpiry(expiresAt);
  
  if (days === null) {
    return '無期限';
  }

  if (days === 0) {
    return '期限切れ';
  }

  if (days === 1) {
    return 'あと1日';
  }

  return `あと${days}日`;
}

/**
 * 有効期限の日付をフォーマット
 * @param expiresAt 有効期限日時（Date | string | null）
 * @returns フォーマットされた日付文字列（例: "2025/12/31"）
 */
export function formatExpiryDate(expiresAt: Date | string | null): string | null {
  if (!expiresAt) {
    return null;
  }

  const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiryDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}




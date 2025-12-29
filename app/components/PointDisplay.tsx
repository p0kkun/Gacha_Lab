'use client';

import { formatExpiryText, formatExpiryDate } from '@/lib/point-utils';

type PointBalances = {
  paid: number;
  free: number;
  total: number;
  paidExpiresAt: string | null;
  freeExpiresAt: string | null;
  lastUpdated: string | null;
};

type PointDisplayProps = {
  pointBalances: PointBalances | null;
  displayMode?: 'combined' | 'separated'; // 統合表示 or 分離表示
  showExpiry?: boolean; // 有効期限を表示するか
  size?: 'small' | 'medium' | 'large'; // 表示サイズ
  className?: string;
};

/**
 * ポイント表示コンポーネント
 * - 統合表示: 有償+無償の合計を表示
 * - 分離表示: 有償と無償を分けて表示（ガチャ画面などで使用）
 */
export default function PointDisplay({
  pointBalances,
  displayMode = 'combined',
  showExpiry = true,
  size = 'medium',
  className = '',
}: PointDisplayProps) {
  if (!pointBalances) {
    return (
      <div className={`text-gray-500 ${className}`}>
        <div className="text-sm">読み込み中...</div>
      </div>
    );
  }

  const sizeClasses = {
    small: {
      total: 'text-lg',
      label: 'text-xs',
      detail: 'text-xs',
    },
    medium: {
      total: 'text-xl',
      label: 'text-sm',
      detail: 'text-xs',
    },
    large: {
      total: 'text-3xl',
      label: 'text-base',
      detail: 'text-sm',
    },
  };

  const currentSize = sizeClasses[size];

  // 統合表示
  if (displayMode === 'combined') {
    return (
      <div className={`${className}`}>
        <div className={`${currentSize.label} text-gray-500`}>ポイント</div>
        <div className={`${currentSize.total} font-bold text-blue-600`}>
          {pointBalances.total.toLocaleString()}
        </div>
        {showExpiry && (pointBalances.paidExpiresAt || pointBalances.freeExpiresAt) && (
          <div className={`${currentSize.detail} mt-1 text-gray-500`}>
            {pointBalances.paidExpiresAt && (
              <div>
                有償: {formatExpiryText(pointBalances.paidExpiresAt)}
                {formatExpiryDate(pointBalances.paidExpiresAt) && (
                  <span className="ml-1">
                    ({formatExpiryDate(pointBalances.paidExpiresAt)})
                  </span>
                )}
              </div>
            )}
            {pointBalances.freeExpiresAt && (
              <div>
                無償: {formatExpiryText(pointBalances.freeExpiresAt)}
                {formatExpiryDate(pointBalances.freeExpiresAt) && (
                  <span className="ml-1">
                    ({formatExpiryDate(pointBalances.freeExpiresAt)})
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 分離表示（ガチャ画面などで使用）- コンパクトな横並び表示
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* 合計ポイント */}
      <div className="flex items-baseline gap-1">
        <span className={`${currentSize.label} text-gray-500`}>$</span>
        <span className={`${currentSize.total} font-bold text-gray-800`}>
          {pointBalances.total.toLocaleString()}
        </span>
      </div>
      
      {/* 有償ポイント */}
      <div className="flex items-baseline gap-1">
        <span className={`${currentSize.label} text-gray-500`}>有償</span>
        <span className={`text-sm font-semibold text-blue-600`}>
          ${pointBalances.paid.toLocaleString()}
        </span>
      </div>
      
      {/* 無償ポイント */}
      <div className="flex items-baseline gap-1">
        <span className={`${currentSize.label} text-gray-500`}>無償</span>
        <span className={`text-sm font-semibold text-green-600`}>
          +${pointBalances.free.toLocaleString()}
        </span>
      </div>
      
      {/* 有効期限（オプション、小さく表示） */}
      {showExpiry && (pointBalances.paidExpiresAt || pointBalances.freeExpiresAt) && (
        <div className={`${currentSize.detail} text-gray-400 ml-auto`}>
          {pointBalances.paidExpiresAt && (
            <span className="mr-2">
              有償: {formatExpiryText(pointBalances.paidExpiresAt)}
            </span>
          )}
          {pointBalances.freeExpiresAt && (
            <span>
              無償: {formatExpiryText(pointBalances.freeExpiresAt)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}


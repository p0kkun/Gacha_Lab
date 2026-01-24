'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Prize = {
  itemId: number;
  itemName: string;
  itemDescription: string | null;
  itemImageUrl: string | null;
  itemUsageType: string;
  weight: number;
  probability: number;
};

type TierInfo = {
  tierCode: string;
  tierLabel: string;
  displayOrder: number;
  tierWeight: number;
  tierProbability: number;
  prizes: Prize[];
};

type PrizeListData = {
  gachaTypeId: string;
  gachaTypeName: string;
  totalTierWeight: number;
  tiers: TierInfo[];
};

type PrizeListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  gachaTypeId: string;
};

export default function PrizeListModal({
  isOpen,
  onClose,
  gachaTypeId,
}: PrizeListModalProps) {
  const [data, setData] = useState<PrizeListData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && gachaTypeId) {
      fetchPrizeList();
    }
  }, [isOpen, gachaTypeId]);

  const fetchPrizeList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gacha/prizes?gachaTypeId=${gachaTypeId}`);
      if (!res.ok) {
        throw new Error('景品一覧の取得に失敗しました');
      }
      const data = await res.json();
      setData(data);
    } catch (err: any) {
      console.error('景品一覧取得エラー:', err);
      setError(err.message || '景品一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-green-900 to-green-800 px-6 py-4">
          <h2 className="text-xl font-bold text-yellow-300">景品一覧</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            aria-label="閉じる"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">読み込み中...</div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600">{error}</div>
          ) : data ? (
            <div className="p-6">
              <div className="mb-4 text-center">
                <h3 className="text-lg font-semibold text-gray-800">{data.gachaTypeName}</h3>
                <p className="mt-1 text-sm text-gray-600">各景品の獲得確率</p>
              </div>

              {/* 等級別に表示 */}
              <div className="space-y-6">
                {data.tiers.map((tier) => (
                  <div key={tier.tierCode} className="rounded-lg border-2 border-gray-200 bg-gray-50">
                    {/* 等級ヘッダー */}
                    <div className="border-b border-gray-300 bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-gray-800">{tier.tierLabel}</h4>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">等級確率</div>
                          <div className="text-lg font-bold text-blue-600">
                            {tier.tierProbability.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 景品一覧 */}
                    {tier.prizes.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        この等級には景品が設定されていません
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {tier.prizes.map((prize, index) => (
                          <div key={`${tier.tierCode}-${prize.itemId}-${index}`} className="p-4">
                            <div className="flex items-start gap-4">
                              {prize.itemImageUrl && (
                                <img
                                  src={prize.itemImageUrl}
                                  alt={prize.itemName}
                                  className="h-16 w-16 flex-shrink-0 rounded-lg object-cover border border-gray-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-semibold text-gray-800 break-words">
                                      {prize.itemName}
                                    </h5>
                                    {prize.itemDescription && (
                                      <p className="mt-1 text-sm text-gray-600 break-words">
                                        {prize.itemDescription}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0 text-right">
                                    <div className="text-sm text-gray-600">獲得確率</div>
                                    <div className="text-lg font-bold text-green-600">
                                      {prize.probability.toFixed(3)}%
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 法的リンク */}
              <div className="mt-8 border-t border-gray-200 pt-6">
                <div className="space-y-2 text-center text-xs text-gray-600">
                  <p>※ 表示されている確率は理論値です。実際の抽選結果は異なる場合があります。</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      利用規約
                    </Link>
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      プライバシーポリシー
                    </Link>
                    <Link
                      href="/commercial-transaction"
                      target="_blank"
                      className="text-blue-600 hover:underline"
                    >
                      特定商取引法に基づく表記
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

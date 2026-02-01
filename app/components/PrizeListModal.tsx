'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Prize = {
  itemId: number;
  itemName: string;
  itemDescription: string | null;
  itemImageUrl: string | null;
  itemUsageType: string;
  rewardType: string;
  points: number;
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
  startAt?: string | null;
  endAt?: string | null;
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

  const formatDate = (value?: string | null): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(
      date.getDate()
    )}`;
  };

  const formatPeriod = (start?: string | null, end?: string | null): string => {
    const startText = formatDate(start);
    const endText = formatDate(end);
    if (startText && endText) return `${startText}〜${endText}`;
    if (startText) return `${startText}〜`;
    if (endText) return `〜${endText}`;
    return '未設定';
  };

  const formatProbability = (value: number): string => {
    if (!Number.isFinite(value)) return '0%';
    const digits = value < 1 ? 1 : 1;
    return `${value.toFixed(digits)}%`;
  };

  const getTierContent = (tier: TierInfo): string => {
    const descriptions = tier.prizes
      .map((prize) => prize.itemDescription?.trim())
      .filter((value): value is string => Boolean(value));
    if (descriptions.length > 0) {
      return Array.from(new Set(descriptions)).join(' / ');
    }
    const names = tier.prizes
      .map((prize) => {
        if (prize.rewardType === 'POINTS') {
          const pointsLabel = Number.isFinite(prize.points)
            ? prize.points.toLocaleString()
            : '0';
          return `ポイント付与: ${pointsLabel}ポイント`;
        }
        return prize.itemName?.trim();
      })
      .filter((value): value is string => Boolean(value));
    if (names.length > 0) {
      return Array.from(new Set(names)).join(' / ');
    }
    return '記載なし';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl" style={{ backgroundColor: '#e9dacb' }}>
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4" style={{ backgroundColor: '#d4c4b0', borderColor: '#b8a896' }}>
          <h2 className="text-xl font-bold" style={{ color: '#4a3a2a' }}>景品一覧</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', color: '#5a4a3a' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
            }}
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
              <div style={{ color: '#6b5a4a' }}>読み込み中...</div>
            </div>
          ) : error ? (
            <div className="p-6 text-center" style={{ color: '#ef4444' }}>{error}</div>
          ) : data ? (
            <div className="p-6">
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-lg font-semibold" style={{ color: '#4a3a2a' }}>
                    ガチャ提供割合（排出確率）表示
                  </h3>
                  <p className="mt-2 text-sm" style={{ color: '#6b5a4a' }}>
                    本サービスにおける各ガチャの賞品提供割合（排出確率）は以下の通りです。
                  </p>
                  <p className="mt-1 text-sm" style={{ color: '#6b5a4a' }}>
                    表示される確率は統計的な理論値であり、特定結果を保証するものではありません。
                  </p>
                </div>

                <div className="rounded-lg border-2 p-4" style={{ borderColor: '#b89f7a', backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                  <div className="mb-4 text-sm font-semibold" style={{ color: '#4a3a2a' }}>
                    ■ {data.gachaTypeName}（販売期間：{formatPeriod(data.startAt, data.endAt)}）
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-700">
                      <thead>
                        <tr className="border-b" style={{ borderColor: '#b89f7a' }}>
                          <th className="py-2">賞品名</th>
                          <th className="py-2">内容</th>
                          <th className="py-2 text-right">提供割合</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: '#e0d1bd' }}>
                        {data.tiers.map((tier) => (
                          <tr key={tier.tierCode}>
                            <td className="py-2 font-medium">{tier.tierLabel}</td>
                            <td className="py-2">{getTierContent(tier)}</td>
                            <td className="py-2 text-right font-semibold" style={{ color: '#8b6f47' }}>
                              {formatProbability(tier.tierProbability)}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td className="py-2 font-semibold">合計</td>
                          <td className="py-2"> </td>
                          <td className="py-2 text-right font-semibold" style={{ color: '#8b6f47' }}>
                            {formatProbability(
                              data.tiers.reduce((sum, tier) => sum + tier.tierProbability, 0)
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3 text-sm" style={{ color: '#6b5a4a' }}>
                  <div className="font-semibold">■ 提供割合に関する説明</div>
                  <ul className="list-disc space-y-1 pl-6">
                    <li>提供割合は抽選1回ごとの当選確率を示します。</li>
                    <li>抽選は独立した確率で実施され、回数を重ねても特定賞品の当選確率が上昇することはありません。</li>
                    <li>抽選結果はシステムによりランダムに決定されます。</li>
                    <li>在庫状況やキャンペーンにより、提供割合が変更される場合があります。その場合は事前に表示内容を更新します。</li>
                  </ul>
                </div>

                <div className="space-y-3 text-sm" style={{ color: '#6b5a4a' }}>
                  <div className="font-semibold">■ 注意事項</div>
                  <ul className="list-disc space-y-1 pl-6">
                    <li>画像はイメージを含み、実際の賞品と異なる場合があります。</li>
                    <li>賞品の市場価格は変動する場合があります。</li>
                    <li>本サービスは娯楽提供を目的としたものであり、支払額以上の価値取得を保証するものではありません。</li>
                    <li>不正行為が確認された場合、当選は無効となる場合があります。</li>
                  </ul>
                </div>

                <div className="border-t pt-4" style={{ borderColor: '#b89f7a' }}>
                  <div className="flex flex-wrap justify-center gap-4 text-xs">
                    <Link
                      href="/terms"
                      target="_blank"
                      className="hover:underline"
                      style={{ color: '#8b6f47' }}
                    >
                      利用規約
                    </Link>
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="hover:underline"
                      style={{ color: '#8b6f47' }}
                    >
                      プライバシーポリシー
                    </Link>
                    <Link
                      href="/commercial-transaction"
                      target="_blank"
                      className="hover:underline"
                      style={{ color: '#8b6f47' }}
                    >
                      特定商取引法に基づく表記
                    </Link>
                    <Link
                      href="/compensation-policy"
                      target="_blank"
                      className="hover:underline"
                      style={{ color: '#8b6f47' }}
                    >
                      課金トラブル時の補填ポリシー
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

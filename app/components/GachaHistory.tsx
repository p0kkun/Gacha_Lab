'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BottomNavigation from './BottomNavigation';

type GachaHistoryItem = {
  id: number;
  createdAt: string;
  gachaType: {
    id: string;
    name: string;
  };
  item: {
    id: number;
    name: string;
    rarity: string;
  };
  pointsUsed: number;
};

type PrizeTier = {
  code: string;
  label: string;
  displayOrder: number;
};

type GachaHistoryProps = {
  userId: string;
};

export default function GachaHistory({ userId }: GachaHistoryProps) {
  const [histories, setHistories] = useState<GachaHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [prizeTiers, setPrizeTiers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPrizeTiers();
  }, []);

  useEffect(() => {
    fetchHistories();
  }, [userId, page]);

  const fetchPrizeTiers = async () => {
    try {
      const res = await fetch('/api/prize-tiers');
      if (res.ok) {
        const data = await res.json();
        const tierMap: Record<string, string> = {};
        if (Array.isArray(data.tiers)) {
          data.tiers.forEach((tier: PrizeTier) => {
            tierMap[tier.code] = tier.label;
          });
        }
        setPrizeTiers(tierMap);
      }
    } catch (error) {
      console.error('等級マスタ取得エラー:', error);
    }
  };

  const fetchHistories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/gacha-histories?page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setHistories(data.histories);
        } else {
          setHistories((prev) => [...prev, ...data.histories]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
      }
    } catch (error) {
      console.error('履歴取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityLabel = (rarity: string): string => {
    return prizeTiers[rarity] || rarity;
  };

  const getRarityColor = (rarity: string): string => {
    const colors: Record<string, string> = {
      'FIRST_PRIZE': 'from-yellow-500 to-yellow-600',
      'SECOND_PRIZE': 'from-purple-500 to-purple-600',
      'THIRD_PRIZE': 'from-blue-500 to-blue-600',
      'FOURTH_PRIZE': 'from-green-500 to-green-600',
      'FIFTH_PRIZE': 'from-gray-400 to-gray-500',
      'LOSER': 'from-gray-300 to-gray-400',
    };
    return colors[rarity] || 'from-gray-400 to-gray-500';
  };

  return (
    <>
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#e9dacb' }}>
        <div className="mx-auto max-w-md">
          {/* ヒーローセクション */}
          <div className="relative overflow-hidden px-4 pt-8 pb-6">
            {/* 背景装飾 */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-10 left-10 text-6xl">🂡</div>
              <div className="absolute top-20 right-10 text-5xl">🂮</div>
              <div className="absolute bottom-10 left-20 text-4xl">🃏</div>
              <div className="absolute bottom-20 right-20 text-5xl">🃎</div>
            </div>
            
            <div className="relative z-10 text-center" style={{ color: '#4a3a2a' }}>
              <h1 className="mb-2 text-3xl font-bold drop-shadow-md">ガチャ履歴</h1>
              <p className="text-sm" style={{ color: '#6b5a4a' }}>これまでのガチャ実行履歴</p>
            </div>
          </div>

          <div className="px-4 py-4">
            {/* 履歴一覧 */}
            {loading && histories.length === 0 ? (
              <div className="rounded-xl p-8 text-center shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                <div style={{ color: '#5a4a3a' }}>読み込み中...</div>
              </div>
            ) : histories.length === 0 ? (
              <div className="rounded-xl p-8 text-center shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                <div className="mb-4" style={{ color: '#5a4a3a' }}>ガチャ履歴がありません</div>
                <Link
                  href="/?action=home"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-yellow-600 hover:via-yellow-700 hover:to-yellow-600 hover:shadow-yellow-500/50"
                >
                  <img
                    src="/icons/navigation/icon-gacha.svg"
                    alt="ガチャ"
                    className="h-5 w-5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span>ガチャを引く</span>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 space-y-3">
                  {histories.map((history) => (
                    <div
                      key={history.id}
                      className="group rounded-xl border-2 border-yellow-400/50 bg-gradient-to-r from-white/95 to-white/90 p-4 shadow-lg transition-all hover:border-yellow-400 hover:shadow-xl hover:shadow-yellow-500/20"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className={`rounded-full bg-gradient-to-r ${getRarityColor(history.item.rarity)} px-3 py-1 text-xs font-semibold text-white shadow-sm`}
                            >
                              {getRarityLabel(history.item.rarity)}
                            </span>
                          </div>
                          <div className="mb-1 font-bold text-gray-800 truncate">
                            {history.item.name}
                          </div>
                          <div className="mb-2 text-sm text-gray-600">
                            {history.gachaType.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>
                              {new Date(history.createdAt).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {history.pointsUsed > 0 && (
                              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-800">
                                ${history.pointsUsed.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* もっと見る */}
                {hasMore && (
                  <div className="text-center">
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={loading}
                      className="rounded-xl px-6 py-3 font-semibold transition-all active:scale-95 disabled:opacity-50"
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                        color: '#5a4a3a',
                        border: '2px solid #8b6f47'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.borderColor = '#9b7f57';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                        e.currentTarget.style.borderColor = '#8b6f47';
                      }}
                    >
                      {loading ? '読み込み中...' : 'もっと見る'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <BottomNavigation currentPage="history" />
    </>
  );
}

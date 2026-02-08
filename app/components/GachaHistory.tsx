'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import BottomNavigation from './BottomNavigation';
import LegalFooterLinks from './LegalFooterLinks';
import { CardBackIcon } from '@/components/icons/AppIcons';
import PointIcon from './PointIcon';

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
  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchPrizeTiers();
  }, []);

  useEffect(() => {
    fetchHistories();
  }, [userId, page]);

  useEffect(() => {
    const target = loaderRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (loading || !hasMore) return;
        setPage((p) => p + 1);
      },
      { rootMargin: '200px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading]);

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
      const res = await fetch(`/api/users/${userId}/gacha-histories?page=${page}&limit=50`);
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
    return 'from-amber-100 to-amber-200';
  };

  const formatHistoryDateTime = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(
      date.getDate()
    )}日 ${pad(date.getHours())}時${pad(date.getMinutes())}分${pad(
      date.getSeconds()
    )}秒`;
  };

  return (
    <>
      <div className="min-h-screen" style={{ backgroundColor: '#e9dacb' }}>
        <div className="mx-auto max-w-md">
          {/* ヒーローセクション */}
          <div className="relative overflow-hidden px-4 pt-8 pb-6">
            {/* 背景装飾 */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10">
                <CardBackIcon className="h-14 w-14" />
              </div>
              <div className="absolute top-20 right-10">
                <CardBackIcon className="h-12 w-12" />
              </div>
              <div className="absolute bottom-10 left-20">
                <CardBackIcon className="h-10 w-10" />
              </div>
              <div className="absolute bottom-20 right-20">
                <CardBackIcon className="h-12 w-12" />
              </div>
            </div>
            
            <div className="relative z-10 text-center" style={{ color: '#4a3a2a' }}>
              <h1 className="mb-2 text-3xl font-bold drop-shadow-md">ガチャ履歴</h1>
              <p className="text-sm" style={{ color: '#6b5a4a' }}>これまでのガチャ実行履歴</p>
            </div>
          </div>

          <div className="px-4 py-4">
            {/* 履歴一覧 */}
            {loading && histories.length === 0 ? (
              <div className="rounded-xl backdrop-blur-sm p-8 text-center shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                <div style={{ color: '#5a4a3a' }}>読み込み中...</div>
              </div>
            ) : histories.length === 0 ? (
              <div className="rounded-xl backdrop-blur-sm p-8 text-center shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                <div className="mb-4" style={{ color: '#4a3a2a' }}>ガチャ履歴がありません</div>
                <Link
                  href="/?action=home"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold shadow-lg transition-all hover:shadow-xl"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.7)", color: "#4a3a2a", border: "1px solid #b89f7a" }}
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
                      className="group rounded-xl border-2 border-yellow-400/30 bg-gradient-to-r from-white/95 to-white/90 p-4 shadow-lg transition-all hover:border-yellow-400/60 hover:shadow-xl hover:shadow-yellow-500/20"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className="rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
                              style={{
                                background: "linear-gradient(to right, #f5d48a, #e7c675)",
                                color: "#4a3a2a",
                                border: "1px solid #b89f7a",
                              }}
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
                              {formatHistoryDateTime(history.createdAt)}
                            </span>
                            {history.pointsUsed > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-800">
                                <PointIcon size={12} className="h-3 w-3" />
                                {history.pointsUsed.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div ref={loaderRef} />
                {loading && histories.length > 0 && (
                  <div className="text-center text-sm" style={{ color: '#5a4a3a' }}>
                    読み込み中...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div
          className="rounded-xl px-3 py-2 text-xs shadow"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
        >
          <LegalFooterLinks
            className="flex flex-wrap justify-center gap-3"
            linkClassName="text-[#8b6f47] hover:underline"
          />
        </div>
      </div>
      <BottomNavigation currentPage="history" />
    </>
  );
}

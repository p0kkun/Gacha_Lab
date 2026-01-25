"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LiffProfile } from "@/lib/liff";
import BottomNavigation from "./BottomNavigation";
import PointCard from "./PointCard";

type MyPageProps = {
  profile: LiffProfile;
};

type UserStats = {
  totalGachaCount: number;
  rarityStats: Record<string, number>;
};

type PrizeTier = {
  code: string;
  label: string;
  displayOrder: number;
};

type PointBalances = {
  paid: number;
  free: number;
  total: number;
  paidExpiresAt: string | null;
  freeExpiresAt: string | null;
  lastUpdated: string | null;
};

type RecentItem = {
  id: number;
  item: {
    id: number;
    name: string;
    description: string | null;
    rarity: string;
    usageType: string;
    imageUrl: string | null;
  };
  createdAt: string;
  usedAt: string | null;
};

export default function MyPage({ profile }: MyPageProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [prizeTiers, setPrizeTiers] = useState<Record<string, string>>({});
  const [pointBalances, setPointBalances] = useState<PointBalances | null>(
    null
  );
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [hasPendingMessages, setHasPendingMessages] = useState(false);
  const [pendingMessageCount, setPendingMessageCount] = useState(0);

  useEffect(() => {
    fetchPrizeTiers();
    fetchUserStats();
    fetchPointBalances();
    fetchRecentItems();
    checkPendingMessages();
  }, [profile.userId]);

  const fetchPrizeTiers = async () => {
    try {
      const res = await fetch("/api/prize-tiers");
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
      console.error("等級マスタ取得エラー:", error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const res = await fetch(`/api/users/${profile.userId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("統計情報取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPointBalances = async () => {
    try {
      const res = await fetch(`/api/points/balance?userId=${profile.userId}`);
      if (res.ok) {
        const data = await res.json();
        setPointBalances({
          paid: data.paid || 0,
          free: data.free || 0,
          total: data.total || 0,
          paidExpiresAt: data.paidExpiresAt || null,
          freeExpiresAt: data.freeExpiresAt || null,
          lastUpdated: data.lastUpdated || null,
        });
      }
    } catch (error) {
      console.error("ポイント残高取得エラー:", error);
    } finally {
      setLoadingPoints(false);
    }
  };

  const fetchRecentItems = async () => {
    try {
      const res = await fetch(
        `/api/users/${profile.userId}/items?page=1&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        setRecentItems(data.items || []);
      }
    } catch (error) {
      console.error("最近のアイテム取得エラー:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const checkPendingMessages = async () => {
    try {
      const response = await fetch(
        `/api/messages/pending?userId=${profile.userId}&type=1`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.count > 0) {
          setHasPendingMessages(true);
          setPendingMessageCount(data.count);
        } else {
          setHasPendingMessages(false);
          setPendingMessageCount(0);
        }
      }
    } catch (error) {
      console.error("未送信メッセージ確認エラー:", error);
    }
  };

  const getRarityLabel = (rarity: string): string => {
    return prizeTiers[rarity] || rarity;
  };

  const getRarityColor = (rarity: string): string => {
    const colors: Record<string, string> = {
      FIRST_PRIZE: "from-yellow-500 to-yellow-600",
      SECOND_PRIZE: "from-purple-500 to-purple-600",
      THIRD_PRIZE: "from-blue-500 to-blue-600",
      FOURTH_PRIZE: "from-green-500 to-green-600",
      FIFTH_PRIZE: "from-gray-400 to-gray-500",
      LOSER: "from-gray-300 to-gray-400",
    };
    return colors[rarity] || "from-gray-400 to-gray-500";
  };

  return (
    <>
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#e9dacb' }}>
        <div className="mx-auto max-w-md">
          {/* ヒーローセクション - プロフィール */}
          <div className="relative overflow-hidden px-4 pt-8 pb-6">
            {/* 背景装飾 */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-10 left-10 text-6xl">🂡</div>
              <div className="absolute top-20 right-10 text-5xl">🂮</div>
              <div className="absolute bottom-10 left-20 text-4xl">🃏</div>
              <div className="absolute bottom-20 right-20 text-5xl">🃎</div>
            </div>

            <div className="relative z-10 text-center" style={{ color: '#4a3a2a' }}>
              <h1 className="mb-6 text-3xl font-bold drop-shadow-md">
                マイページ
              </h1>

              {/* プロフィールカード */}
              <div className="mx-auto mb-6 max-w-xs rounded-xl border-2 p-6 shadow-2xl backdrop-blur-sm" style={{ borderColor: '#b89f7a', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                <div className="flex flex-col items-center gap-4">
                  {profile.pictureUrl && (
                    <img
                      src={profile.pictureUrl}
                      alt={profile.displayName || "ユーザー"}
                      className="h-20 w-20 rounded-full border-4 shadow-lg"
                      style={{ borderColor: '#b89f7a' }}
                    />
                  )}
                  <div className="text-center">
                    <div className="mb-1 text-xl font-bold" style={{ color: '#4a3a2a' }}>
                      {profile.displayName || "ユーザー"}
                    </div>
                    <div className="text-xs" style={{ color: '#6b5a4a' }}>
                      ID: {profile.userId.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              </div>

              {/* ポイント表示 - 共通コンポーネント */}
              <div className="mb-6">
                <PointCard pointBalances={pointBalances} variant="mypage" />
              </div>
            </div>
          </div>

          <div className="px-4 py-4">
            {/* 未送信メッセージ通知 */}
            {hasPendingMessages && (
              <div className="mb-4 rounded-lg border p-4" style={{ borderColor: '#b89f7a', backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#4a3a2a' }}>
                      未確認のガチャ結果があります（{pendingMessageCount}件）
                    </p>
                  </div>
                  <Link
                    href={`/items?userId=${profile.userId}`}
                    className="rounded-md px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: '#8b6f47' }}
                  >
                    確認する
                  </Link>
                </div>
              </div>
            )}

            {/* クイックアクション */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <Link
                href="/?action=history"
                className="flex flex-col items-center justify-center rounded-xl p-4 transition-all active:scale-95"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  color: '#5a4a3a'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                }}
              >
                <img
                  src="/icons/navigation/icon-history.svg"
                  alt="履歴"
                  className="mb-2 h-8 w-8"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="text-xs font-semibold">履歴</div>
              </Link>
              <Link
                href="/?action=items"
                className="flex flex-col items-center justify-center rounded-xl p-4 transition-all active:scale-95"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  color: '#5a4a3a'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                }}
              >
                <img
                  src="/icons/navigation/icon-items.svg"
                  alt="アイテム"
                  className="mb-2 h-8 w-8"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="text-xs font-semibold">アイテム</div>
              </Link>
              <Link
                href="/?action=referral"
                className="flex flex-col items-center justify-center rounded-xl p-4 transition-all active:scale-95"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  color: '#5a4a3a'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                }}
              >
                <img
                  src="/icons/navigation/icon-referral.svg"
                  alt="友達紹介"
                  className="mb-2 h-8 w-8"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="text-xs font-semibold">紹介</div>
              </Link>
            </div>

            {/* 統計情報 */}
            <div className="mb-6 rounded-xl backdrop-blur-sm p-6 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
              <h2 className="mb-4 text-lg font-bold drop-shadow-md" style={{ color: '#4a3a2a' }}>
                統計情報
              </h2>
              {loading ? (
                <div className="text-center" style={{ color: '#6b5a4a' }}>読み込み中...</div>
              ) : stats ? (
                <div className="space-y-4">
                  <div className="rounded-lg p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
                    <div className="mb-1 text-xs" style={{ color: '#6b5a4a' }}>
                      ガチャ実行回数
                    </div>
                    <div className="text-3xl font-bold drop-shadow-md" style={{ color: '#4a3a2a' }}>
                      {stats.totalGachaCount.toLocaleString()} 回
                    </div>
                  </div>
                  {Object.keys(stats.rarityStats).length > 0 && (
                    <div>
                      <div className="mb-3 text-sm font-semibold" style={{ color: '#4a3a2a' }}>
                        レアリティ別獲得数
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(stats.rarityStats)
                          .sort(([, a], [, b]) => b - a)
                          .map(([rarity, count]) => (
                            <div
                              key={rarity}
                              className="rounded-lg p-3 shadow-md"
                              style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
                            >
                              <div className="mb-1 text-xs font-medium" style={{ color: '#6b5a4a' }}>
                                {getRarityLabel(rarity)}
                              </div>
                              <div className="text-xl font-bold" style={{ color: '#4a3a2a' }}>
                                {count.toLocaleString()}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-white/70">
                  統計情報がありません
                </div>
              )}
            </div>

            {/* 最近の獲得アイテム */}
            <div className="mb-6 rounded-xl bg-white/10 backdrop-blur-sm p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white drop-shadow-md">
                  最近の獲得アイテム
                </h2>
                <Link
                  href="/?action=items"
                  className="text-xs text-white/80 underline hover:text-white"
                >
                  すべて見る
                </Link>
              </div>
              {loadingItems ? (
                <div className="text-center text-white/70">読み込み中...</div>
              ) : recentItems.length > 0 ? (
                <div className="space-y-3">
                  {recentItems.map((item) => (
                    <div
                      key={item.id}
                      className="group rounded-lg border-2 border-yellow-400/30 bg-gradient-to-r from-white/95 to-white/90 p-3 shadow-md transition-all hover:border-yellow-400/60 hover:shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        {item.item.imageUrl ? (
                          <img
                            src={item.item.imageUrl}
                            alt={item.item.name}
                            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover border border-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const fallback =
                                target.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.style.display = "flex";
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${getRarityColor(
                            item.item.rarity
                          )} text-lg text-white shadow-sm ${
                            item.item.imageUrl ? "hidden" : ""
                          }`}
                        >
                          🎁
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-1 font-semibold truncate" style={{ color: '#4a3a2a' }}>
                            {item.item.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="rounded-full px-2 py-0.5 text-xs font-semibold text-white shadow-sm"
                              style={{ backgroundColor: '#8b6f47' }}
                            >
                              {getRarityLabel(item.item.rarity)}
                            </span>
                            {item.usedAt && (
                              <span className="text-xs" style={{ color: '#6b5a4a' }}>
                                使用済み
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center" style={{ color: '#6b5a4a' }}>
                  まだ獲得したアイテムがありません
                </div>
              )}
            </div>

            {/* お知らせ・ヘルプ */}
            <div className="mb-6 rounded-xl backdrop-blur-sm p-4 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
              <h2 className="mb-3 text-lg font-bold drop-shadow-md" style={{ color: '#4a3a2a' }}>
                お知らせ・ヘルプ
              </h2>
              <div className="space-y-2">
                <Link
                  href="/?action=help"
                  className="flex items-center justify-between rounded-lg p-3 transition-colors"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', color: '#5a4a3a' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="/icons/navigation/icon-help.svg"
                      alt="ヘルプ"
                      className="h-5 w-5"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = "none";
                        const fallback = img.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.style.display = "block";
                        }
                      }}
                    />
                    <div className="text-xl hidden">❓</div>
                    <span className="text-sm font-medium">
                      ヘルプ・お知らせ
                    </span>
                  </div>
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: '#8b6f47' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
                <Link
                  href="/?action=home"
                  className="flex items-center justify-between rounded-lg p-3 transition-colors"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', color: '#5a4a3a' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="/icons/navigation/icon-home.svg"
                      alt="ホーム"
                      className="h-5 w-5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span className="text-sm font-medium">ホームに戻る</span>
                  </div>
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: '#8b6f47' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomNavigation currentPage="mypage" />
    </>
  );
}

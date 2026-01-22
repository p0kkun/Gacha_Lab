"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LiffProfile } from "@/lib/liff";
import BottomNavigation from "./BottomNavigation";
import PointCard from "./PointCard";

type GachaType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  iconImageUrl: string | null;
  pointCost: number;
};

type UserStats = {
  totalGachaCount: number;
  rarityStats: Record<string, number>;
};

type PointBalances = {
  paid: number;
  free: number;
  total: number;
  paidExpiresAt: string | null;
  freeExpiresAt: string | null;
  lastUpdated: string | null;
};

type HomePageContentProps = {
  profile: LiffProfile;
  pointBalances: PointBalances | null;
  onOpenGacha: () => void;
};

export default function HomePageContent({
  profile,
  pointBalances,
  onOpenGacha,
}: HomePageContentProps) {
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingGacha, setLoadingGacha] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    // ガチャタイプ一覧を取得
    const fetchGachaTypes = async () => {
      try {
        const res = await fetch("/api/gacha/types");
        if (res.ok) {
          const data = await res.json();
          setGachaTypes(data.gachaTypes || []);
        }
      } catch (error) {
        console.error("ガチャタイプ取得エラー:", error);
      } finally {
        setLoadingGacha(false);
      }
    };

    // 統計情報を取得
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/users/${profile.userId}/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("統計情報取得エラー:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchGachaTypes();
    fetchStats();
  }, [profile.userId]);

  return (
    <>
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#e9dacb' }}>
        <div className="mx-auto max-w-md">
          {/* ヒーローセクション - ポーカーテーブル風 */}
          <div className="relative overflow-hidden px-4 pt-8 pb-6">
            {/* 背景装飾 */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-10 left-10 text-6xl">🂡</div>
              <div className="absolute top-20 right-10 text-5xl">🂮</div>
              <div className="absolute bottom-10 left-20 text-4xl">🃏</div>
              <div className="absolute bottom-20 right-20 text-5xl">🃎</div>
            </div>
            
            <div className="relative z-10 text-center" style={{ color: '#4a3a2a' }}>
              <h1 className="mb-2 text-3xl font-bold drop-shadow-md">
                Gacha Lab
              </h1>
              <p className="mb-6 text-sm" style={{ color: '#6b5a4a' }}>
                ポーカー風ガチャでアイテムを獲得しよう！
              </p>
              
              {/* ポイント表示 - 共通コンポーネント */}
              <div className="mb-6">
                <PointCard pointBalances={pointBalances} variant="home" />
              </div>

              {/* メインアクション - ガチャを引くボタン */}
              <button
                onClick={onOpenGacha}
                disabled={gachaTypes.length === 0}
                className="group relative mx-auto mb-3 w-full max-w-xs overflow-hidden rounded-xl bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 px-8 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:from-yellow-600 hover:via-yellow-700 hover:to-yellow-600 hover:shadow-yellow-500/50 disabled:from-gray-600 disabled:via-gray-700 disabled:to-gray-600 disabled:opacity-50"
              >
                {/* 光るエフェクト */}
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>
                
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <img
                    src="/icons/navigation/icon-gacha.svg"
                    alt="ガチャ"
                    className="h-6 w-6"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span>ガチャを引く</span>
                  <span className="text-2xl">🂡</span>
                </span>
              </button>

              {/* ポイント購入ボタン */}
              <Link
                href="/points"
                className="mx-auto block w-full max-w-xs rounded-xl border-2 px-6 py-3 text-sm font-semibold transition-all hover:shadow-lg active:scale-95"
                style={{ 
                  borderColor: '#8b6f47',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  color: '#5a4a3a'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                  e.currentTarget.style.borderColor = '#9b7f57';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.borderColor = '#8b6f47';
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <img
                    src="/icons/navigation/icon-point.svg"
                    alt="ポイント購入"
                    className="h-5 w-5"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = "none";
                      const fallback = img.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.style.display = "inline";
                      }
                    }}
                  />
                  <span className="hidden">💰</span>
                  <span>ポイントを購入</span>
                </span>
              </Link>
            </div>
          </div>

          <div className="px-4 py-4">
            {/* クイックアクション */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <Link
                href="/?action=history"
                className="flex flex-col items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm p-4 text-white transition-all hover:bg-white/20 active:scale-95"
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
                href="/?action=mypage"
                className="flex flex-col items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm p-4 text-white transition-all hover:bg-white/20 active:scale-95"
              >
                <img
                  src="/icons/navigation/icon-mypage.svg"
                  alt="マイページ"
                  className="mb-2 h-8 w-8"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="text-xs font-semibold">マイページ</div>
              </Link>
            </div>

            {/* ガチャタイプ一覧 */}
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-bold drop-shadow-md" style={{ color: '#4a3a2a' }}>
                利用可能なガチャ
              </h2>
              {loadingGacha ? (
                <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                  <div style={{ color: '#5a4a3a' }}>読み込み中...</div>
                </div>
              ) : gachaTypes.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                  <div style={{ color: '#5a4a3a' }}>
                    現在利用可能なガチャがありません
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {gachaTypes.map((gacha) => (
                    <button
                      key={gacha.id}
                      onClick={onOpenGacha}
                      className="group w-full rounded-xl border-2 border-yellow-400/50 bg-gradient-to-r from-white/95 to-white/90 p-4 shadow-lg transition-all hover:border-yellow-400 hover:shadow-xl hover:shadow-yellow-500/20 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={
                            gacha.iconImageUrl &&
                            gacha.iconImageUrl.trim() !== ""
                              ? gacha.iconImageUrl
                              : "/images/gacha/default-icon.png"
                          }
                          alt={gacha.name}
                          className="h-16 w-16 flex-shrink-0 rounded-lg object-cover border-2 border-gray-200 shadow-sm"
                          onError={(e) => {
                            // 画像読み込みエラー時はデフォルト画像にフォールバック
                            const target = e.target as HTMLImageElement;
                            const defaultImagePath =
                              "/images/gacha/default-icon.png";
                            const currentSrc = target.src;
                            
                            // 既にデフォルト画像を試している場合は非表示
                            if (
                              currentSrc.includes(defaultImagePath) ||
                              currentSrc.endsWith(defaultImagePath)
                            ) {
                              target.style.display = "none";
                            } else {
                              // デフォルト画像にフォールバック
                              target.src = defaultImagePath;
                            }
                          }}
                        />
                        <div className="flex-1 text-left">
                          <h3 className="mb-1 font-bold text-gray-800">
                            {gacha.name}
                          </h3>
                          {gacha.description && (
                            <p className="mb-2 text-xs text-gray-600 line-clamp-2">
                              {gacha.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <span 
                              className="rounded-full px-3 py-1 text-xs font-semibold text-white shadow-md"
                              style={{
                                background: 'linear-gradient(to right, #8b6f47, #7a5f37)'
                              }}
                            >
                              {gacha.pointCost > 0
                                ? `$${gacha.pointCost.toLocaleString()}`
                                : "無料"}
                            </span>
                          </div>
                        </div>
                        <div className="transition-transform group-hover:translate-x-1" style={{ color: '#8b6f47' }}>
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* お知らせ・ヘルプ */}
            <div className="mb-6 rounded-xl p-4 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
              <h2 className="mb-3 text-lg font-bold drop-shadow-md" style={{ color: '#4a3a2a' }}>
                お知らせ・ヘルプ
              </h2>
              <div className="space-y-2">
                <Link
                  href="/?action=help"
                  className="flex items-center justify-between rounded-lg p-3 transition-colors"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#5a4a3a'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
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
                  href="/?action=referral"
                  className="flex items-center justify-between rounded-lg p-3 transition-colors"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#5a4a3a'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="/icons/navigation/icon-referral.svg"
                      alt="友達紹介"
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
                    <div className="text-xl hidden">👥</div>
                    <span className="text-sm font-medium">友達紹介</span>
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
      <BottomNavigation currentPage="home" />
    </>
  );
}

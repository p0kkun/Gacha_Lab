"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type { LiffProfile } from "@/lib/liff";
import BottomNavigation from "./BottomNavigation";
import PointCard from "./PointCard";
import PointIcon from "./PointIcon";
import LegalFooterLinks from "./LegalFooterLinks";

const SuitIcon = ({
  suit,
  className,
}: {
  suit: "heart" | "spade" | "diamond" | "club";
  className?: string;
}) => {
  const common = "h-5 w-5";
  if (suit === "heart") {
    return (
      <svg className={className ?? common} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 20.5C7 16.2 4 13.4 4 10.2 4 7.9 5.8 6 8.1 6c1.3 0 2.5.6 3.3 1.6C12.2 6.6 13.4 6 14.7 6 17 6 18.8 7.9 18.8 10.2c0 3.2-3 6-6.8 10.3z"
        />
      </svg>
    );
  }
  if (suit === "spade") {
    return (
      <svg className={className ?? common} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3c4.3 3.7 7 6.6 7 9.7 0 2.2-1.8 4-4 4-1.4 0-2.7-.7-3.4-1.9-.2.9-.2 1.9.1 2.7.3.7.7 1.3 1.2 1.7H9.1c.5-.4.9-1 1.2-1.7.3-.8.4-1.8.1-2.7-.7 1.2-2 1.9-3.4 1.9-2.2 0-4-1.8-4-4C2.9 9.6 7.7 5.6 12 3z"
        />
      </svg>
    );
  }
  if (suit === "diamond") {
    return (
      <svg className={className ?? common} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 3.5 19.5 12 12 20.5 4.5 12 12 3.5z" />
      </svg>
    );
  }
  return (
    <svg className={className ?? common} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 4c2 0 3.7 1.2 4.5 2.9 2.2.2 4 2.1 4 4.4 0 2.5-2 4.5-4.5 4.5h-1.2c.3 1.2 1.1 2.2 2.2 2.9H7c1.1-.7 1.9-1.7 2.2-2.9H8c-2.5 0-4.5-2-4.5-4.5 0-2.3 1.8-4.2 4-4.4C8.3 5.2 10 4 12 4z"
      />
    </svg>
  );
};

const CardIcon = ({ className }: { className?: string }) => (
  <svg className={className ?? "h-5 w-5"} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M9 7h6M9 11h6M9 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const HelpIcon = ({ className }: { className?: string }) => (
  <svg className={className ?? "h-5 w-5"} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1.1-1.5 2.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    <circle cx="12" cy="17" r="1.2" fill="currentColor" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className ?? "h-5 w-5"} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8" r="3" fill="currentColor" />
    <circle cx="17" cy="9" r="2.5" fill="currentColor" />
    <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M14 20c.3-2 2-3.5 4-3.5 1.3 0 2.5.6 3 1.5" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

type GachaType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  iconImageUrl: string | null;
  pointCost: number;
  mainPrizeLabel?: string | null;
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
  referralNotice?: string | null;
  onOpenGacha: (gachaCode?: string) => void;
};

export default function HomePageContent({
  profile,
  pointBalances,
  referralNotice,
  onOpenGacha,
}: HomePageContentProps) {
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingGacha, setLoadingGacha] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const renderDescription = (text: string | null): ReactNode => {
    if (!text) return null;

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#8b6f47] underline hover:text-[#7a5f37]"
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

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
      <div className="min-h-screen" style={{ backgroundColor: '#e9dacb' }}>
        <div className="mx-auto max-w-md">
          {/* ヒーローセクション - ポーカーテーブル風 */}
          <div className="relative overflow-hidden px-4 pt-8 pb-6">
            {/* 背景装飾 */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-10 left-10 text-[#8b6f47]">
                <CardIcon className="h-16 w-16" />
              </div>
              <div className="absolute top-20 right-10 text-[#5a4a3a]">
                <SuitIcon suit="spade" className="h-12 w-12" />
              </div>
              <div className="absolute bottom-10 left-20 text-[#8b6f47]">
                <SuitIcon suit="club" className="h-10 w-10" />
              </div>
              <div className="absolute bottom-20 right-20 text-[#b86c6c]">
                <SuitIcon suit="diamond" className="h-12 w-12" />
              </div>
            </div>
            
            <div className="relative z-10 text-center" style={{ color: '#4a3a2a' }}>
              <h1 className="tre-box-title mb-4 text-3xl drop-shadow-md">
                TRE BOX
              </h1>

              {referralNotice && (
                <div
                  className="mb-4 rounded-xl border px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.12)",
                    borderColor: "rgba(239, 68, 68, 0.35)",
                    color: "#7f1d1d",
                  }}
                >
                  {referralNotice}
                </div>
              )}
              
              {/* ポイント表示 - 共通コンポーネント */}
              <div className="mb-6">
                <PointCard pointBalances={pointBalances} variant="home" />
              </div>

              {/* メインアクション - ガチャを引くボタン */}
              <button
                onClick={() => onOpenGacha()}
                disabled={gachaTypes.length === 0}
                className="group relative mx-auto mb-3 w-full max-w-xs overflow-hidden rounded-xl px-8 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 disabled:opacity-50"
                style={{
                  background: gachaTypes.length === 0 
                    ? 'linear-gradient(to right, #8b7355, #7a6345, #8b7355)'
                    : 'linear-gradient(to right, #b89f7a, #a68f6a, #b89f7a)'
                }}
                onMouseEnter={(e) => {
                  if (gachaTypes.length > 0) {
                    e.currentTarget.style.background = 'linear-gradient(to right, #c8af8a, #b89f7a, #c8af8a)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(184, 159, 122, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (gachaTypes.length > 0) {
                    e.currentTarget.style.background = 'linear-gradient(to right, #b89f7a, #a68f6a, #b89f7a)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)';
                  }
                }}
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
                  <CardIcon className="h-6 w-6 text-white" />
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
                href="/?action=mypage"
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
                      onClick={() => onOpenGacha(gacha.code)}
                      className="group w-full rounded-xl border-2 p-4 shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
                      style={{ 
                        borderColor: '#b89f7a',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#c8af8a';
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(184, 159, 122, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#b89f7a';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                      }}
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
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-md"
                              style={{
                                background: "linear-gradient(to right, #8b6f47, #7a5f37)",
                              }}
                            >
                              {gacha.pointCost > 0 ? (
                                <>
                                  <PointIcon size={12} className="h-3 w-3" active={true} />
                                  {gacha.pointCost.toLocaleString()}
                                </>
                              ) : (
                                "無料"
                              )}
                            </span>
                          </div>
                          {gacha.mainPrizeLabel && (
                            <div className="mb-1 text-xs font-semibold text-gray-700">
                              メイン景品: {gacha.mainPrizeLabel}
                            </div>
                          )}
                          {gacha.description && (
                            <p className="mb-2 text-xs text-gray-600 line-clamp-2">
                              {renderDescription(gacha.description)}
                            </p>
                          )}
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
                      <HelpIcon className="h-5 w-5 hidden text-[#8b6f47]" />
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
                      alt="友だち紹介"
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
                      <UsersIcon className="h-5 w-5 hidden text-[#8b6f47]" />
                    <span className="text-sm font-medium">友だち紹介</span>
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
      <div className="px-4 pb-4">
        <div
          className="rounded-xl px-3 py-2 text-xs shadow"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.5)" }}
        >
          <LegalFooterLinks
            className="flex flex-wrap justify-center gap-3"
            linkClassName="text-[#8b6f47] hover:underline"
          />
        </div>
      </div>
      <BottomNavigation currentPage="home" />
    </>
  );
}

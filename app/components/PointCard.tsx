"use client";

import Link from "next/link";
import PointIcon from "./PointIcon";
import { formatExpiryText, formatExpiryDate } from "@/lib/point-utils";

type PointBalances = {
  paid: number;
  free: number;
  total: number;
  paidExpiresAt: string | null;
  freeExpiresAt: string | null;
  lastUpdated: string | null;
};

type PointCardProps = {
  pointBalances: PointBalances | null;
  variant?: "home" | "mypage"; // ホーム画面用 or マイページ用
  className?: string;
};

/**
 * 共通のポイント表示カードコンポーネント
 * クリック可能でポイント購入ページへ導線
 */
export default function PointCard({
  pointBalances,
  variant = "home",
  className = "",
}: PointCardProps) {
  if (!pointBalances) {
    return (
      <div
        className={`mx-auto max-w-xs rounded-xl border-2 p-4 shadow-lg backdrop-blur-sm ${className}`}
        style={{ borderColor: '#8b6f47', background: 'linear-gradient(to right, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.3))' }}
      >
        <div className="text-center" style={{ color: '#6b5a4a' }}>読み込み中...</div>
      </div>
    );
  }

  return (
    <Link
      href="/points"
      className={`group mx-auto block max-w-xs rounded-xl border-2 p-4 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl active:scale-95 ${className}`}
      style={{ 
        borderColor: '#8b6f47',
        background: 'linear-gradient(to right, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.3))'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#9b7f57';
        e.currentTarget.style.background = 'linear-gradient(to right, rgba(212, 175, 55, 0.3), rgba(212, 175, 55, 0.4))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#8b6f47';
        e.currentTarget.style.background = 'linear-gradient(to right, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.3))';
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-xs" style={{ color: '#6b5a4a' }}>所持ポイント</div>
          <div className="text-4xl font-bold drop-shadow-md flex items-center gap-2" style={{ color: '#7a5f37' }}>
            <PointIcon size={32} className="h-8 w-8" active={true} />
            {pointBalances.total.toLocaleString()}
          </div>
          {variant === "mypage" && (
            <div className="mt-2 flex justify-center gap-4 text-xs" style={{ color: '#6b5a4a' }}>
              <span className="flex items-center gap-0.5">
                有償:{" "}
                <PointIcon size={10} className="h-2.5 w-2.5" active={true} />
                {pointBalances.paid.toLocaleString()}
              </span>
              <span className="flex items-center gap-0.5">
                無償:{" "}
                <PointIcon size={10} className="h-2.5 w-2.5" active={true} />
                {pointBalances.free.toLocaleString()}
              </span>
            </div>
          )}
          {/* 有効期限（有償と無償で同じなので一つだけ表示） */}
          {(pointBalances.paidExpiresAt || pointBalances.freeExpiresAt) && (
            <div className="mt-2 text-center text-xs" style={{ color: '#6b5a4a' }}>
              有効期限: {formatExpiryText(pointBalances.paidExpiresAt || pointBalances.freeExpiresAt)}
              {(pointBalances.paidExpiresAt || pointBalances.freeExpiresAt) && formatExpiryDate(pointBalances.paidExpiresAt || pointBalances.freeExpiresAt) && (
                <span className="ml-1">
                  ({formatExpiryDate(pointBalances.paidExpiresAt || pointBalances.freeExpiresAt)})
                </span>
              )}
            </div>
          )}
        </div>
        <div className="opacity-70 transition-opacity group-hover:opacity-100" style={{ color: '#8b6f47' }}>
          <img
            src="/icons/navigation/icon-point.svg"
            alt="ポイント購入"
            className="h-6 w-6"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              const fallback = img.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = "block";
              }
            }}
          />
          <svg
            className="h-6 w-6 hidden"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
      </div>
      <div className="mt-2 text-center text-xs" style={{ color: '#6b5a4a' }}>
        タップしてポイントを購入
      </div>
    </Link>
  );
}

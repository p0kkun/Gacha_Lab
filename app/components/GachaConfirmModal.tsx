"use client";

import Link from "next/link";
import PointIcon from "./PointIcon";

type GachaConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  gachaName: string;
  pointCost: number;
  onShowPrizeList?: () => void;
};

export default function GachaConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  gachaName,
  pointCost,
  onShowPrizeList,
}: GachaConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
        {/* ヘッダー */}
        <div className="border-b px-6 py-4" style={{ borderColor: '#8b6f47', background: 'linear-gradient(to right, #d4af37, #b8941f)' }}>
          <h2 className="text-xl font-bold text-white drop-shadow-md">ガチャ実行確認</h2>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <div className="mb-6 space-y-4">
            <div className="text-center">
              <p className="mb-2 text-lg font-semibold" style={{ color: '#4a3a2a' }}>
                {gachaName}を実行しますか？
              </p>
              {pointCost > 0 && (
                <p className="text-sm flex items-center gap-1 justify-center" style={{ color: '#6b5a4a' }}>
                  必要ポイント:{" "}
                  <span className="font-bold flex items-center gap-0.5" style={{ color: '#8b6f47' }}>
                    <PointIcon
                      size={14}
                      className="h-3.5 w-3.5"
                      active={true}
                    />
                    {pointCost.toLocaleString()}
                  </span>
                </p>
              )}
            </div>

            <div className="rounded-lg border p-4 shadow-sm" style={{ borderColor: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.1)' }}>
              <p className="text-sm" style={{ color: '#5a4a3a' }}>
                ※ ガチャを実行すると、ポイントが消費され、抽選結果が確定します。
              </p>
            </div>

            {/* 景品一覧・確率確認ボタン */}
            {onShowPrizeList && (
              <div className="flex justify-center">
                <button
                  onClick={onShowPrizeList}
                  className="flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all active:scale-95"
                  style={{ 
                    borderColor: '#8b6f47',
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    color: '#5a4a3a'
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
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span>景品一覧・確率を確認</span>
                </button>
              </div>
            )}
          </div>

          {/* 法的リンク */}
          <div className="mb-6 border-t pt-4" style={{ borderColor: '#8b6f47' }}>
            <div className="space-y-2 text-center text-xs" style={{ color: '#6b5a4a' }}>
              <p className="mb-2 font-medium" style={{ color: '#4a3a2a' }}>
                以下の規約に同意の上、実行してください：
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/terms"
                  target="_blank"
                  className="underline transition-colors"
                  style={{ color: '#8b6f47' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#9b7f57';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#8b6f47';
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  利用規約
                </Link>
                <Link
                  href="/privacy"
                  target="_blank"
                  className="underline transition-colors"
                  style={{ color: '#8b6f47' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#9b7f57';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#8b6f47';
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  プライバシーポリシー
                </Link>
                <Link
                  href="/commercial-transaction"
                  target="_blank"
                  className="underline transition-colors"
                  style={{ color: '#8b6f47' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#9b7f57';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#8b6f47';
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  特定商取引法に基づく表記
                </Link>
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border-2 px-4 py-3 font-semibold transition-colors active:scale-95"
              style={{ 
                borderColor: '#8b6f47',
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                color: '#5a4a3a'
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
              キャンセル
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-lg px-4 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
              style={{ background: 'linear-gradient(to right, #d4af37, #b8941f)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #e5c158, #c9a42f)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #d4af37, #b8941f)';
              }}
            >
              実行する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

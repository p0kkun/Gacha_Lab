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
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: '#e9dacb' }}>
        {/* ヘッダー */}
        <div className="border-b px-6 py-4" style={{ backgroundColor: '#d4c4b0', borderColor: '#b8a896' }}>
          <h2 className="text-xl font-bold" style={{ color: '#4a3a2a' }}>ガチャ実行確認</h2>
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

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-gray-700">
                ※ ガチャを実行すると、ポイントが消費され、抽選結果が確定します。
              </p>
            </div>

            {/* 景品一覧・確率確認ボタン */}
            {onShowPrizeList && (
              <div className="flex justify-center">
                <button
                  onClick={onShowPrizeList}
                  className="flex items-center gap-2 rounded-lg border-2 border-blue-400 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100 hover:border-blue-500 active:scale-95"
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
          <div className="mb-6 border-t pt-4" style={{ borderColor: '#b89f7a' }}>
            <div className="space-y-2 text-center text-xs" style={{ color: '#6b5a4a' }}>
              <p className="mb-2 font-medium" style={{ color: '#5a4a3a' }}>
                以下の規約に同意の上、実行してください：
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/terms"
                  target="_blank"
                  className="hover:underline"
                  style={{ color: '#8b6f47' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  利用規約
                </Link>
                <Link
                  href="/privacy"
                  target="_blank"
                  className="hover:underline"
                  style={{ color: '#8b6f47' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  プライバシーポリシー
                </Link>
                <Link
                  href="/commercial-transaction"
                  target="_blank"
                  className="hover:underline"
                  style={{ color: '#8b6f47' }}
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
              className="flex-1 rounded-lg border-2 px-4 py-3 font-semibold transition-colors hover:opacity-80 active:scale-95"
              style={{ borderColor: '#b89f7a', backgroundColor: 'rgba(255, 255, 255, 0.5)', color: '#5a4a3a' }}
            >
              キャンセル
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-lg px-4 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
              style={{ background: 'linear-gradient(to right, #b89f7a, #a68f6a)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #c8af8a, #b89f7a)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #b89f7a, #a68f6a)';
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

'use client';

import Link from 'next/link';

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
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* ヘッダー */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-green-900 to-green-800 px-6 py-4">
          <h2 className="text-xl font-bold text-yellow-300">ガチャ実行確認</h2>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <div className="mb-6 space-y-4">
            <div className="text-center">
              <p className="mb-2 text-lg font-semibold text-gray-800">
                {gachaName}を実行しますか？
              </p>
              {pointCost > 0 && (
                <p className="text-sm text-gray-600">
                  必要ポイント: <span className="font-bold text-yellow-600">${pointCost.toLocaleString()}</span>
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
          <div className="mb-6 border-t border-gray-200 pt-4">
            <div className="space-y-2 text-center text-xs text-gray-600">
              <p className="mb-2 font-medium text-gray-700">以下の規約に同意の上、実行してください：</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  利用規約
                </Link>
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  プライバシーポリシー
                </Link>
                <Link
                  href="/commercial-transaction"
                  target="_blank"
                  className="text-blue-600 hover:underline"
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
              className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:scale-95"
            >
              キャンセル
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:from-green-700 hover:to-green-800 hover:shadow-xl active:scale-95"
            >
              実行する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

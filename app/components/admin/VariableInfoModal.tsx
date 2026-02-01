"use client";

import { ReactNode } from "react";

interface VariableInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const variables = [
  {
    name: "{itemName}",
    description: "アイテム名",
    example: "例: 「ポーカーカードスリーブ」",
  },
  {
    name: "{rarity}",
    description: "等級ラベル（1等、2等など）",
    example: "例: 「1等」「2等」",
  },
  {
    name: "{rarityEmoji}",
    description: "等級の絵文字",
    example: "例: 「🏆」「🥈」",
  },
  {
    name: "{gachaTypeName}",
    description: "ガチャタイプ名",
    example: "例: 「通常ガチャ」「プレミアムガチャ」",
  },
  {
    name: "{handName}",
    description: "ポーカーハンド名（役が設定されている場合のみ表示）",
    example: "例: 「ロイヤルフラッシュ」「フルハウス」",
  },
  {
    name: "{grantedPoints}",
    description:
      "ガチャ景品として付与された無償ポイント数（ポイント付与がない場合は0）",
    example: "例: 「100」「500」",
  },
  {
    name: "{grantedPointsMessage}",
    description:
      "ポイント付与メッセージ（ポイント付与がある場合のみ表示される文字列）",
    example: "例: 「💰 無償ポイント 100ポイントが付与されました！」",
  },
];

export default function VariableInfoModal({
  isOpen,
  onClose,
}: VariableInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
        onClick={onClose}
      />

      {/* モーダル */}
      <div
        className="relative z-10 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-black">使用可能な変数</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {variables.map((variable, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 p-4 bg-gray-50"
            >
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded bg-white px-2 py-1 text-sm font-mono text-blue-600 border border-blue-200">
                  {variable.name}
                </code>
                <div className="flex-1">
                  <p className="text-sm font-medium text-black">
                    {variable.description}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {variable.example}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-black">
            注: 手札とコミュニティカードの変数は使用されません。
            <br />
            ポイント付与がない場合は、{"{grantedPoints}"}は0、
            {"{grantedPointsMessage}"}は空文字になります。
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

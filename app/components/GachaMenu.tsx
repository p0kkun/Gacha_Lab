"use client";

import { type ReactNode } from "react";
import { GachaType } from "./GachaModal";
import PointIcon from "./PointIcon";

export default function GachaMenu({
  gachaTypes,
  selectedGacha,
  onSelect,
  onClose,
}: {
  gachaTypes: GachaType[];
  selectedGacha: GachaType;
  onSelect: (gacha: GachaType) => void;
  onClose?: () => void;
}) {
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
          className="underline"
          style={{ color: "#8b6f47" }}
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

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ backgroundColor: '#e9dacb' }}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#b89f7a', backgroundColor: '#d4c4b0' }}>
        <h2 className="text-xl font-bold" style={{ color: '#4a3a2a' }}>ガチャ選択</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-95"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', color: '#5a4a3a' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
            }}
            aria-label="閉じる"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* メニューリスト */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ul className="space-y-2">
          {gachaTypes.map((gacha) => (
            <li key={gacha.id}>
              <button
                onClick={() => onSelect(gacha)}
                className={`group w-full rounded-xl p-4 text-left transition-all duration-200 ${
                  selectedGacha.id === gacha.id
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]"
                    : "bg-gray-50 text-gray-800 hover:bg-gray-100 hover:shadow-md active:scale-[0.98]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      gacha.iconImageUrl && gacha.iconImageUrl.trim() !== ""
                        ? gacha.iconImageUrl
                        : "/images/gacha/default-icon.png"
                    }
                    alt={gacha.name}
                    className="h-12 w-12 flex-shrink-0 rounded-lg object-cover border border-gray-200 shadow-sm"
                    onError={(e) => {
                      // 画像読み込みエラー時はデフォルト画像にフォールバック
                      const target = e.target as HTMLImageElement;
                      const defaultImagePath = "/images/gacha/default-icon.png";
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
                  <div className="flex-1 min-w-0">
                    <div
                      className={`mb-1 font-semibold leading-tight ${
                        selectedGacha.id === gacha.id
                          ? "text-white"
                          : "text-gray-900"
                      }`}
                    >
                      {gacha.name}
                    </div>
                  </div>
                </div>
                {gacha.description && (
                  <div
                    className="text-xs leading-relaxed break-words"
                    style={{
                      color: selectedGacha.id === gacha.id ? 'rgba(255, 255, 255, 0.9)' : '#6b5a4a'
                    }}
                  >
                    {renderDescription(gacha.description)}
                  </div>
                )}
                {gacha.pointCost !== undefined && gacha.pointCost > 0 && (
                  <div
                    className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={
                      selectedGacha.id === gacha.id
                        ? { backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#fff' }
                        : { backgroundColor: 'rgba(184, 159, 122, 0.2)', color: '#5a4a3a' }
                    }
                  >
                    <PointIcon
                      size={12}
                      className="h-3 w-3"
                      active={selectedGacha.id === gacha.id}
                    />
                    {gacha.pointCost.toLocaleString()}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

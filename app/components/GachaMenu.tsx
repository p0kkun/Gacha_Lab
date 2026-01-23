"use client";

import { GachaType } from "./GachaModal";
import PointIcon from "./PointIcon";
import { renderMarkdownLinks } from "@/lib/markdown-utils";

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
  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ backgroundColor: '#e9dacb' }}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
        <h2 className="text-xl font-bold drop-shadow-md" style={{ color: '#4a3a2a' }}>ガチャ選択</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-95"
            style={{ backgroundColor: 'rgba(139, 111, 71, 0.3)', color: '#5a4a3a' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(139, 111, 71, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(139, 111, 71, 0.3)';
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
                    ? "shadow-lg scale-[1.02]"
                    : "hover:shadow-md active:scale-[0.98]"
                }`}
                style={
                  selectedGacha.id === gacha.id
                    ? { background: 'linear-gradient(to right, #d4af37, #b8941f)', color: '#ffffff' }
                    : { backgroundColor: 'rgba(255, 255, 255, 0.5)', color: '#4a3a2a' }
                }
                onMouseEnter={(e) => {
                  if (selectedGacha.id !== gacha.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedGacha.id !== gacha.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      gacha.iconImageUrl && gacha.iconImageUrl.trim() !== ""
                        ? gacha.iconImageUrl
                        : "/images/gacha/default-icon.png"
                    }
                    alt={gacha.name}
                    className="h-12 w-12 flex-shrink-0 rounded-lg object-cover border shadow-sm"
                    style={{ borderColor: '#8b6f47' }}
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
                          : ""
                      }`}
                      style={selectedGacha.id !== gacha.id ? { color: '#4a3a2a' } : {}}
                    >
                      {gacha.name}
                    </div>
                  </div>
                </div>
                {gacha.description && (
                  <div
                    className={`text-xs leading-relaxed break-words whitespace-pre-line ${
                      selectedGacha.id === gacha.id
                        ? "text-white/90"
                        : ""
                    }`}
                    style={selectedGacha.id !== gacha.id ? { color: '#6b5a4a' } : {}}
                  >
                    {renderMarkdownLinks(
                      gacha.description,
                      undefined,
                      selectedGacha.id === gacha.id ? "text-white/90 underline" : undefined
                    )}
                  </div>
                )}
                {gacha.pointCost !== undefined && gacha.pointCost > 0 && (
                  <div
                    className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      selectedGacha.id === gacha.id
                        ? "bg-white/20 text-white"
                        : ""
                    }`}
                    style={selectedGacha.id !== gacha.id ? { backgroundColor: 'rgba(139, 111, 71, 0.2)', color: '#7a5f37' } : {}}
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

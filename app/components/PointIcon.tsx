"use client";

type PointIconProps = {
  size?: number | string;
  className?: string;
  active?: boolean;
};

/**
 * ポイントアイコンコンポーネント
 * icon-point-symbol.svg または icon-point-symbol-active.svg を表示
 */
export default function PointIcon({
  size = 16,
  className = "",
  active = false,
}: PointIconProps) {
  const iconPath = active
    ? "/icons/navigation/icon-point-symbol-active.svg"
    : "/icons/navigation/icon-point-symbol.svg";

  return (
    <>
      <img
        src={iconPath}
        alt="ポイント"
        className={className}
        style={{ width: size, height: size }}
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
        className={className}
        style={{ width: size, height: size, display: "none" }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="8" fill="#F8FAFC" stroke="#D4AF37" strokeWidth="1.8" />
        <path d="M10 16V8h3.2a2.4 2.4 0 1 1 0 4.8H10" fill="none" stroke="#D4AF37" strokeWidth="1.8" />
      </svg>
    </>
  );
}

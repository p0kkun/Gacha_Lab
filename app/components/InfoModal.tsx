"use client";

type InfoModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  variant?: "success" | "error" | "info";
};

export default function InfoModal({
  isOpen,
  title,
  message,
  confirmLabel = "閉じる",
  onConfirm,
  variant = "info",
}: InfoModalProps) {
  if (!isOpen) return null;

  // バリアントに応じたスタイル
  const getBorderColor = () => {
    switch (variant) {
      case "success":
        return "#4ade80"; // green-400
      case "error":
        return "#f87171"; // red-400
      default:
        return "#b89f7a";
    }
  };

  const getTitleColor = () => {
    switch (variant) {
      case "success":
        return "#16a34a"; // green-600
      case "error":
        return "#dc2626"; // red-600
      default:
        return "#4a3a2a";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-sm rounded-2xl border-2 p-6 shadow-2xl"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.95)", borderColor: getBorderColor() }}
      >
        <h2 className="mb-3 text-lg font-bold" style={{ color: getTitleColor() }}>
          {title}
        </h2>
        <p className="mb-6 text-sm leading-relaxed whitespace-pre-line" style={{ color: "#5a4a3a" }}>
          {message}
        </p>
        <button
          onClick={onConfirm}
          className="w-full rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-all"
          style={{
            background: variant === "success" 
              ? "linear-gradient(to right, #4ade80, #22c55e)"
              : variant === "error"
              ? "linear-gradient(to right, #f87171, #ef4444)"
              : "linear-gradient(to right, #b89f7a, #a68f6a)",
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

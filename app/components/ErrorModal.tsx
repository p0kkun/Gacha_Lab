"use client";

type ErrorModalProps = {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

export default function ErrorModal({
  isOpen,
  title = "エラーが発生しました",
  message,
  confirmLabel = "ホームへ",
  onConfirm,
}: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-sm rounded-2xl border-2 p-6 shadow-2xl"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.95)", borderColor: "#b89f7a" }}
      >
        <h2 className="mb-3 text-lg font-bold" style={{ color: "#4a3a2a" }}>
          {title}
        </h2>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: "#5a4a3a" }}>
          {message}
        </p>
        <button
          onClick={onConfirm}
          className="w-full rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-all"
          style={{
            background: "linear-gradient(to right, #b89f7a, #a68f6a)",
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

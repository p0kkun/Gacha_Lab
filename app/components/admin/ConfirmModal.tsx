"use client";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  /**
   * 変更内容（何から何へ）を表示したい場合に指定
   * - from/to は文字列化して渡す
   */
  changes?: Array<{
    label: string;
    from: string;
    to: string;
  }>;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
  isConfirmDisabled?: boolean;
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  changes,
  confirmText = "OK",
  cancelText = "キャンセル",
  onConfirm,
  onCancel,
  variant = "info",
  isConfirmDisabled = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      button: "bg-red-500 hover:bg-red-600 text-white",
      icon: "text-red-500",
    },
    warning: {
      button: "bg-yellow-500 hover:bg-yellow-600 text-white",
      icon: "text-yellow-500",
    },
    info: {
      button: "bg-blue-500 hover:bg-blue-600 text-white",
      icon: "text-blue-500",
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
        onClick={onCancel}
      />

      {/* モーダル */}
      <div
        className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* アイコンとタイトル */}
        <div className="mb-4 flex items-start gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 ${currentVariant.icon}`}
          >
            {variant === "danger" && (
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            {variant === "warning" && (
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            {variant === "info" && (
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-black">{title}</h3>
          </div>
        </div>

        {/* メッセージ */}
        <div className="mb-6">
          {typeof message === "string" ? (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {message}
            </p>
          ) : (
            <div className="text-sm text-gray-600">{message}</div>
          )}

          {Array.isArray(changes) && changes.length > 0 && (
            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 text-xs font-semibold text-gray-700">
                変更内容
              </div>
              <div className="space-y-2">
                {changes.map((c) => (
                  <div
                    key={c.label}
                    className="grid grid-cols-1 gap-1 text-xs text-gray-700"
                  >
                    <div className="font-semibold text-gray-800">{c.label}</div>
                    <div className="text-black">
                      <span className="font-medium">変更前:</span>{" "}
                      <span className="font-mono">{c.from}</span>
                    </div>
                    <div className="text-gray-700">
                      <span className="font-medium">変更後:</span>{" "}
                      <span className="font-mono">{c.to}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${currentVariant.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

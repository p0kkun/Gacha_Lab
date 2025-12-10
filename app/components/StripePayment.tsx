"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const getStripeKey = () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.error(
      "Stripe公開可能キーが設定されていません。.env.localファイルを確認してください。"
    );
    return "";
  }
  return key;
};

const stripePromise = loadStripe(getStripeKey());

type StripePaymentProps = {
  amount: number;
  userId: string;
  gachaTypeId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
};

export default function StripePayment({
  amount,
  userId,
  gachaTypeId,
  onSuccess,
  onCancel,
}: StripePaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // PaymentIntentを作成
    const createIntent = async () => {
      try {
        const response = await fetch("/api/payment/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amount,
            userId: userId,
            gachaTypeId: gachaTypeId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "決済の準備に失敗しました");
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error("PaymentIntent作成エラー:", err);
        setError(
          err instanceof Error ? err.message : "決済の準備に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    createIntent();
  }, [amount, userId, gachaTypeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-white">
          <div className="mb-2 animate-spin text-2xl">🎰</div>
          <div>決済を準備中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full rounded-lg bg-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-400"
          >
            閉じる
          </button>
        )}
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  // Stripeキーが設定されていない場合のエラー表示
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-600 mb-4">
          ⚠️ Stripe公開可能キーが設定されていません。
          <br />
          .env.localファイルにNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEYを設定してください。
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full rounded-lg bg-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-400"
          >
            閉じる
          </button>
        )}
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
        },
      }}
    >
      <CheckoutForm
        amount={amount}
        userId={userId}
        gachaTypeId={gachaTypeId}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}

/**
 * LINE内ブラウザかどうかを検出
 */
function isLineBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const userAgent = navigator.userAgent || navigator.vendor || "";
  return /Line/i.test(userAgent);
}

function CheckoutForm({
  amount,
  userId,
  gachaTypeId,
  onSuccess,
  onCancel,
}: {
  amount: number;
  userId: string;
  gachaTypeId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // LINE内ブラウザかどうかを検出（初期レンダリング時に一度だけ実行）
  const isLine = typeof window !== "undefined" ? isLineBrowser() : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // 決済を確認（clientSecretはElementsから取得）
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "決済に失敗しました");
        setLoading(false);
      } else {
        // 決済成功
        onSuccess();
      }
    } catch (err) {
      console.error("決済エラー:", err);
      setError(err instanceof Error ? err.message : "決済に失敗しました");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg bg-white p-4 sm:p-6 shadow-lg">
        <PaymentElement
          options={{
            layout: "accordion", // 縦並びのアコーディオン形式
            wallets: {
              applePay: "auto",
              googlePay: "auto", // Google Payを有効化（Androidでも表示される）
            },
            business: {
              name: "Gacha Lab",
            },
          }}
        />
        {/* LINE内ブラウザでGoogle Payを使用する場合の案内 */}
        {isLine && (
          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
            <p className="text-xs text-yellow-800">
              💡 Google
              Payを使用する場合は、外部ブラウザ（Chrome）で開く必要があります。
              <br />
              <button
                type="button"
                onClick={async () => {
                  try {
                    // LIFF APIを使用して外部ブラウザで開く
                    const liff = (await import("@line/liff")).default;
                    if (liff.isInClient()) {
                      liff.openWindow({
                        url: window.location.href,
                        external: true,
                      });
                    } else {
                      // 既に外部ブラウザの場合は何もしない
                      window.open(window.location.href, "_blank");
                    }
                  } catch (error) {
                    console.error("外部ブラウザで開くエラー:", error);
                    // フォールバック: 通常のwindow.openを使用
                    window.open(window.location.href, "_blank");
                  }
                }}
                className="mt-2 text-xs font-semibold text-yellow-900 underline hover:text-yellow-700"
              >
                外部ブラウザで開く
              </button>
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg bg-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-400 disabled:bg-gray-200"
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 rounded-lg bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:from-yellow-600 hover:via-yellow-700 hover:to-yellow-600 disabled:from-gray-400 disabled:via-gray-500 disabled:to-gray-400 disabled:opacity-50"
        >
          {loading ? "処理中..." : `¥${amount.toLocaleString()} を支払う`}
        </button>
      </div>

      {/* テストモードの説明 */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs text-blue-700">
          💳 テストモード: 実際の決済は発生しません。テストカード番号: 4242 4242
          4242 4242
        </p>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  initLiff,
  getProfile,
  isLoggedIn,
  login,
  type LiffProfile,
} from "@/lib/liff";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

// ポイント購入プラン
const POINT_PLANS = [
  { points: 100, price: 100, label: "100ポイント" },
  { points: 500, price: 500, label: "500ポイント" },
  { points: 1000, price: 1000, label: "1,000ポイント" },
  { points: 3000, price: 3000, label: "3,000ポイント" },
  { points: 5000, price: 5000, label: "5,000ポイント" },
  { points: 10000, price: 10000, label: "10,000ポイント" },
];

// CheckoutSection: clientSecretを管理してElementsに渡す
function CheckoutSection({
  plan,
  userId,
  onSuccess,
  onCancel,
}: {
  plan: (typeof POINT_PLANS)[0];
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // PaymentIntentを作成
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/points/purchase", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: plan.price,
            points: plan.points,
            userId,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "決済の準備に失敗しました");
        }

        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "決済の準備に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [plan.price, plan.points, userId]);

  if (loading) {
    return (
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="text-center">決済を準備中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {error}
        </div>
        <button
          onClick={onCancel}
          className="mt-4 w-full rounded-lg bg-gray-300 px-6 py-3 font-bold text-gray-700"
        >
          戻る
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="text-center">決済を準備中...</div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">決済</h2>
      <div className="mb-4 rounded-lg bg-blue-50 p-4">
        <div className="mb-2 text-sm text-gray-600">購入ポイント</div>
        <div className="text-2xl font-bold text-blue-600">
          {plan.points.toLocaleString()}ポイント
        </div>
        <div className="mt-2 text-sm text-gray-600">
          金額: ¥{plan.price.toLocaleString()}
        </div>
      </div>

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
          amount={plan.price}
          points={plan.points}
          userId={userId}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </Elements>
    </div>
  );
}

function CheckoutForm({
  amount,
  points,
  userId,
  onSuccess,
  onCancel,
}: {
  amount: number;
  points: number;
  userId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // clientSecretはElementsコンポーネントから自動的に取得される
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/points?success=true`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "決済に失敗しました");
        setLoading(false);
      } else {
        // 決済成功（リダイレクトが必要な場合は自動的にリダイレクトされる）
        onSuccess();
      }
    } catch (err) {
      console.error("決済エラー:", err);
      setError(err instanceof Error ? err.message : "決済に失敗しました");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <PaymentElement
        options={{
          wallets: {
            applePay: "auto",
            googlePay: "auto",
          },
          // PayPayはautomatic_payment_methodsで自動的に有効化される
          // 日本国内でJPY通貨を使用している場合、PayPayが自動的に表示される
        }}
        onReady={(e) => {
          console.log("PaymentElement ready:", e);
        }}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 rounded-lg bg-blue-500 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? "処理中..." : `¥${amount.toLocaleString()} を支払う`}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-gray-300 px-6 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-400"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}

function PointsPageContent() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<
    (typeof POINT_PLANS)[0] | null
  >(null);
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
        if (!liffId) {
          setLoading(false);
          return;
        }

        await initLiff(liffId);

        if (!isLoggedIn()) {
          login();
          return;
        }

        const userProfile = await getProfile();
        setProfile(userProfile);

        // ポイント残高を取得
        const res = await fetch(
          `/api/points/balance?userId=${userProfile.userId}`
        );
        if (res.ok) {
          const data = await res.json();
          setPoints(data.points);
        }
      } catch (err) {
        console.error("初期化エラー:", err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    // 決済成功時の処理（PayPayなどのリダイレクト型決済の場合）
    const paymentIntentId = searchParams.get("payment_intent");
    const paymentIntentClientSecret = searchParams.get(
      "payment_intent_client_secret"
    );
    const success = searchParams.get("success");

    if ((success === "true" || paymentIntentId) && profile && stripePromise) {
      // PayPay決済の場合、リダイレクト後に決済状態を確認
      const checkPaymentStatus = async () => {
        try {
          // Stripeインスタンスを取得
          const stripe = await stripePromise;

          if (!stripe) {
            console.error("Stripeインスタンスの取得に失敗しました");
            return;
          }

          // payment_intent_client_secretがある場合、決済状態を確認
          if (paymentIntentClientSecret) {
            const { paymentIntent } = await stripe.retrievePaymentIntent(
              paymentIntentClientSecret
            );

            if (!paymentIntent) {
              console.error("PaymentIntentの取得に失敗しました");
              return;
            }

            console.log("決済状態確認:", {
              id: paymentIntent.id,
              status: paymentIntent.status,
              payment_method: paymentIntent.payment_method,
            });

            if (paymentIntent.status === "succeeded") {
              console.log("決済成功を確認。Webhookの処理を待機中...");

              // 決済成功 - Webhookの処理を待つため、ポーリングでポイント残高を確認
              // PayPayなどのリダイレクト型決済では、Webhookが呼び出されるまでに時間がかかる場合がある
              const maxAttempts = 10; // 最大10回（10秒間）
              let pointsUpdated = false;

              for (let i = 0; i < maxAttempts; i++) {
                await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機

                const res = await fetch(
                  `/api/points/balance?userId=${profile.userId}`
                );
                if (res.ok) {
                  const data = await res.json();
                  const previousPoints = points || 0;

                  console.log(`ポイント残高確認 (${i + 1}/${maxAttempts}):`, {
                    previous: previousPoints,
                    current: data.points,
                    increased: data.points > previousPoints,
                  });

                  // ポイントが増加していたら、決済が成功したと判断
                  if (data.points > previousPoints) {
                    setPoints(data.points);
                    setSelectedPlan(null);
                    alert(
                      `ポイント購入が完了しました！\n${points}ポイント → ${data.points}ポイント`
                    );
                    pointsUpdated = true;

                    // URLパラメータをクリア
                    const url = new URL(window.location.href);
                    url.searchParams.delete("success");
                    url.searchParams.delete("payment_intent");
                    url.searchParams.delete("payment_intent_client_secret");
                    window.history.replaceState({}, "", url.toString());
                    break;
                  }
                }
              }

              if (!pointsUpdated) {
                // Webhookが処理されていない可能性がある
                console.warn("Webhookの処理が完了していない可能性があります。");
                // 最終的にポイント残高を更新
                const res = await fetch(
                  `/api/points/balance?userId=${profile.userId}`
                );
                if (res.ok) {
                  const data = await res.json();
                  setPoints(data.points);
                }
                alert(
                  "決済は成功しましたが、ポイントの反映に時間がかかっています。\nしばらくしてからページを更新してください。"
                );
                setSelectedPlan(null);
              }
            } else if (paymentIntent.status === "requires_payment_method") {
              // 決済がキャンセルされた場合
              alert("決済がキャンセルされました。");
              setSelectedPlan(null);
            }
          } else if (success === "true") {
            // successパラメータのみの場合、ポイント残高を再取得
            console.log("successパラメータを確認。Webhookの処理を待機中...");

            const maxAttempts = 10; // 最大10回（10秒間）
            let pointsUpdated = false;

            for (let i = 0; i < maxAttempts; i++) {
              await new Promise((resolve) => setTimeout(resolve, 1000));

              const res = await fetch(
                `/api/points/balance?userId=${profile.userId}`
              );
              if (res.ok) {
                const data = await res.json();
                const previousPoints = points || 0;

                console.log(`ポイント残高確認 (${i + 1}/${maxAttempts}):`, {
                  previous: previousPoints,
                  current: data.points,
                  increased: data.points > previousPoints,
                });

                if (data.points > previousPoints) {
                  setPoints(data.points);
                  setSelectedPlan(null);
                  alert(
                    `ポイント購入が完了しました！\n${points}ポイント → ${data.points}ポイント`
                  );
                  pointsUpdated = true;

                  const url = new URL(window.location.href);
                  url.searchParams.delete("success");
                  window.history.replaceState({}, "", url.toString());
                  break;
                }
              }
            }

            if (!pointsUpdated) {
              console.warn("Webhookの処理が完了していない可能性があります。");
              const res = await fetch(
                `/api/points/balance?userId=${profile.userId}`
              );
              if (res.ok) {
                const data = await res.json();
                setPoints(data.points);
              }
              alert(
                "決済は成功しましたが、ポイントの反映に時間がかかっています。\nしばらくしてからページを更新してください。"
              );
              setSelectedPlan(null);
            }
          }
        } catch (error) {
          console.error("決済状態確認エラー:", error);
        }
      };

      checkPaymentStatus();
    }
  }, [searchParams, profile, points]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-red-500">
          <div className="mb-4 text-lg">ログインが必要です</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
          ポイント購入
        </h1>

        {/* 現在のポイント残高 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="text-center">
            <div className="mb-2 text-sm text-gray-500">現在のポイント</div>
            <div className="text-3xl font-bold text-blue-600">
              {points !== null ? points.toLocaleString() : "-"}
            </div>
          </div>
        </div>

        {/* ポイントプラン選択 */}
        {!selectedPlan ? (
          <div className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              プランを選択
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {POINT_PLANS.map((plan) => (
                <button
                  key={plan.points}
                  onClick={() => setSelectedPlan(plan)}
                  className="rounded-lg border-2 border-gray-300 bg-white p-4 text-center transition-colors hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="mb-2 text-lg font-bold text-gray-800">
                    {plan.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    ¥{plan.price.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <CheckoutSection
            plan={selectedPlan}
            userId={profile.userId}
            onSuccess={() => {
              // ポイント残高を再取得
              fetch(`/api/points/balance?userId=${profile.userId}`)
                .then((res) => res.json())
                .then((data) => {
                  setPoints(data.points);
                  setSelectedPlan(null);
                });
            }}
            onCancel={() => setSelectedPlan(null)}
          />
        )}
      </div>
    </div>
  );
}

export default function PointsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg">読み込み中...</div>
          </div>
        </div>
      }
    >
      <PointsPageContent />
    </Suspense>
  );
}

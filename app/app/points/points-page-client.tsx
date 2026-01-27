"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { formatExpiryText, formatExpiryDate } from "@/lib/point-utils";
import type { PointPlan } from "@/lib/point-plan-types";
import PointIcon from "@/components/PointIcon";
import BottomNavigation from "@/components/BottomNavigation";
import { useErrorModal } from "@/components/ErrorModalProvider";
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

const formatHistoryDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (num: number) => num.toString().padStart(2, "0");
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(
    date.getDate()
  )}日 ${pad(date.getHours())}時${pad(date.getMinutes())}分${pad(
    date.getSeconds()
  )}秒`;
};

// CheckoutSection: clientSecretを管理してElementsに渡す
function CheckoutSection({
  plan,
  userId,
  onSuccess,
  onCancel,
  onPointsUpdated,
}: {
  plan: PointPlan;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
  onPointsUpdated?: (newPoints: number) => void;
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
            planId: plan.id,
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
  }, [plan.price ?? 0, plan.points, userId]);

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
          金額: ¥{plan.price?.toLocaleString() ?? "0"}
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
          amount={plan.price ?? 0}
          points={plan.points}
          userId={userId}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onPointsUpdated={onPointsUpdated}
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
  onPointsUpdated,
}: {
  amount: number;
  points: number;
  userId: string;
  onSuccess: () => void;
  onCancel?: () => void;
  onPointsUpdated?: (newPoints: number) => void;
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
      const { error: confirmError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/points?success=true`,
          },
          redirect: "if_required",
        });

      if (confirmError) {
        setError(confirmError.message || "決済に失敗しました");
        setLoading(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // カード決済が成功した場合、Webhookの処理を待つ
        console.log("決済成功を確認。Webhookの処理を待機中...", {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        });

        // ポイント残高をポーリングして更新
        const maxAttempts = 15; // 最大15回（15秒間）
        let pointsUpdated = false;

        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機

          try {
            const res = await fetch(`/api/points/balance?userId=${userId}`);
            if (res.ok) {
              const data = await res.json();
              const currentPoints = data.points;

              console.log(`ポイント残高確認 (${i + 1}/${maxAttempts}):`, {
                current: currentPoints,
              });

              // ポイントが増加したか確認（初回は前のポイント残高が分からないため、Webhookの処理を待つ）
              if (i >= 2) {
                // 3秒後から確認（Webhookの処理時間を考慮）
                if (onPointsUpdated) {
                  onPointsUpdated(currentPoints);
                }
                pointsUpdated = true;
                onSuccess();
                alert(
                  `ポイント購入が完了しました！\n${currentPoints.toLocaleString()}ポイント`
                );
                break;
              }
            }
          } catch (err) {
            console.error("ポイント残高取得エラー:", err);
          }
        }

        if (!pointsUpdated) {
          // Webhookが処理されていない可能性があるため、フォールバック処理を実行
          console.warn(
            "Webhookの処理が完了していない可能性があります。フォールバック処理を実行します。"
          );

          try {
            const confirmRes = await fetch("/api/points/confirm", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                paymentIntentId: paymentIntent.id,
                userId: userId,
              }),
            });

            if (confirmRes.ok) {
              const confirmData = await confirmRes.json();
              if (confirmData.success && onPointsUpdated) {
                onPointsUpdated(confirmData.points);
                onSuccess();
                alert(
                  `ポイント購入が完了しました！\n${confirmData.points.toLocaleString()}ポイント`
                );
              } else {
                onSuccess();
              }
            } else {
              onSuccess();
            }
          } catch (confirmError) {
            console.error("フォールバック処理エラー:", confirmError);
            onSuccess();
          }
        }
      } else {
        // リダイレクトが必要な場合（PayPayなど）
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
  const [selectedPlan, setSelectedPlan] = useState<PointPlan | null>(null);
  const [plans, setPlans] = useState<PointPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [showConfirmations, setShowConfirmations] = useState(true);
  const [points, setPoints] = useState<number | null>(null);
  const [pointBalances, setPointBalances] = useState<{
    paid: number;
    free: number;
    total: number;
    paidExpiresAt: string | null;
    freeExpiresAt: string | null;
    lastUpdated: string | null;
  } | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<
    Array<{
      id: number;
      paidPoints: number;
      freePoints: number;
      amount: number;
      planId: string | null;
      planLabel: string | null;
      createdAt: string;
    }>
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const { showError } = useErrorModal();
  const AGREED_SESSION_KEY = "points_purchase_agreed";

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(AGREED_SESSION_KEY);
      if (saved === "true") {
        setAgreed(true);
        setShowConfirmations(false);
      }
    } catch {
      // ignore session storage errors
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(AGREED_SESSION_KEY, agreed ? "true" : "false");
    } catch {
      // ignore session storage errors
    }
    if (agreed) {
      setShowConfirmations(false);
    }
  }, [agreed]);

  // 購入プランを取得（公開API）
  useEffect(() => {
    const fetchPlans = async () => {
      setPlansLoading(true);
      setPlansError(null);
      try {
        const res = await fetch("/api/points/plans");
        if (!res.ok) {
          throw new Error("購入プランの取得に失敗しました");
        }
        const data = await res.json();
        setPlans(Array.isArray(data.plans) ? data.plans : []);
      } catch (e) {
        console.error("購入プラン取得エラー:", e);
        setPlans([]);
        setPlansError(
          e instanceof Error ? e.message : "購入プランの取得に失敗しました"
        );
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // ポイント残高を更新するヘルパー関数
  const updatePointBalances = async (userId: string) => {
    const res = await fetch(`/api/points/balance?userId=${userId}`);
    if (res.ok) {
      const data = await res.json();
      setPoints(data.points);
      setPointBalances({
        paid: data.paid || 0,
        free: data.free || 0,
        total: data.total || 0,
        paidExpiresAt: data.paidExpiresAt,
        freeExpiresAt: data.freeExpiresAt,
        lastUpdated: data.lastUpdated,
      });
    }
  };

  // 購入履歴を取得するヘルパー関数
  const fetchPurchaseHistory = async (userId: string, page: number = 1) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/points/purchase-history?userId=${userId}&page=${page}&limit=29`
      );
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setPurchaseHistory(data.history || []);
        } else {
          setPurchaseHistory((prev) => [...prev, ...(data.history || [])]);
        }
        setHasMoreHistory(data.pagination?.hasMore || false);
      }
    } catch (e) {
      console.error("購入履歴取得エラー:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

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
        await updatePointBalances(userProfile.userId);
        // 購入履歴を取得（初回は1ページ目）
        await fetchPurchaseHistory(userProfile.userId, 1);
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
              next_action: paymentIntent.next_action,
            });

            // requires_action状態の場合、succeededになるまで待機
            let finalPaymentIntent = paymentIntent;
            if (paymentIntent.status === "requires_action") {
              console.log("決済が承認待ちです。状態を確認中...");

              // PaymentIntentの状態がsucceededになるまでポーリング
              const maxPollingAttempts = 30; // 最大30回（30秒間）
              let paymentSucceeded = false;

              for (let i = 0; i < maxPollingAttempts; i++) {
                await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機

                const { paymentIntent: updatedPaymentIntent } =
                  await stripe.retrievePaymentIntent(
                    paymentIntentClientSecret
                  );

                if (!updatedPaymentIntent) {
                  console.error("PaymentIntentの再取得に失敗しました");
                  break;
                }

                console.log(
                  `PaymentIntent状態確認 (${i + 1}/${maxPollingAttempts}):`,
                  {
                    status: updatedPaymentIntent.status,
                    id: updatedPaymentIntent.id,
                  }
                );

                if (updatedPaymentIntent.status === "succeeded") {
                  paymentSucceeded = true;
                  finalPaymentIntent = updatedPaymentIntent;
                  console.log("決済成功を確認。Webhookの処理を待機中...");
                  break;
                } else if (updatedPaymentIntent.status === "canceled") {
                  console.error(
                    "決済がキャンセルされました:",
                    updatedPaymentIntent.status
                  );
                  showError("決済がキャンセルされました。");
                  setSelectedPlan(null);
                  return;
                }
              }

              if (!paymentSucceeded) {
                console.warn(
                  "PaymentIntentがsucceeded状態になりませんでした。"
                );
                showError(
                  "決済の処理に時間がかかっています。しばらくしてからページを更新してください。",
                  { redirectTo: null, confirmLabel: "閉じる" }
                );
                setSelectedPlan(null);
                return;
              }
            }

            if (finalPaymentIntent.status === "succeeded") {
              console.log("決済成功を確認。Webhookの処理を待機中...");

              // 決済成功 - Webhookの処理を待つため、ポーリングでポイント残高を確認
              // PayPayなどのリダイレクト型決済では、Webhookが呼び出されるまでに時間がかかる場合がある
              const maxAttempts = 15; // 最大15回（15秒間）に延長
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
                    await updatePointBalances(profile.userId);
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
                console.warn(
                  "Webhookの処理が完了していない可能性があります。フォールバック処理を実行します。"
                );

                // フォールバック: 直接ポイントを付与
                try {
                  const confirmRes = await fetch("/api/points/confirm", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      paymentIntentId: finalPaymentIntent.id,
                      userId: profile.userId,
                    }),
                  });

                  if (confirmRes.ok) {
                    const confirmData = await confirmRes.json();
                    if (confirmData.success) {
                      await updatePointBalances(profile.userId);
                      setSelectedPlan(null);
                      alert(
                        `ポイント購入が完了しました！\n${
                          points || 0
                        }ポイント → ${confirmData.points}ポイント`
                      );

                      // URLパラメータをクリア
                      const url = new URL(window.location.href);
                      url.searchParams.delete("success");
                      url.searchParams.delete("payment_intent");
                      url.searchParams.delete("payment_intent_client_secret");
                      window.history.replaceState({}, "", url.toString());
                      return;
                    }
                  }
                } catch (confirmError) {
                  console.error("フォールバック処理エラー:", confirmError);
                }

                // フォールバック処理も失敗した場合
                await updatePointBalances(profile.userId);
                showError(
                  "決済は成功しましたが、ポイントの反映に時間がかかっています。\nしばらくしてからページを更新してください。",
                  { redirectTo: null, confirmLabel: "閉じる" }
                );
                setSelectedPlan(null);
              }
            } else if (paymentIntent.status === "requires_payment_method") {
              // 決済がキャンセルされた場合
              showError("決済がキャンセルされました。");
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
                  await updatePointBalances(profile.userId);
                  setSelectedPlan(null);
                  alert(
                    `ポイント購入が完了しました！\n${previousPoints}ポイント → ${data.points}ポイント`
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
              // successパラメータのみの場合は、PaymentIntent IDが取得できないため、
              // ユーザーにページを更新してもらう
              await updatePointBalances(profile.userId);
              showError(
                "決済は成功しましたが、ポイントの反映に時間がかかっています。\nページを更新してください。",
                { redirectTo: null, confirmLabel: "閉じる" }
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
  }, [searchParams, profile, points, showError]);

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
    <div className="min-h-screen p-4" style={{ backgroundColor: "#e9dacb" }}>
      <div className="mx-auto max-w-md">
        <h1
          className="mb-6 text-center text-2xl font-bold"
          style={{ color: "#4a3a2a" }}
        >
          ポイント購入
        </h1>

        {/* 現在のポイント残高 */}
        <div
          className="mb-6 rounded-lg p-6 shadow"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.6)" }}
        >
          <div className="text-center">
            <div className="mb-2 text-sm" style={{ color: "#6b5a4a" }}>
              現在のポイント
            </div>
            <div
              className="mb-4 text-3xl font-bold flex items-center justify-center gap-2"
              style={{ color: "#8b6f47" }}
            >
              <PointIcon size={32} className="h-8 w-8" active={true} />
              {points !== null ? points.toLocaleString() : "-"}
            </div>

            {/* 有償/無償ポイントの詳細 */}
            {pointBalances && (
              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">有償ポイント</span>
                  <span className="font-semibold text-gray-800 flex items-center gap-1">
                    <PointIcon size={14} className="h-3.5 w-3.5" active={true} />
                    {pointBalances.paid.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#6b5a4a" }}>無償ポイント</span>
                  <span
                    className="font-semibold flex items-center gap-1"
                    style={{ color: "#5a4a3a" }}
                  >
                    <PointIcon size={14} className="h-3.5 w-3.5" active={true} />
                    {pointBalances.free.toLocaleString()}
                  </span>
                </div>
                {/* 有効期限（有償と無償で同じなので一つだけ表示） */}
                {(pointBalances.paidExpiresAt ||
                  pointBalances.freeExpiresAt) && (
                  <div className="text-xs text-gray-500">
                    有効期限:{" "}
                    {formatExpiryText(
                      pointBalances.paidExpiresAt ||
                        pointBalances.freeExpiresAt
                    )}
                    {(pointBalances.paidExpiresAt ||
                      pointBalances.freeExpiresAt) &&
                      formatExpiryDate(
                        pointBalances.paidExpiresAt ||
                          pointBalances.freeExpiresAt
                      ) && (
                        <span className="ml-1">
                          (
                          {formatExpiryDate(
                            pointBalances.paidExpiresAt ||
                              pointBalances.freeExpiresAt
                          )}
                          )
                        </span>
                      )}
                  </div>
                )}
                {pointBalances.lastUpdated && (
                  <div className="mt-2 text-xs" style={{ color: "#8b7a6a" }}>
                    最終更新:{" "}
                    {new Date(pointBalances.lastUpdated).toLocaleString(
                      "ja-JP"
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ポイントプラン選択 */}
        {!selectedPlan ? (
          <div className="mb-6">
            <h2 className="mb-4 text-lg font-semibold" style={{ color: "#4a3a2a" }}>
              プランを選択
            </h2>
            {/* 確認事項 */}
            <div
              className="mb-4 rounded-xl border p-4 text-xs shadow-sm"
              style={{
                borderColor: "#b89f7a",
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                color: "#5a4a3a",
              }}
            >
              <button
                type="button"
                onClick={() => setShowConfirmations((prev) => !prev)}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">📝</span>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "#4a3a2a" }}
                  >
                    確認事項
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "#6b5a4a" }}>
                    {showConfirmations ? "閉じる" : "開く"}
                  </span>
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full border"
                    style={{
                      borderColor: "rgba(184,159,122,0.7)",
                      backgroundColor: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    <img
                      src="/icons/navigation/icon-chevron.svg"
                      alt=""
                      className="h-3 w-3"
                      style={{
                        transform: showConfirmations
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </span>
                </div>
              </button>
              {!showConfirmations ? (
                <div className="mt-2 text-xs" style={{ color: "#6b5a4a" }}>
                  すでに確認済みです。必要に応じて開いてください。
                </div>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: "rgba(184,159,122,0.4)" }}>
                    <div className="text-[11px] font-semibold" style={{ color: "#6b5a4a" }}>分量</div>
                    <div className="text-sm" style={{ color: "#4a3a2a" }}>選択したポイント数</div>
                  </div>
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: "rgba(184,159,122,0.4)" }}>
                    <div className="text-[11px] font-semibold" style={{ color: "#6b5a4a" }}>販売価格</div>
                    <div className="text-sm" style={{ color: "#4a3a2a" }}>選択した金額（税込）</div>
                  </div>
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: "rgba(184,159,122,0.4)" }}>
                    <div className="text-[11px] font-semibold" style={{ color: "#6b5a4a" }}>支払方法</div>
                    <div className="text-sm" style={{ color: "#4a3a2a" }}>クレジットカード / PayPay</div>
                  </div>
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: "rgba(184,159,122,0.4)" }}>
                    <div className="text-[11px] font-semibold" style={{ color: "#6b5a4a" }}>支払時期</div>
                    <div className="text-sm" style={{ color: "#4a3a2a" }}>決済完了時に請求が確定</div>
                  </div>
                  <div className="rounded-lg border px-3 py-2 sm:col-span-2" style={{ borderColor: "rgba(184,159,122,0.4)" }}>
                    <div className="text-[11px] font-semibold" style={{ color: "#6b5a4a" }}>提供時期</div>
                    <div className="text-sm" style={{ color: "#4a3a2a" }}>
                      決済成功後、基本的にはすぐに付与（処理状況により遅延する場合あり）
                    </div>
                  </div>
                  <div className="rounded-lg border px-3 py-2 sm:col-span-2" style={{ borderColor: "rgba(184,159,122,0.4)" }}>
                    <div className="text-[11px] font-semibold" style={{ color: "#6b5a4a" }}>有効期限</div>
                    <div className="text-sm" style={{ color: "#4a3a2a" }}>
                      最終更新日時から180日（同日・同時刻まで、秒単位で判定）
                    </div>
                  </div>
                  <div className="rounded-lg border px-3 py-2 sm:col-span-2" style={{ borderColor: "rgba(184,159,122,0.4)" }}>
                    <div className="text-[11px] font-semibold" style={{ color: "#6b5a4a" }}>申込みの撤回・解除</div>
                    <div className="text-sm" style={{ color: "#4a3a2a" }}>デジタル商品のためキャンセル・返金不可</div>
                  </div>
                </div>
              )}
            </div>
            {/* 同意ボックス */}
            <div
              className="mb-4 rounded-lg border p-4 text-sm"
              style={{
                borderColor: "#b89f7a",
                backgroundColor: "rgba(255, 255, 255, 0.6)",
              }}
            >
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1"
                />
                <span style={{ color: "#5a4a3a" }}>以下の規約に同意します</span>
              </label>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Link
                  href="/terms"
                  className="underline"
                  style={{ color: "#8b6f47" }}
                >
                  利用規約
                </Link>
                <Link
                  href="/privacy"
                  className="underline"
                  style={{ color: "#8b6f47" }}
                >
                  プライバシーポリシー
                </Link>
                <Link
                  href="/commercial-transaction"
                  className="underline"
                  style={{ color: "#8b6f47" }}
                >
                  特定商取引法に基づく表記
                </Link>
              </div>
              {!agreed && (
                <div className="mt-2 text-xs" style={{ color: "#8b6f47" }}>
                  ※ 同意しないとポイントプランを選択できません
                </div>
              )}
            </div>
            {plansLoading ? (
              <div
                className="rounded-lg p-6 text-center shadow"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.6)",
                  color: "#6b5a4a",
                }}
              >
                読み込み中...
              </div>
            ) : plansError ? (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                {plansError}
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                購入可能なプランがありません（管理画面でプランを設定してください）
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => agreed && setSelectedPlan(plan)}
                    disabled={!agreed}
                    className={`rounded-lg border-2 p-4 text-center transition-colors ${
                      agreed
                        ? "border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50"
                        : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <div className="mb-2 text-lg font-bold text-gray-800">
                      {plan.label}
                    </div>
                    {plan.bonusFreePoints > 0 && (
                      <div
                        className="mb-1 text-xs font-semibold"
                        style={{ color: "#8b6f47" }}
                      >
                        おまけ: +{plan.bonusFreePoints.toLocaleString()}pt（無償）
                      </div>
                    )}
                    <div className="text-sm" style={{ color: "#6b5a4a" }}>
                      ¥{plan.price?.toLocaleString() ?? "0"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <CheckoutSection
            plan={selectedPlan}
            userId={profile.userId}
            onSuccess={() => {
              setSelectedPlan(null);
            }}
            onCancel={() => setSelectedPlan(null)}
            onPointsUpdated={async (newPoints) => {
              setPoints(newPoints);
              // ポイント残高の詳細も再取得
              if (profile) {
                const res = await fetch(
                  `/api/points/balance?userId=${profile.userId}`
                );
                if (res.ok) {
                  const data = await res.json();
                  setPointBalances({
                    paid: data.paid || 0,
                    free: data.free || 0,
                    total: data.total || 0,
                    paidExpiresAt: data.paidExpiresAt,
                    freeExpiresAt: data.freeExpiresAt,
                    lastUpdated: data.lastUpdated,
                  });
                }
              }
            }}
          />
        )}

        {/* 購入履歴 */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">決済履歴</h2>
          {historyLoading ? (
            <div className="rounded-lg bg-white p-6 text-center text-gray-600 shadow">
              読み込み中...
            </div>
          ) : purchaseHistory.length === 0 ? (
            <div
              className="rounded-lg p-6 text-center shadow"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.6)", color: "#6b5a4a" }}
            >
              決済履歴がありません。
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {purchaseHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg p-4 shadow"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.6)" }}
                  >
                    <div className="mb-2 flex justify-between text-sm">
                      <span style={{ color: "#6b5a4a" }}>有償ポイント</span>
                      <span
                        className="font-semibold"
                        style={{ color: "#5a4a3a" }}
                      >
                        {item.paidPoints.toLocaleString()}
                      </span>
                    </div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-gray-600">無償ポイント</span>
                      <span className="font-semibold text-gray-800">
                        {item.freePoints.toLocaleString()}
                      </span>
                    </div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-gray-600">金額</span>
                      <span className="font-semibold text-gray-800">
                        ¥{item.amount.toLocaleString()}
                      </span>
                    </div>
                    {item.planLabel && (
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-gray-600">プラン</span>
                        <span className="text-gray-800">{item.planLabel}</span>
                      </div>
                    )}
                    <div className="mt-2 border-t pt-2 text-xs text-gray-500">
                      {formatHistoryDateTime(item.createdAt)}
                    </div>
                  </div>
                ))}
              </div>

              {/* もっと見る */}
              {hasMoreHistory && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      const nextPage = historyPage + 1;
                      setHistoryPage(nextPage);
                      if (profile) {
                        fetchPurchaseHistory(profile.userId, nextPage);
                      }
                    }}
                    disabled={historyLoading}
                    className="rounded-lg px-6 py-3 font-semibold text-white transition-colors"
                    style={{
                      background: historyLoading
                        ? "linear-gradient(to right, #8b7a6a, #7a6a5a)"
                        : "linear-gradient(to right, #b89f7a, #a68f6a)",
                      opacity: historyLoading ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!historyLoading) {
                        e.currentTarget.style.background =
                          "linear-gradient(to right, #c8af8a, #b89f7a)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!historyLoading) {
                        e.currentTarget.style.background =
                          "linear-gradient(to right, #b89f7a, #a68f6a)";
                      }
                    }}
                  >
                    {historyLoading ? "読み込み中..." : "もっと見る"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}

export default function PointsPageClient() {
  return <PointsPageContent />;
}

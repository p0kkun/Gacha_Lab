import { Suspense } from "react";
import PointsPageClient from "./points-page-client";

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
      const res = await fetch(`/api/points/purchase-history?userId=${userId}&page=${page}&limit=29`);
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
                  await stripe.retrievePaymentIntent(paymentIntentClientSecret);

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
    <div className="min-h-screen p-4" style={{ backgroundColor: '#e9dacb' }}>
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-center text-2xl font-bold" style={{ color: '#4a3a2a' }}>
          ポイント購入
        </h1>

        {/* 現在のポイント残高 */}
        <div className="mb-6 rounded-lg p-6 shadow" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
          <div className="text-center">
            <div className="mb-2 text-sm" style={{ color: '#6b5a4a' }}>現在のポイント</div>
            <div className="mb-4 text-3xl font-bold flex items-center justify-center gap-2" style={{ color: '#8b6f47' }}>
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
                  <span style={{ color: '#6b5a4a' }}>無償ポイント</span>
                  <span className="font-semibold flex items-center gap-1" style={{ color: '#5a4a3a' }}>
                    <PointIcon size={14} className="h-3.5 w-3.5" active={true} />
                    {pointBalances.free.toLocaleString()}
                  </span>
                </div>
                {/* 有効期限（有償と無償で同じなので一つだけ表示） */}
                {(pointBalances.paidExpiresAt || pointBalances.freeExpiresAt) && (
                  <div className="text-xs text-gray-500">
                    有効期限: {formatExpiryText(pointBalances.paidExpiresAt || pointBalances.freeExpiresAt)}
                    {(pointBalances.paidExpiresAt || pointBalances.freeExpiresAt) && formatExpiryDate(pointBalances.paidExpiresAt || pointBalances.freeExpiresAt) && (
                      <span className="ml-1">
                        ({formatExpiryDate(pointBalances.paidExpiresAt || pointBalances.freeExpiresAt)})
                      </span>
                    )}
                  </div>
                )}
                {pointBalances.lastUpdated && (
                  <div className="mt-2 text-xs" style={{ color: '#8b7a6a' }}>
                    最終更新: {new Date(pointBalances.lastUpdated).toLocaleString('ja-JP')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ポイントプラン選択 */}
        {!selectedPlan ? (
          <div className="mb-6">
            <h2 className="mb-4 text-lg font-semibold" style={{ color: '#4a3a2a' }}>
              プランを選択
            </h2>
            {/* 同意ボックス */}
            <div className="mb-4 rounded-lg border p-4 text-sm" style={{ borderColor: '#b89f7a', backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1"
                />
                <span style={{ color: '#5a4a3a' }}>
                  以下の規約に同意します
                </span>
              </label>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Link href="/terms" className="underline" style={{ color: '#8b6f47' }}>
                  利用規約
                </Link>
                <Link href="/privacy" className="underline" style={{ color: '#8b6f47' }}>
                  プライバシーポリシー
                </Link>
                <Link
                  href="/commercial-transaction"
                  className="underline"
                  style={{ color: '#8b6f47' }}
                >
                  特定商取引法に基づく表記
                </Link>
              </div>
              {!agreed && (
                <div className="mt-2 text-xs" style={{ color: '#8b6f47' }}>
                  ※ 同意しないとポイントプランを選択できません
                </div>
              )}
            </div>
            {/* 最終確認事項 */}
            <div className="mb-4 rounded-lg border p-4 text-xs" style={{ borderColor: '#b89f7a', backgroundColor: 'rgba(255, 255, 255, 0.5)', color: '#5a4a3a' }}>
              <div className="mb-2 text-sm font-semibold" style={{ color: '#4a3a2a' }}>
                最終確認事項
              </div>
              <ul className="space-y-1">
                <li>分量: 選択したポイント数</li>
                <li>販売価格: 選択した金額（税込）</li>
                <li>支払方法: クレジットカード / PayPay</li>
                <li>支払時期: 決済完了時に請求が確定</li>
                <li>提供時期: 決済成功後、基本的にはすぐに付与（処理状況により遅延する場合あり）</li>
                <li>有効期限: 最終更新日時から180日（同日・同時刻まで、秒単位で判定）</li>
                <li>申込みの撤回・解除: デジタル商品のためキャンセル・返金不可</li>
                <li>申込期間: 特に定めなし（販売終了時は購入不可）</li>
              </ul>
            </div>
            {plansLoading ? (
              <div className="rounded-lg p-6 text-center shadow" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', color: '#6b5a4a' }}>
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
                      ? 'border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50'
                      : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <div className="mb-2 text-lg font-bold text-gray-800">
                    {plan.label}
                  </div>
                    {plan.bonusFreePoints > 0 && (
                      <div className="mb-1 text-xs font-semibold" style={{ color: '#8b6f47' }}>
                        おまけ: +{plan.bonusFreePoints.toLocaleString()}pt（無償）
                      </div>
                    )}
                  <div className="text-sm" style={{ color: '#6b5a4a' }}>
                    ¥{plan.price?.toLocaleString() ?? '0'}
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
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            決済履歴
          </h2>
          {historyLoading ? (
            <div className="rounded-lg bg-white p-6 text-center text-gray-600 shadow">
              読み込み中...
            </div>
          ) : purchaseHistory.length === 0 ? (
            <div className="rounded-lg p-6 text-center shadow" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', color: '#6b5a4a' }}>
              決済履歴がありません。
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {purchaseHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg p-4 shadow"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
                  >
                    <div className="mb-2 flex justify-between text-sm">
                      <span style={{ color: '#6b5a4a' }}>有償ポイント</span>
                      <span className="font-semibold" style={{ color: '#5a4a3a' }}>
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
                      background: historyLoading ? 'linear-gradient(to right, #8b7a6a, #7a6a5a)' : 'linear-gradient(to right, #b89f7a, #a68f6a)',
                      opacity: historyLoading ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!historyLoading) {
                        e.currentTarget.style.background = 'linear-gradient(to right, #c8af8a, #b89f7a)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!historyLoading) {
                        e.currentTarget.style.background = 'linear-gradient(to right, #b89f7a, #a68f6a)';
                      }
                    }}
                  >
                    {historyLoading ? '読み込み中...' : 'もっと見る'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
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
      <PointsPageClient />
    </Suspense>
  );
}

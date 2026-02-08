"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  initLiff,
  getProfile,
  isLoggedIn,
  login,
  type LiffProfile,
} from "@/lib/liff";
import MyPage from "@/components/MyPage";
import GachaHistory from "@/components/GachaHistory";
import MyItems from "@/components/MyItems";
import HelpPage from "@/components/HelpPage";
import Referral from "@/components/Referral";
import HomePageContent from "@/components/HomePageContent";
import GachaScreen from "@/components/GachaScreen";

type ActivePage =
  | "home"
  | "gacha"
  | "mypage"
  | "history"
  | "items"
  | "help"
  | "referral";

function HomeContent() {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultGachaCode, setDefaultGachaCode] = useState<string | undefined>(undefined);
  const [points, setPoints] = useState<number | null>(null);
  const [pointBalances, setPointBalances] = useState<{
    paid: number;
    free: number;
    total: number;
    paidExpiresAt: string | null;
    freeExpiresAt: string | null;
    lastUpdated: string | null;
  } | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>("home");
  const [referralNotice, setReferralNotice] = useState<string | null>(null);
  const [pendingMessageIds, setPendingMessageIds] = useState<number[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [sendingPending, setSendingPending] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // URLパラメータからactionを取得してページを切り替え
  useEffect(() => {
    const action = searchParams.get("action");
    const gachaCode =
      searchParams.get("gacha") || searchParams.get("code") || undefined;

    if (action === "gacha") {
      setDefaultGachaCode(gachaCode);
      setActivePage("gacha");
      return;
    }

    setDefaultGachaCode(undefined);
    if (action === "mypage") {
      setActivePage("mypage");
    } else if (action === "history") {
      setActivePage("history");
    } else if (action === "items") {
      setActivePage("items");
    } else if (action === "help") {
      setActivePage("help");
    } else if (action === "referral") {
      setActivePage("referral");
    } else {
      setActivePage("home");
    }
  }, [searchParams, profile]);

  useEffect(() => {
    const fetchPointBalances = async (userId: string) => {
      try {
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
      } catch (error) {
        console.error("ポイント残高取得エラー:", error);
      }
    };

    const initialize = async () => {
      try {
        // LIFF IDは環境変数から取得（後で設定）
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";

        if (!liffId) {
          setError("LIFF IDが設定されていません");
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

        // ユーザー登録
        try {
          await fetch("/api/users/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userProfile.userId,
              displayName: userProfile.displayName,
              pictureUrl: userProfile.pictureUrl,
            }),
          });
        } catch (error) {
          console.error("ユーザー登録エラー:", error);
        }

        // 紹介リンクの検証（URLパラメータにrefがある場合）
        const urlParams = new URLSearchParams(window.location.search);
        const referralLinkId = urlParams.get('ref');
        if (referralLinkId && userProfile.userId) {
          try {
            const verifyRes = await fetch("/api/referral/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ 
                referralLinkId,
                userId: userProfile.userId, // ユーザーIDも送信してUser.lastAccessedReferralLinkIdに記録
              }),
            });

            const verifyData = verifyRes.ok ? await verifyRes.json() : null;
            if (verifyData?.isValid) {
              setReferralNotice(null);
              console.log("紹介リンクが適用されました:", referralLinkId);
              // 注意: 友だち追加時の判定は、User.lastAccessedReferralLinkIdを参照するため、
              // セッションストレージへの保存は不要（既にDBに記録されている）
            } else {
              setReferralNotice(
                verifyData?.reason || "紹介リンクの検証に失敗しました"
              );
            }
          } catch (error) {
            console.error("紹介リンク検証エラー:", error);
            setReferralNotice("紹介リンクの検証に失敗しました");
          }
        } else {
          setReferralNotice(null);
        }

        // ポイント残高を取得
        await fetchPointBalances(userProfile.userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    if (!profile?.userId) return;
    if (activePage !== "home") return;
    const fetchPointBalances = async () => {
      try {
        const res = await fetch(`/api/points/balance?userId=${profile.userId}`);
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
      } catch (error) {
        console.error("ポイント残高取得エラー:", error);
      }
    };
    fetchPointBalances();
  }, [activePage, profile?.userId]);

  useEffect(() => {
    const checkPendingMessages = async () => {
      if (!profile?.userId) return;
      try {
        const response = await fetch(
          `/api/messages/pending?userId=${profile.userId}&type=1`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data.count > 0 && Array.isArray(data.messages)) {
          setPendingMessageIds(
            data.messages.map((msg: { id: number }) => msg.id)
          );
          setShowPendingModal(true);
        } else {
          setPendingMessageIds([]);
          setShowPendingModal(false);
        }
      } catch (error) {
        console.error("未送信メッセージ確認エラー:", error);
      }
    };

    checkPendingMessages();
  }, [profile?.userId]);

  const sendPendingMessages = async () => {
    if (!profile?.userId || pendingMessageIds.length === 0) return;
    setSendingPending(true);
    try {
      await fetch("/api/messages/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageQueueIds: pendingMessageIds,
          userId: profile.userId,
        }),
      });
      setPendingMessageIds([]);
    } catch (error) {
      console.error("未送信メッセージ送信エラー:", error);
    } finally {
      setSendingPending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-red-500">
          <div className="mb-4 text-lg">エラー: {error}</div>
        </div>
      </div>
    );
  }

  // アクティブページに応じたコンテンツを表示
  const renderContent = () => {
    if (!profile) {
      return null;
    }

    switch (activePage) {
      case "gacha":
        return (
          <GachaScreen
            userId={profile.userId}
            defaultGachaCode={defaultGachaCode}
          />
        );
      case "mypage":
        return <MyPage profile={profile} />;
      case "history":
        return <GachaHistory userId={profile.userId} />;
      case "items":
        return <MyItems userId={profile.userId} />;
      case "help":
        return <HelpPage />;
      case "referral":
        return <Referral userId={profile.userId} />;
      case "home":
      default:
        return (
          <HomePageContent
            profile={profile}
            pointBalances={pointBalances}
            referralNotice={referralNotice}
            onOpenGacha={(gachaCode) => {
              setDefaultGachaCode(gachaCode);
              const params = new URLSearchParams(searchParams.toString());
              params.set("action", "gacha");
              if (gachaCode) {
                params.set("gacha", gachaCode);
              } else {
                params.delete("gacha");
                params.delete("code");
              }
              router.push(`/?${params.toString()}`);
            }}
          />
        );
    }
  };

  return (
    <>
      {renderContent()}
      {showPendingModal && pendingMessageIds.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-xl"
            style={{ backgroundColor: "#f7efe6", borderColor: "#b89f7a" }}
          >
            <h2
              className="mb-2 text-lg font-bold"
              style={{ color: "#4a3a2a" }}
            >
              未送信のガチャ結果があります
            </h2>
            <p className="mb-4 text-sm" style={{ color: "#6b5a4a" }}>
              {pendingMessageIds.length}件の結果を送信します。
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={async () => {
                  await sendPendingMessages();
                  setShowPendingModal(false);
                }}
                disabled={sendingPending}
                className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60"
                style={{
                  background: "linear-gradient(to right, #e7c675, #f5d48a)",
                  color: "#4a3a2a",
                  border: "1px solid #b89f7a",
                }}
              >
                確認する
              </button>
              <button
                onClick={async () => {
                  await sendPendingMessages();
                  setShowPendingModal(false);
                  setActivePage("items");
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("action", "items");
                  params.delete("gacha");
                  params.delete("code");
                  router.push(`/?${params.toString()}`);
                }}
                disabled={sendingPending}
                className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  color: "#4a3a2a",
                  border: "1px solid #b89f7a",
                }}
              >
                アイテム一覧へ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Home() {
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
      <HomeContent />
    </Suspense>
  );
}

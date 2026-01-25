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

            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              if (verifyData.isValid) {
                console.log("紹介リンクが適用されました:", referralLinkId);
                // 注意: 友だち追加時の判定は、User.lastAccessedReferralLinkIdを参照するため、
                // セッションストレージへの保存は不要（既にDBに記録されている）
              }
            }
          } catch (error) {
            console.error("紹介リンク検証エラー:", error);
          }
        }

        // ポイント残高を取得
        try {
          const res = await fetch(
            `/api/points/balance?userId=${userProfile.userId}`
          );
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

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

  return <>{renderContent()}</>;
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

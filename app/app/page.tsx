"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  initLiff,
  getProfile,
  isLoggedIn,
  login,
  type LiffProfile,
} from "@/lib/liff";
import GachaModal from "@/components/GachaModal";
import MyPage from "@/components/MyPage";
import GachaHistory from "@/components/GachaHistory";
import MyItems from "@/components/MyItems";
import HelpPage from "@/components/HelpPage";

type ActivePage = "home" | "mypage" | "history" | "items" | "help";

function HomeContent() {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGachaModalOpen, setIsGachaModalOpen] = useState(false);
  const [points, setPoints] = useState<number | null>(null);
  const [activePage, setActivePage] = useState<ActivePage>("home");
  const searchParams = useSearchParams();

  // URLパラメータからactionを取得してページを切り替え
  useEffect(() => {
    const action = searchParams.get("action");

    if (action === "gacha" && profile) {
      setIsGachaModalOpen(true);
      setActivePage("home");
    } else if (action === "mypage") {
      setActivePage("mypage");
    } else if (action === "history") {
      setActivePage("history");
    } else if (action === "items") {
      setActivePage("items");
    } else if (action === "help") {
      setActivePage("help");
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

        // ポイント残高を取得
        try {
          const res = await fetch(
            `/api/points/balance?userId=${userProfile.userId}`
          );
          if (res.ok) {
            const data = await res.json();
            setPoints(data.points);
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
      case "mypage":
        return <MyPage profile={profile} />;
      case "history":
        return <GachaHistory userId={profile.userId} />;
      case "items":
        return <MyItems userId={profile.userId} />;
      case "help":
        return <HelpPage />;
      case "home":
      default:
        return (
          <>
            <div className="flex min-h-screen flex-col bg-gray-100">
              <main className="flex-1 p-4">
                <div className="mx-auto max-w-md">
                  <h1 className="mb-4 text-center text-2xl font-bold text-gray-800">
                    Gacha Lab
                  </h1>

                  <div className="mb-4 rounded-lg bg-white p-4 shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {profile.pictureUrl && (
                          <img
                            src={profile.pictureUrl}
                            alt={profile.displayName}
                            className="h-12 w-12 rounded-full"
                          />
                        )}
                        <div>
                          <div className="font-semibold">
                            {profile.displayName}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {profile.userId}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">ポイント</div>
                        <div className="text-xl font-bold text-blue-600">
                          {points !== null ? points.toLocaleString() : "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-white p-4 shadow">
                    <p className="mb-4 text-center text-gray-600">
                      ガチャボタンを押してガチャを引こう！
                    </p>
                  </div>
                </div>
              </main>

              {/* 下部メニューバー（ガチャボタン・ポイント購入） */}
              <div className="border-t bg-white p-4">
                <div className="mx-auto max-w-md space-y-2">
                  <button
                    onClick={() => setIsGachaModalOpen(true)}
                    className="w-full rounded-lg bg-blue-500 px-6 py-3 text-lg font-bold text-white transition-colors hover:bg-blue-600"
                  >
                    ガチャ
                  </button>
                  <a
                    href="/points"
                    className="block w-full rounded-lg bg-green-500 px-6 py-3 text-center text-lg font-bold text-white transition-colors hover:bg-green-600"
                  >
                    ポイント購入
                  </a>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <>
      {renderContent()}

      {/* 全画面ガチャモーダル */}
      {profile && (
        <GachaModal
          isOpen={isGachaModalOpen}
          onClose={() => {
            setIsGachaModalOpen(false);
            // URLパラメータをクリア
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("action");
              window.history.replaceState({}, "", url.toString());
            }
          }}
          userId={profile.userId}
          currentPoints={points !== null ? points : 0}
          onPointsUpdated={(newPoints) => setPoints(newPoints)}
        />
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

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  initLiff,
  getProfile,
  isLoggedIn,
  login,
  type LiffProfile,
} from "@/lib/liff";
import GachaScreen from "@/components/GachaScreen";

function PickupContent() {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickupGacha, setPickupGacha] = useState<{
    gachaId: string;
    code: string;
    name: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initialize = async () => {
      try {
        // LIFF IDは環境変数から取得
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

        // ピックアップガチャ情報を取得
        try {
          const res = await fetch("/api/gacha/pickup");
          if (!res.ok) {
            throw new Error("ピックアップガチャの取得に失敗しました");
          }

          const data = await res.json();

          if (data.gachaId === null) {
            // ピックアップ未設定または無効な場合、一覧へ誘導
            console.log("ピックアップガチャが設定されていません。理由:", data.reason);
            // ホーム画面（ガチャ一覧）へリダイレクト
            router.push("/");
            return;
          }

          setPickupGacha(data);
        } catch (error) {
          console.error("ピックアップガチャ取得エラー:", error);
          // エラー時も一覧へ誘導
          router.push("/");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#e9dacb' }}>
        <div className="text-center">
          <div className="mb-4 text-lg" style={{ color: '#4a3a2a' }}>読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#e9dacb' }}>
        <div className="text-center">
          <div className="mb-4 text-lg" style={{ color: '#7f1d1d' }}>エラー: {error}</div>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg px-4 py-2 text-white"
            style={{ backgroundColor: '#8b6f47' }}
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // ピックアップガチャが取得できた場合、ガチャモーダルを表示
  return (
    <>
      {profile && pickupGacha && (
        <GachaScreen
          userId={profile.userId}
          defaultGachaCode={pickupGacha.code}
        />
      )}
    </>
  );
}

export default function PickupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#e9dacb' }}>
          <div className="text-center">
            <div className="mb-4 text-lg" style={{ color: '#4a3a2a' }}>読み込み中...</div>
          </div>
        </div>
      }
    >
      <PickupContent />
    </Suspense>
  );
}

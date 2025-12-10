"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  initLiff,
  getProfile,
  isLoggedIn,
  login,
  type LiffProfile,
} from "@/lib/liff";
import GachaModal from "@/components/GachaModal";

function SearchParamsHandler({
  onActionChange,
}: {
  onActionChange: (action: string | null) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const action = searchParams.get("action");
    onActionChange(action);
  }, [searchParams, onActionChange]);

  return null;
}

export default function Home() {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGachaModalOpen, setIsGachaModalOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isLineBrowser, setIsLineBrowser] = useState(false);

  useEffect(() => {
    const initializeLiff = async () => {
      const userAgent = navigator.userAgent || navigator.vendor || "";
      const isLineBrowserByUA = /Line/i.test(userAgent);
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!liffId) {
        setIsChecking(false);
        setLoading(false);
        return;
      }

      // LINE内ブラウザかどうかを設定
      setIsLineBrowser(isLineBrowserByUA);

      try {
        // LIFFを初期化（LINE内ブラウザでも外部ブラウザでも）
        await initLiff(liffId);

        // ログイン状態を確認
        if (isLoggedIn()) {
          // ログイン済みの場合はプロフィールを取得
          const userProfile = await getProfile();
          setProfile(userProfile);
        } else {
          // ログインが必要な場合は、ログインを試みる
          // LINE内ブラウザの場合は自動的にログイン画面に遷移
          // 外部ブラウザの場合は、ログインボタンを表示するか、自動的にログインを試みる
          if (isLineBrowserByUA) {
            login();
            return;
          }
          // 外部ブラウザの場合は、ログインを試みる（URLパラメータがある場合のみ）
          const params = new URLSearchParams(window.location.search);
          const action = params.get("action");
          if (action === "gacha") {
            // action=gachaがある場合は、ログインを試みる
            login();
          }
        }
      } catch (err) {
        console.error("LIFF初期化エラー:", err);
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
        setIsChecking(false);
      }
    };

    initializeLiff();
  }, []);

  const handleActionChange = (action: string | null) => {
    if (action === "gacha") {
      setIsGachaModalOpen(true);
    }
  };

  // URLパラメータをチェック（外部ブラウザでも処理）
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      if (action === "gacha") {
        setIsGachaModalOpen(true);
      }
    }
  }, []);

  // LINE内ブラウザの場合はローディング表示
  if (isChecking || (isLineBrowser && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  // LINE内ブラウザでエラーが発生した場合
  if (isLineBrowser && error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-red-500">
          <div className="mb-4 text-lg">エラー: {error}</div>
        </div>
      </div>
    );
  }

  // profileがある場合（LINE内ブラウザまたは外部ブラウザでログイン済み）、LIFFアプリとして動作
  if (profile) {
    return (
      <>
        <Suspense fallback={null}>
          <SearchParamsHandler onActionChange={handleActionChange} />
        </Suspense>
        {/* LINE内ブラウザの場合は背景を透明に、外部ブラウザの場合は通常の背景 */}
        <div
          className={
            isLineBrowser
              ? "min-h-screen bg-transparent"
              : "min-h-screen bg-gray-100"
          }
        >
          <GachaModal
            isOpen={isGachaModalOpen}
            onClose={() => setIsGachaModalOpen(false)}
            userId={profile.userId}
          />
        </div>
      </>
    );
  }

  // 通常のブラウザの場合はランディングページを表示
  // ただし、action=gachaパラメータがある場合はガチャモーダルも表示
  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsHandler onActionChange={handleActionChange} />
      </Suspense>
      {/* 外部ブラウザでaction=gachaがあるが、まだログインしていない場合の案内 */}
      {isGachaModalOpen && !profile && !loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">ガチャを引く</h2>
            <p className="text-gray-600 mb-4">
              LINEアカウントでログインしてください。
              <br />
              ログイン後、ガチャを引くことができます。
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setIsGachaModalOpen(false)}
                className="flex-1 rounded-lg bg-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-400"
              >
                閉じる
              </button>
              <a
                href="https://line.me/R/ti/p/@your-line-id"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-green-500 px-4 py-2 font-semibold text-white text-center hover:bg-green-600"
              >
                LINE公式アカウントで開く
              </a>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        {/* ヘッダー */}
        <header className="border-b bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-800">Gacha Lab</h1>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="mx-auto max-w-7xl px-4 py-12">
          {/* ヒーローセクション */}
          <section className="mb-16 text-center">
            <h2 className="mb-4 text-5xl font-bold text-gray-800">
              ポーカー風ガチャプラットフォーム
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
              LINE公式アカウント上で動作する、ホールデムポーカーの演出を楽しめるガチャサービスです。
              役の強さに応じてレアリティが決定され、エピック、レア、コモンの3段階でアイテムを獲得できます。
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="https://line.me/R/ti/p/@your-line-id"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-green-500 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-green-600"
              >
                LINE公式アカウントで開く
              </a>
            </div>
          </section>

          {/* サービス概要 */}
          <section className="mb-16">
            <h3 className="mb-8 text-center text-3xl font-bold text-gray-800">
              サービス概要
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow-md">
                <div className="mb-4 text-4xl">🎰</div>
                <h4 className="mb-2 text-xl font-semibold text-gray-700">
                  ポーカー風ガチャ
                </h4>
                <p className="text-gray-600">
                  ホールデムポーカーの演出を楽しみながら、様々なアイテムやクーポンを獲得できます。
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-md">
                <div className="mb-4 text-4xl">🎁</div>
                <h4 className="mb-2 text-xl font-semibold text-gray-700">
                  レアリティシステム
                </h4>
                <p className="text-gray-600">
                  役の強さに応じて、エピック、レア、コモンの3段階のレアリティでアイテムが提供されます。
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-md">
                <div className="mb-4 text-4xl">📱</div>
                <h4 className="mb-2 text-xl font-semibold text-gray-700">
                  LINE連携
                </h4>
                <p className="text-gray-600">
                  LINE公式アカウントから簡単にアクセスでき、LINEアカウントでログインできます。
                </p>
              </div>
            </div>
          </section>

          {/* 企業情報 */}
          <section className="mb-16 rounded-lg bg-white p-8 shadow-md">
            <h3 className="mb-6 text-center text-3xl font-bold text-gray-800">
              運営企業情報
            </h3>
            <div className="mx-auto max-w-2xl space-y-4 text-gray-600">
              <div>
                <strong className="text-gray-700">企業名:</strong> Gacha Lab
              </div>
              <div>
                <strong className="text-gray-700">サービス名:</strong> Gacha Lab
              </div>
              <div>
                <strong className="text-gray-700">サービス内容:</strong>{" "}
                ポーカー風ガチャプラットフォーム
              </div>
              <div>
                <strong className="text-gray-700">提供商品:</strong>{" "}
                ガチャ抽選サービス、ポーカーイベントのクーポン、バウチャー、その他デジタルアイテム
              </div>
            </div>
          </section>

          {/* フッター */}
          <footer className="border-t bg-white py-8">
            <div className="mx-auto max-w-4xl">
              <div className="mb-4 flex flex-wrap justify-center gap-6">
                <Link
                  href="/about"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  サービスについて
                </Link>
                <Link
                  href="/commercial-transaction"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  特定商取引法に基づく表記
                </Link>
                <Link
                  href="/terms"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  サービス利用規約
                </Link>
                <Link
                  href="/privacy"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  プライバシーポリシー
                </Link>
              </div>
              <p className="text-center text-sm text-gray-500">
                © 2025 Gacha Lab. All rights reserved.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}

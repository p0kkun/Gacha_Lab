"use client";

import { useState } from "react";
import Link from "next/link";
import { GachaType } from "./GachaModal";
import MultiVideoPlayer from "./MultiVideoPlayer";
import BottomNavigation from "./BottomNavigation";
import PrizeListModal from "./PrizeListModal";
import GachaConfirmModal from "./GachaConfirmModal";
import PointIcon from "./PointIcon";

type GachaResult = {
  item: {
    id: number;
    name: string;
    rarity: "common" | "rare" | "epic";
  };
  videoUrls?: string[]; // 新しい動画システム（複数動画対応）
  timestamp: string;
  messageQueueId?: number; // メッセージ送信用ID
};

export default function GachaContent({
  selectedGacha,
  userId,
  onClose,
  onVideoStateChange,
  currentPoints,
  onPointsUpdated,
}: {
  selectedGacha: GachaType;
  userId: string;
  onClose: () => void;
  onVideoStateChange?: (isShowing: boolean) => void;
  currentPoints?: number;
  onPointsUpdated?: (newPoints: number) => void;
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [result, setResult] = useState<GachaResult | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  // 再生用URLはstateに保持して参照を安定化（再レンダーで新しい配列を渡さない）
  const [videoUrlsToPlay, setVideoUrlsToPlay] = useState<string[]>([]);
  const [showPrizeList, setShowPrizeList] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // メッセージ送信の共通関数
  const sendMessageAsync = async (messageQueueId: number) => {
    try {
      const response = await fetch("/api/gacha/send-result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageQueueId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log("メッセージ送信成功");
      } else {
        console.error("メッセージ送信失敗:", data.error);
      }
    } catch (error) {
      console.error("メッセージ送信エラー:", error);
    }
  };

  const handleDrawGachaClick = () => {
    // 確認モーダルを表示
    setShowConfirmModal(true);
  };

  const handleConfirmGacha = async () => {
    // 確認モーダルを閉じる
    setShowConfirmModal(false);

    // ポイント確認とガチャ実行
    setIsDrawing(true);
    setShowVideo(false);
    setVideoError(false);
    setVideoUrlsToPlay([]);
    // ガチャ開始時点では「動画表示中」にしない（動画を出すと決めた瞬間だけtrueにする）
    onVideoStateChange?.(false);

    try {
      const response = await fetch("/api/gacha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          gachaTypeId: selectedGacha.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "ガチャ抽選に失敗しました";

        // ポイント不足の場合は購入ページへリダイレクト
        if (
          response.status === 403 &&
          errorMessage.includes("ポイントが不足")
        ) {
          alert("ポイントが不足しています。ポイント購入ページへ移動します。");
          onVideoStateChange?.(false);
          window.location.href = "/points";
          return;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // ポイント残高を更新（コールバックを呼び出して親コンポーネントに通知）
      if (onPointsUpdated) {
        // APIレスポンスにpointsRemainingが含まれている場合はそれを使用
        // そうでない場合は、再度取得する必要があるが、ここではコールバックを呼び出すだけ
        if (data.pointsRemaining !== undefined) {
          onPointsUpdated(data.pointsRemaining);
        } else {
          // ポイント残高を再取得してからコールバックを呼び出す
          try {
            const balanceRes = await fetch(
              `/api/points/balance?userId=${userId}`
            );
            if (balanceRes.ok) {
              const balanceData = await balanceRes.json();
              onPointsUpdated(balanceData.total);
            }
          } catch (error) {
            // エラーは無視（ポイント残高の更新は重要ではない）
          }
        }
      }

      // まずresultを設定
      setResult(data);

      // 動画URLがある場合は動画を再生、ない場合は結果画面を表示
      if (
        data.videoUrls &&
        Array.isArray(data.videoUrls) &&
        data.videoUrls.length > 0
      ) {
        // 動画URLを検証（空文字列や無効なURLを除外）
        const validVideoUrls = data.videoUrls.filter(
          (url: string) => url && url.trim() !== ""
        );

        if (validVideoUrls.length > 0) {
          // 有効な動画URLがある場合は動画を再生
          setIsDrawing(false);
          setVideoUrlsToPlay(validVideoUrls);
          setShowVideo(true);
          setVideoError(false);
          onVideoStateChange?.(true);
        } else {
          // 動画URLが無効な場合は結果画面を表示
          setVideoUrlsToPlay([]);
          setShowVideo(false);
          setVideoError(false);
          setIsDrawing(false);
          onVideoStateChange?.(false);

          // メッセージ送信（動画がない場合）
          if (data.messageQueueId) {
            sendMessageAsync(data.messageQueueId);
          }
        }
      } else {
        // 動画がない場合は結果画面を直接表示
        setVideoUrlsToPlay([]);
        setShowVideo(false);
        setVideoError(false);
        setIsDrawing(false);
        onVideoStateChange?.(false);

        // メッセージ送信（動画がない場合）
        if (data.messageQueueId) {
          sendMessageAsync(data.messageQueueId);
        }
      }
    } catch (error) {
      console.error("ガチャエラー:", error);
      alert(
        error instanceof Error ? error.message : "ガチャ抽選に失敗しました"
      );
      setIsDrawing(false);
      setVideoUrlsToPlay([]);
      setShowVideo(false);
      setVideoError(false);
      onVideoStateChange?.(false);
    }
  };

  const handleVideoEnd = async () => {
    onVideoStateChange?.(false);

    // メッセージ送信（動画終了後）
    if (result?.messageQueueId) {
      try {
        const response = await fetch("/api/gacha/send-result", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messageQueueId: result.messageQueueId,
          }),
        });

        const data = await response.json();
        if (data.success) {
          console.log("メッセージ送信成功");
        } else {
          console.error("メッセージ送信失敗:", data.error);
          // エラー時も処理を続行（ユーザー体験を優先）
        }
      } catch (error) {
        console.error("メッセージ送信エラー:", error);
        // エラー時も処理を続行
      }
    }

    // 既存の処理
    setIsDrawing(false);
    setVideoUrlsToPlay([]);
    setShowVideo(false);
    setVideoError(false);
  };

  const handleVideoError = async () => {
    // モバイルアプリではアラートを表示しない（ユーザー体験を損なうため）
    // 代わりに結果画面を表示
    onVideoStateChange?.(false);

    // メッセージ送信（動画エラー時も送信）
    if (result?.messageQueueId) {
      await sendMessageAsync(result.messageQueueId);
    }

    setVideoError(true);
    setIsDrawing(false);
    setVideoUrlsToPlay([]);
    setShowVideo(false);
  };

  const handleCloseResult = () => {
    setResult(null);
    setVideoUrlsToPlay([]);
    setShowVideo(false);
    setVideoError(false);
    setIsDrawing(false);
    onVideoStateChange?.(false);
    // ガチャモーダルは開いたままにする（onCloseは呼ばない）
  };

  // 動画再生中は全画面
  if (showVideo && videoUrlsToPlay.length > 0) {
    return (
      <div className="fixed inset-0 z-[60] bg-black">
        <MultiVideoPlayer
          videoUrls={videoUrlsToPlay}
          onEnd={handleVideoEnd}
          onError={handleVideoError}
        />
      </div>
    );
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "epic":
        return "text-purple-600";
      case "rare":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case "epic":
        return "エピック";
      case "rare":
        return "レア";
      default:
        return "コモン";
    }
  };

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{ touchAction: "none" }}
      onTouchStart={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      {/* ヘッダー - ポーカーテーブル風 */}
      {!showVideo && (
        <div
          className="border-b px-6 py-4 shadow-lg"
          style={{ backgroundColor: "#e9dacb", borderColor: "#b89f7a" }}
        >
          <div className="flex items-center gap-3">
            {selectedGacha.iconImageUrl ? (
              <img
                src={selectedGacha.iconImageUrl}
                alt={selectedGacha.name}
                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover border-2 border-yellow-400 shadow-md"
                onError={(e) => {
                  // 画像読み込みエラー時はフォールバック表示
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = "flex";
                  }
                }}
              />
            ) : null}
            <div
              className={`text-2xl flex-shrink-0 ${
                selectedGacha.iconImageUrl ? "hidden" : ""
              }`}
            >
              🂡
            </div>
            <div className="min-w-0 flex-1">
              <h1
                className="text-2xl font-bold drop-shadow-lg break-words"
                style={{ color: "#4a3a2a" }}
              >
                {selectedGacha.name}
              </h1>
              {(selectedGacha.pointCost ?? 0) > 0 ? (
                <p
                  className="mt-1 text-sm font-semibold flex items-center gap-1"
                  style={{ color: "#8b6f47" }}
                >
                  必要:{" "}
                  <PointIcon size={14} className="h-3.5 w-3.5" active={true} />
                  {(selectedGacha.pointCost ?? 0).toLocaleString()}
                </p>
              ) : (
                <p
                  className="mt-1 text-sm font-semibold"
                  style={{ color: "#6b5a4a" }}
                >
                  無料
                </p>
              )}
            </div>
            {/* 景品一覧・確率表示ボタン */}
            <button
              onClick={() => setShowPrizeList(true)}
              className="flex-shrink-0 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all active:scale-95"
              style={{
                borderColor: "#b89f7a",
                backgroundColor: "rgba(255, 255, 255, 0.4)",
                color: "#5a4a3a",
              }}
              title="景品一覧・確率を表示"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span className="hidden sm:inline">景品・確率</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* メインコンテンツ - ポーカーテーブル風 */}
      <div
        className={`flex-1 overflow-hidden ${showVideo ? "" : ""}`}
        style={{ backgroundColor: "#e9dacb" }}
      >
        {!result && (
          <div className="flex min-h-full flex-col">
            {/* アイコン画像またはデフォルト画像 - 横幅いっぱい */}
            <div className="w-full overflow-hidden">
              <img
                src={
                  selectedGacha.iconImageUrl &&
                  selectedGacha.iconImageUrl.trim() !== ""
                    ? selectedGacha.iconImageUrl
                    : "/images/gacha/default-icon.png"
                }
                alt={selectedGacha.name}
                className="w-full object-cover"
                style={{
                  maxHeight: "40vh",
                  minHeight: "200px",
                  objectFit: "cover",
                  display: "block",
                }}
                onError={(e) => {
                  // 画像読み込みエラー時はデフォルト画像にフォールバック
                  const target = e.target as HTMLImageElement;
                  const defaultImagePath = "/images/gacha/default-icon.png";
                  const currentSrc = target.src;

                  // 既にデフォルト画像を試している場合は非表示（無限ループ防止）
                  if (
                    currentSrc.includes(defaultImagePath) ||
                    currentSrc.endsWith(defaultImagePath)
                  ) {
                    target.style.display = "none";
                  } else {
                    // デフォルト画像にフォールバック
                    target.src = defaultImagePath;
                  }
                }}
              />
            </div>

            {/* 説明文 */}
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-4 sm:py-6">
              {selectedGacha.description && (
                <div className="mb-4 w-full max-w-2xl">
                  <p
                    className="text-center text-base leading-relaxed break-words sm:text-lg"
                    style={{ color: "#5a4a3a" }}
                  >
                    {selectedGacha.description}
                  </p>
                </div>
              )}

              {/* トランプのスーツ装飾 */}
              <div className="mt-4 flex justify-center gap-4 text-2xl opacity-50 sm:gap-6 sm:text-3xl">
                <span className="text-red-400">♥</span>
                <span className="text-black">♠</span>
                <span className="text-red-400">♦</span>
                <span className="text-black">♣</span>
              </div>
            </div>
          </div>
        )}

        {/* 結果表示 - ポーカー風 */}
        {result && !showVideo && (
          <div
            className="mx-auto mt-6 max-w-md rounded-2xl border-2 p-8 shadow-2xl"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.6)",
              borderColor: "#b89f7a",
            }}
          >
            {videoError && (
              <div className="mb-4 rounded-lg p-4 text-center text-red-700" style={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}>
                <p className="font-semibold">⚠️ エラーが発生しました</p>
                <p className="mt-1 text-sm">動画の再生に失敗しました</p>
              </div>
            )}
            <h3 className="mb-6 text-center text-2xl font-bold drop-shadow-lg" style={{ color: "#4a3a2a" }}>
              🎉 獲得！
            </h3>
            <div className="text-center">
              <div
                className={`mb-4 text-2xl font-bold drop-shadow-lg break-words px-2 ${
                  result.item.rarity === "epic"
                    ? "text-purple-600"
                    : result.item.rarity === "rare"
                    ? "text-blue-600"
                    : "text-yellow-700"
                }`}
              >
                {result.item.name}
              </div>
              <div
                className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${
                  result.item.rarity === "epic"
                    ? "bg-purple-600 text-white"
                    : result.item.rarity === "rare"
                    ? "bg-blue-600 text-white"
                    : "bg-yellow-700 text-white"
                }`}
              >
                レアリティ: {getRarityLabel(result.item.rarity)}
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              <button
                onClick={handleDrawGachaClick}
                className="w-full rounded-lg px-6 py-3 font-bold text-white shadow-lg transition-all hover:shadow-xl"
                style={{
                  background: "linear-gradient(to right, #b89f7a, #a68f6a)",
                }}
              >
                もう一度引く
              </button>
              <Link
                href="/?action=items"
                className="w-full rounded-lg border px-6 py-3 text-center font-semibold transition-all hover:shadow-md"
                style={{
                  borderColor: "#b89f7a",
                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                  color: "#5a4a3a",
                }}
              >
                アイテム画面へ
              </Link>
              <button
                onClick={handleCloseResult}
                className="w-full rounded-lg px-6 py-3 font-semibold transition-all hover:shadow-md"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.4)",
                  color: "#6b5a4a",
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>

      {/* フッター（ガチャを引くボタン） - ポーカー風 */}
      {!showVideo && (
        <div
          className="border-t px-6 py-4 pb-24 shadow-lg"
          style={{ backgroundColor: "#e9dacb", borderColor: "#b89f7a" }}
        >
          <button
            onClick={handleDrawGachaClick}
            disabled={isDrawing}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 px-6 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:from-yellow-600 hover:via-yellow-700 hover:to-yellow-600 hover:shadow-yellow-500/50 disabled:from-gray-600 disabled:via-gray-700 disabled:to-gray-600 disabled:opacity-50"
          >
            {/* 光るエフェクト */}
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>

            <span className="relative z-10 flex items-center justify-center gap-2 flex-wrap">
              {isDrawing ? (
                <>
                  <span className="animate-spin">🎰</span>
                  <span className="whitespace-nowrap">抽選中...</span>
                </>
              ) : (
                <>
                  <img
                    src="/icons/navigation/icon-gacha.svg"
                    alt="ガチャ"
                    className="h-5 w-5 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="whitespace-nowrap flex items-center gap-1">
                    ガチャを引く
                    {(selectedGacha.pointCost ?? 0) > 0 ? (
                      <span className="hidden sm:inline flex items-center gap-0.5">
                        {" "}
                        (
                        <PointIcon
                          size={12}
                          className="h-3 w-3"
                          active={true}
                        />
                        {(selectedGacha.pointCost ?? 0).toLocaleString()})
                      </span>
                    ) : (
                      <span className="hidden sm:inline"> (無料)</span>
                    )}
                  </span>
                  <span className="flex-shrink-0">🂡</span>
                </>
              )}
            </span>
          </button>
        </div>
      )}

      {/* ボトムナビゲーション - 動画再生中は非表示 */}
      {!showVideo && (
        <BottomNavigation
          currentPage="gacha"
          hideSpacer={true}
          transparent={false}
        />
      )}

      {/* 景品一覧モーダル */}
      <PrizeListModal
        isOpen={showPrizeList}
        onClose={() => setShowPrizeList(false)}
        gachaTypeId={selectedGacha.id}
      />

      {/* ガチャ実行確認モーダル */}
      <GachaConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmGacha}
        gachaName={selectedGacha.name}
        pointCost={selectedGacha.pointCost ?? 0}
        onShowPrizeList={() => setShowPrizeList(true)}
      />
    </div>
  );
}

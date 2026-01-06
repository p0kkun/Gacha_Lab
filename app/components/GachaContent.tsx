"use client";

import { useState } from "react";
import { GachaType } from "./GachaModal";
import MultiVideoPlayer from "./MultiVideoPlayer";

type GachaResult = {
  item: {
    id: number;
    name: string;
    rarity: "common" | "rare" | "epic";
  };
  videoUrls?: string[]; // 新しい動画システム（複数動画対応）
  timestamp: string;
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

  const handleDrawGacha = async () => {
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
        }
      } else {
        // 動画がない場合は結果画面を直接表示
        setVideoUrlsToPlay([]);
        setShowVideo(false);
        setVideoError(false);
        setIsDrawing(false);
        onVideoStateChange?.(false);
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

  const handleVideoEnd = () => {
    setIsDrawing(false);
    setVideoUrlsToPlay([]);
    setShowVideo(false);
    setVideoError(false);
    onVideoStateChange?.(false);
  };

  const handleVideoError = () => {
    // モバイルアプリではアラートを表示しない（ユーザー体験を損なうため）
    // 代わりに結果画面を表示
    setVideoError(true);
    setIsDrawing(false);
    setVideoUrlsToPlay([]);
    setShowVideo(false);
    onVideoStateChange?.(false);
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
      className="relative flex h-full flex-col"
      style={{ touchAction: "none" }}
      onTouchStart={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      {/* ヘッダー - ポーカーテーブル風 */}
      {!showVideo && (
        <div className="border-b border-green-600 bg-gradient-to-r from-green-900 via-green-800 to-green-900 px-6 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            {selectedGacha.iconImageUrl ? (
              <img
                src={selectedGacha.iconImageUrl}
                alt={selectedGacha.name}
                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover border-2 border-yellow-400"
                onError={(e) => {
                  // 画像読み込みエラー時は非表示
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="text-2xl flex-shrink-0">🂡</div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-yellow-300 drop-shadow-lg break-words">
                {selectedGacha.name}
              </h1>
              {selectedGacha.description && (
                <p className="mt-1 text-sm text-green-200 break-words leading-relaxed">
                  {selectedGacha.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ - ポーカーテーブル風 */}
      <div
        className={`flex-1 overflow-y-auto bg-gradient-to-br from-green-900 via-green-800 to-green-900 ${
          showVideo ? "" : "p-8"
        }`}
      >
        {!result && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              {/* ポーカーチップ風の装飾 */}
              <div className="mb-8 flex justify-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 shadow-xl ring-4 ring-yellow-400"></div>
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 shadow-xl ring-4 ring-yellow-400"></div>
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-600 to-green-800 shadow-xl ring-4 ring-yellow-400"></div>
              </div>
              
              <p className="mb-4 text-2xl font-bold text-yellow-300 drop-shadow-lg whitespace-nowrap">
                🎰 ポーカー風ガチャ
              </p>
              <p className="mb-2 text-lg text-green-200 break-words px-4">
                カードを引いてアイテムを獲得しましょう！
              </p>
              {(selectedGacha.pointCost ?? 0) > 0 && (
                <p className="text-lg font-semibold text-yellow-300 whitespace-nowrap">
                  必要: ${(selectedGacha.pointCost ?? 0).toLocaleString()}
                </p>
              )}
              
              {/* トランプのスーツ装飾 */}
              <div className="mt-8 flex justify-center gap-6 text-4xl opacity-50">
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
          <div className="mx-auto mt-6 max-w-md rounded-2xl border-4 border-yellow-400 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 shadow-2xl ring-4 ring-yellow-500 ring-opacity-50">
            {videoError && (
              <div className="mb-4 rounded-lg bg-red-900 bg-opacity-50 p-4 text-center text-red-200">
                <p className="font-semibold">⚠️ エラーが発生しました</p>
                <p className="mt-1 text-sm">動画の再生に失敗しました</p>
              </div>
            )}
            <h3 className="mb-6 text-center text-2xl font-bold text-yellow-300 drop-shadow-lg">
              🎉 獲得！
            </h3>
            <div className="text-center">
              <div
                className={`mb-4 text-2xl font-bold drop-shadow-lg break-words px-2 ${
                  result.item.rarity === "epic"
                    ? "text-purple-400"
                    : result.item.rarity === "rare"
                    ? "text-blue-400"
                    : "text-yellow-300"
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
                    : "bg-gray-600 text-yellow-200"
                }`}
              >
                レアリティ: {getRarityLabel(result.item.rarity)}
              </div>
            </div>
            <button
              onClick={handleCloseResult}
              className="mt-6 w-full rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:from-yellow-600 hover:to-yellow-700 hover:shadow-xl"
            >
              ✓ 閉じる
            </button>
          </div>
        )}
      </div>

      {/* フッター（ガチャを引くボタン） - ポーカー風 */}
      {!showVideo && (
        <div className="border-t border-green-600 bg-gradient-to-r from-green-900 via-green-800 to-green-900 px-6 py-4 shadow-lg">
          <button
            onClick={handleDrawGacha}
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
                  <span className="flex-shrink-0">🂡</span>
                  <span className="whitespace-nowrap">
                    カードを引く
                    {(selectedGacha.pointCost ?? 0) > 0 ? (
                      <span className="hidden sm:inline">
                        {" "}
                        (${(selectedGacha.pointCost ?? 0).toLocaleString()})
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
    </div>
  );
}

"use client";

import { useRef, useEffect, useState } from "react";

/**
 * 複数の動画を連続再生するコンポーネント
 * MDNのベストプラクティスに基づいた実装
 * - ループを明示的に無効化
 * - endedイベントで次の動画に切り替え
 * - 1回のみ再生（ループしない）
 */
export default function MultiVideoPlayer({
  videoUrls,
  onEnd,
  onError,
}: {
  videoUrls: string[];
  onEnd: () => void;
  onError?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const isPlayingRef = useRef(false);
  const hasEndedRef = useRef(false);
  const eventHandlersRef = useRef<{
    handleEnded: (() => void) | null;
    handleError: ((e: Event) => void) | null;
    handleCanPlay: (() => void) | null;
  }>({
    handleEnded: null,
    handleError: null,
    handleCanPlay: null,
  });

  // コールバック関数をrefで保持（最新の値を確実に使用）
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onEnd, onError]);

  // currentIndexが変更されたら動画を再生
  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoUrls.length === 0 || hasEndedRef.current) {
      return;
    }

    if (currentIndex >= videoUrls.length) {
      hasEndedRef.current = true;
      onEndRef.current();
      return;
    }

    const videoUrl = videoUrls[currentIndex];
    if (!videoUrl || videoUrl.trim() === "") {
      // 無効なURLの場合は次の動画へ、または終了
      if (currentIndex < videoUrls.length - 1) {
        // effect 内での同期的な setState を避けるため、非同期で更新
        setTimeout(() => {
          setCurrentIndex((prev) => Math.min(prev + 1, videoUrls.length - 1));
        }, 0);
      } else {
        hasEndedRef.current = true;
        onEndRef.current();
      }
      return;
    }

    // 動画の設定をリセット（MDNベストプラクティス）
    video.pause();
    video.currentTime = 0;
    video.loop = false; // ループを明示的に無効化
    video.src = videoUrl;
    video.load(); // 新しいソースを読み込む

    // 既存のイベントリスナーを削除
    if (eventHandlersRef.current.handleEnded) {
      video.removeEventListener("ended", eventHandlersRef.current.handleEnded);
    }
    if (eventHandlersRef.current.handleError) {
      video.removeEventListener("error", eventHandlersRef.current.handleError);
    }
    if (eventHandlersRef.current.handleCanPlay) {
      video.removeEventListener(
        "canplay",
        eventHandlersRef.current.handleCanPlay
      );
    }

    // イベントハンドラーを定義
    const handleEnded = () => {
      // ループを防ぐために確実に停止
      if (video) {
        video.pause();
        video.currentTime = 0;
      }

      // 次の動画がある場合は次の動画を再生
      if (currentIndex < videoUrls.length - 1) {
        isPlayingRef.current = false;
        // effect 内での同期的な setState を避けるため、非同期で更新
        setTimeout(() => {
          setCurrentIndex((prev) => Math.min(prev + 1, videoUrls.length - 1));
        }, 0);
      } else {
        // すべての動画が終了したら結果画面に遷移
        hasEndedRef.current = true;
        isPlayingRef.current = false;
        onEndRef.current();
      }
    };

    const handleError = (e: Event) => {
      const videoElement = e.target as HTMLVideoElement;
      const errorDetails = {
        error: videoElement.error,
        code: videoElement.error?.code,
        message: videoElement.error?.message,
        videoUrl: videoUrl,
        networkState: videoElement.networkState,
        readyState: videoElement.readyState,
      };
      if (videoElement.error) {
        const errorMessages: Record<number, string> = {
          1: "MEDIA_ERR_ABORTED: 動画の読み込みが中断されました",
          2: "MEDIA_ERR_NETWORK: ネットワークエラーが発生しました",
          3: "MEDIA_ERR_DECODE: 動画のデコードに失敗しました",
          4: "MEDIA_ERR_SRC_NOT_SUPPORTED: 動画形式がサポートされていません",
        };
        const errorMsg =
          errorMessages[videoElement.error.code] ||
          `不明なエラー (コード: ${videoElement.error.code})`;
        // 必要に応じてエラー内容を UI 側で扱えるようにすることも検討してください
      }

      // エラーが発生した場合は、エラーハンドラーを呼び出して結果画面へ
      hasEndedRef.current = true;
      isPlayingRef.current = false;
      if (onErrorRef.current) {
        onErrorRef.current();
      } else {
        onEndRef.current();
      }
    };

    const handleCanPlay = () => {
      // 動画が再生可能になったら自動再生
      if (!isPlayingRef.current && !hasEndedRef.current) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              isPlayingRef.current = true;
            })
            .catch((error) => {
              // 自動再生に失敗した場合はエラーハンドラーを呼び出す
              hasEndedRef.current = true;
              isPlayingRef.current = false;
              if (onErrorRef.current) {
                onErrorRef.current();
              } else {
                onEndRef.current();
              }
            });
        }
      }
    };

    // イベントハンドラーをrefに保存
    eventHandlersRef.current = {
      handleEnded,
      handleError,
      handleCanPlay,
    };

    // イベントリスナーを追加
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);
    video.addEventListener("canplay", handleCanPlay);

    // クリーンアップ関数
    return () => {
      if (eventHandlersRef.current.handleEnded) {
        video.removeEventListener(
          "ended",
          eventHandlersRef.current.handleEnded
        );
      }
      if (eventHandlersRef.current.handleError) {
        video.removeEventListener(
          "error",
          eventHandlersRef.current.handleError
        );
      }
      if (eventHandlersRef.current.handleCanPlay) {
        video.removeEventListener(
          "canplay",
          eventHandlersRef.current.handleCanPlay
        );
      }
      video.pause();
      video.src = "";
      video.load();
      isPlayingRef.current = false;
    };
  }, [currentIndex, videoUrls]);

  // コンポーネントがマウントされたら最初の動画を再生
  useEffect(() => {
    if (videoUrls.length === 0) {
      return;
    }

    // 初期状態をリセット
    hasEndedRef.current = false;
    isPlayingRef.current = false;
    // effect 内での同期的な setState を避けるため、非同期で更新
    setTimeout(() => {
      setCurrentIndex(0);
    }, 0);
  }, [videoUrls]);

  const handleVideoClick = () => {
    if (showSkipButton) {
      // もう一度クリックでスキップ
      handleSkip();
    } else {
      // 最初のクリックで「スキップする」ボタンを表示
      setShowSkipButton(true);
      // 3秒後に自動で非表示にする
      setTimeout(() => {
        setShowSkipButton(false);
      }, 3000);
    }
  };

  const handleSkip = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    // すべての動画をスキップして終了
    hasEndedRef.current = true;
    isPlayingRef.current = false;
    onEndRef.current();
  };

  if (videoUrls.length === 0) {
    return null;
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        controls={false}
        muted={true}
        playsInline
        loop={false}
        onClick={handleVideoClick}
        preload="auto"
      >
        お使いのブラウザは動画再生に対応していません。
      </video>
      {showSkipButton && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={handleVideoClick}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSkip();
            }}
            className="px-8 py-4 text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-opacity hover:opacity-80"
            style={{
              textShadow:
                "2px 2px 4px rgba(0,0,0,0.8), -2px -2px 4px rgba(0,0,0,0.8)",
            }}
          >
            スキップする
          </button>
        </div>
      )}
    </div>
  );
}

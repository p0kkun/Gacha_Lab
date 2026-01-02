"use client";

import { useRef, useEffect, useState } from "react";

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoUrls.length === 0) {
      return;
    }

    // 動画読み込みタイムアウト（10秒）
    let loadTimeout: NodeJS.Timeout | undefined = undefined;
    const LOAD_TIMEOUT_MS = 10000;

    const handleEnded = () => {
      console.log("[MultiVideoPlayer] 動画再生終了:", currentIndex);
      // 次の動画がある場合は次の動画を再生
      if (currentIndex < videoUrls.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // すべての動画が終了したら終了処理
        console.log("[MultiVideoPlayer] すべての動画が終了しました");
        onEnd();
      }
    };

    const handleError = (e: Event) => {
      const video = e.target as HTMLVideoElement;
      const errorDetails = {
        error: video.error,
        code: video.error?.code,
        message: video.error?.message,
        videoUrl: videoUrls[currentIndex],
        networkState: video.networkState,
        readyState: video.readyState,
        src: video.src,
        currentSrc: video.currentSrc,
      };
      console.error("[MultiVideoPlayer] 動画再生エラー:", errorDetails);

      // エラーコードの説明を追加
      if (video.error) {
        const errorMessages: Record<number, string> = {
          1: "MEDIA_ERR_ABORTED: 動画の読み込みが中断されました",
          2: "MEDIA_ERR_NETWORK: ネットワークエラーが発生しました",
          3: "MEDIA_ERR_DECODE: 動画のデコードに失敗しました",
          4: "MEDIA_ERR_SRC_NOT_SUPPORTED: 動画形式がサポートされていません",
        };
        const errorMsg =
          errorMessages[video.error.code] ||
          `不明なエラー (コード: ${video.error.code})`;
        console.error(`[MultiVideoPlayer] エラー詳細: ${errorMsg}`);
      }

      // エラーが発生した場合は、エラーハンドラーを呼び出して結果画面へ
      if (onError) {
        onError();
      } else {
        // エラーハンドラーがない場合は終了処理を実行
        onEnd();
      }
    };

    const handleLoadedData = () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };

    const handleCanPlay = () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
      // canplayイベントで再生を試みる（より確実）
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // 再生に失敗した場合はエラーハンドラーを呼び出す
          if (onError) {
            onError();
          } else {
            onEnd();
          }
        });
      }
    };

    const handleLoadedMetadata = () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };

    // 動画URLを設定
    const videoUrl = videoUrls[currentIndex];
    if (!videoUrl || videoUrl.trim() === "") {
      // 無効なURLの場合はエラーを発生させる
      if (onError) {
        onError();
      } else {
        onEnd();
      }
      return;
    }

    // 動画読み込みタイムアウトを設定
    loadTimeout = setTimeout(() => {
      // タイムアウトが発生した場合はエラーハンドラーを呼び出す
      if (onError) {
        onError();
      } else {
        onEnd();
      }
    }, LOAD_TIMEOUT_MS);

    video.src = videoUrl;
    video.load();

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);

    // 自動再生を試みる（mutedで再生を開始）
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (loadTimeout) {
            clearTimeout(loadTimeout);
          }
        })
        .catch(() => {
          // 再生に失敗した場合は、canplayイベントで再試行するため、ここではエラーを無視
          // ただし、一定時間後に再生できない場合はエラーハンドラーを呼び出す
          setTimeout(() => {
            if (video.paused && video.readyState < 3) {
              // 動画が再生できず、読み込みも完了していない場合はエラー
              if (loadTimeout) {
                clearTimeout(loadTimeout);
              }
              if (onError) {
                onError();
              } else {
                onEnd();
              }
            }
          }, 3000);
        });
    }

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [currentIndex, videoUrls, onEnd, onError]);

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
    onEnd();
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
        autoPlay
        muted={true}
        playsInline
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
      {videoUrls.length > 1 && (
        <div className="absolute bottom-4 right-4 rounded-full bg-black bg-opacity-50 px-3 py-1 text-sm text-white">
          {currentIndex + 1} / {videoUrls.length}
        </div>
      )}
    </div>
  );
}

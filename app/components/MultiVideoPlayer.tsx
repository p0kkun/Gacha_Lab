'use client';

import { useRef, useEffect, useState } from 'react';

export default function MultiVideoPlayer({
  videoUrls,
  onEnd,
}: {
  videoUrls: string[];
  onEnd: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSkipButton, setShowSkipButton] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoUrls.length === 0) return;

    const handleEnded = () => {
      // 次の動画がある場合は次の動画を再生
      if (currentIndex < videoUrls.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // すべての動画が終了したら終了処理
        onEnd();
      }
    };

    // 動画URLを設定
    video.src = videoUrls[currentIndex];
    video.load();

    video.addEventListener('ended', handleEnded);
    video.play().catch((error) => {
      console.error('動画再生エラー:', error);
      // 再生に失敗した場合も次の動画へ、または終了処理を実行
      if (currentIndex < videoUrls.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onEnd();
      }
    });

    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, videoUrls, onEnd]);

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
        muted={false}
        playsInline
        onClick={handleVideoClick}
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
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8), -2px -2px 4px rgba(0,0,0,0.8)' }}
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


'use client';

import { useRef, useEffect, useState } from 'react';

export default function VideoPlayer({
  videoUrl,
  onEnd,
}: {
  videoUrl: string;
  onEnd: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showSkipButton, setShowSkipButton] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      onEnd();
    };

    video.addEventListener('ended', handleEnded);
    video.play().catch((error) => {
      console.error('動画再生エラー:', error);
      // 再生に失敗した場合も終了処理を実行
      onEnd();
    });

    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [onEnd, videoUrl]);

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
    onEnd();
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
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
    </div>
  );
}



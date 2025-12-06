'use client';

import { useRef, useEffect } from 'react';

export default function VideoPlayer({
  videoUrl,
  onEnd,
}: {
  videoUrl: string;
  onEnd: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

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

  return (
    <div className="flex h-full items-center justify-center">
      <video
        ref={videoRef}
        src={videoUrl}
        className="max-h-full max-w-full"
        controls={false}
        autoPlay
        muted={false}
        playsInline
      >
        お使いのブラウザは動画再生に対応していません。
      </video>
    </div>
  );
}


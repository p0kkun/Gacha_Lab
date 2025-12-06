'use client';

import { useState } from 'react';
import { GachaType } from './GachaModal';
import VideoPlayer from './VideoPlayer';

type GachaResult = {
  item: {
    id: number;
    name: string;
    rarity: 'common' | 'rare' | 'epic';
    videoUrl: string;
  };
  timestamp: string;
};

export default function GachaContent({
  selectedGacha,
  userId,
  onClose,
}: {
  selectedGacha: GachaType;
  userId: string;
  onClose: () => void;
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [result, setResult] = useState<GachaResult | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  const handleDrawGacha = async () => {
    setIsDrawing(true);
    setShowVideo(true);

    try {
      const response = await fetch('/api/gacha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gachaType: selectedGacha.id,
        }),
      });

      if (!response.ok) {
        throw new Error('ガチャ抽選に失敗しました');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('ガチャエラー:', error);
      alert('ガチャ抽選に失敗しました');
      setIsDrawing(false);
      setShowVideo(false);
    }
  };

  const handleVideoEnd = () => {
    setIsDrawing(false);
    // 動画再生後も結果を表示し続ける
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowVideo(false);
    onClose();
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'epic':
        return 'text-purple-600';
      case 'rare':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'epic':
        return 'エピック';
      case 'rare':
        return 'レア';
      default:
        return 'コモン';
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      {/* ヘッダー */}
      <div className="border-b bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{selectedGacha.name}</h1>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            閉じる
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">{selectedGacha.description}</p>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto p-6">
        {showVideo && result ? (
          <VideoPlayer
            videoUrl={result.item.videoUrl}
            onEnd={handleVideoEnd}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="mb-8 text-lg text-gray-600">
                ガチャを引いてアイテムを獲得しましょう！
              </p>
            </div>
          </div>
        )}

        {/* 結果表示 */}
        {result && !showVideo && (
          <div className="mt-6 rounded-lg border-2 border-blue-500 bg-blue-50 p-6">
            <h3 className="mb-4 text-center text-xl font-bold">結果</h3>
            <div className="text-center">
              <div className={`mb-2 text-2xl font-bold ${getRarityColor(result.item.rarity)}`}>
                {result.item.name}
              </div>
              <div className="text-sm text-gray-600">
                レアリティ: {getRarityLabel(result.item.rarity)}
              </div>
            </div>
            <button
              onClick={handleCloseResult}
              className="mt-4 w-full rounded-lg bg-blue-500 px-6 py-3 text-white hover:bg-blue-600"
            >
              閉じる
            </button>
          </div>
        )}
      </div>

      {/* フッター（ガチャを引くボタン） */}
      {!showVideo && (
        <div className="border-t bg-gray-50 p-4">
          <button
            onClick={handleDrawGacha}
            disabled={isDrawing}
            className="w-full rounded-lg bg-blue-500 px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isDrawing ? '抽選中...' : 'ガチャを引く'}
          </button>
        </div>
      )}
    </div>
  );
}



'use client';

import { useState } from 'react';
import { GachaType } from './GachaModal';
import VideoPlayer from './VideoPlayer';
import HoldemGachaAnimation from './HoldemGachaAnimation';
import { type Card } from '@/lib/pokerHand';

type PokerHand = {
  hand: string;
  handName: string;
  holeCards: Card[];
  communityCards: Card[];
  allCards: Card[];
};

type GachaResult = {
  item: {
    id: number;
    name: string;
    rarity: 'common' | 'rare' | 'epic';
    videoUrl: string;
  };
  timestamp: string;
  pokerHand?: PokerHand;
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
  const [showAnimation, setShowAnimation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const handleDrawGacha = async () => {
    // ポイント確認とガチャ実行
    setIsDrawing(true);
    onVideoStateChange?.(true);

    try {
      const response = await fetch('/api/gacha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          gachaTypeId: selectedGacha.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'ガチャ抽選に失敗しました';
        
        // ポイント不足の場合は購入ページへリダイレクト
        if (response.status === 403 && errorMessage.includes('ポイントが不足')) {
          alert('ポイントが不足しています。ポイント購入ページへ移動します。');
          window.location.href = '/points';
          return;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setResult(data);

      // ポイント残高を更新
      if (data.pointsRemaining !== undefined && onPointsUpdated) {
        onPointsUpdated(data.pointsRemaining);
      }

      // 通常ガチャはポーカー演出、プレミアムは動画演出
      if (selectedGacha.id === 'normal' && data.pokerHand) {
        setShowAnimation(true);
      } else {
        setShowVideo(true);
      }
    } catch (error) {
      console.error('ガチャエラー:', error);
      alert(error instanceof Error ? error.message : 'ガチャ抽選に失敗しました');
      setIsDrawing(false);
      setShowVideo(false);
      setShowAnimation(false);
    }
  };

  const handleVideoEnd = () => {
    setIsDrawing(false);
    setShowVideo(false);
    onVideoStateChange?.(false);
  };

  const handleAnimationEnd = () => {
    setIsDrawing(false);
    setShowAnimation(false);
    onVideoStateChange?.(false);
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowVideo(false);
    setShowAnimation(false);
    setIsDrawing(false);
    onVideoStateChange?.(false);
    // ガチャモーダルは開いたままにする（onCloseは呼ばない）
  };

  // 演出表示中は全画面
  if (showAnimation && result && result.pokerHand) {
    return (
      <div className="fixed inset-0 z-[60] bg-black">
        <HoldemGachaAnimation
          finalResult={result.item}
          pokerHand={result.pokerHand}
          onAnimationEnd={handleAnimationEnd}
        />
      </div>
    );
  }

  if (showVideo && result) {
    return (
      <div className="fixed inset-0 z-[60] bg-black">
        <VideoPlayer
          videoUrl={result.item.videoUrl}
          onEnd={handleVideoEnd}
        />
      </div>
    );
  }

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
    <div 
      className="relative flex h-full flex-col"
      style={{ touchAction: 'none' }}
      onTouchStart={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      {/* ヘッダー - ポーカーテーブル風 */}
      {!showVideo && !showAnimation && (
        <div className="border-b border-green-600 bg-gradient-to-r from-green-900 via-green-800 to-green-900 p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🂡</div>
            <div>
              <h1 className="text-3xl font-bold text-yellow-300 drop-shadow-lg">
                {selectedGacha.name}
              </h1>
              <p className="mt-1 text-sm text-green-200">{selectedGacha.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ - ポーカーテーブル風 */}
      <div className={`flex-1 overflow-y-auto ${showVideo || showAnimation ? '' : 'p-8'}`}>
        {!result && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              {/* ポーカーチップ風の装飾 */}
              <div className="mb-8 flex justify-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 shadow-xl ring-4 ring-yellow-400"></div>
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 shadow-xl ring-4 ring-yellow-400"></div>
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-600 to-green-800 shadow-xl ring-4 ring-yellow-400"></div>
              </div>
              
              <p className="mb-4 text-2xl font-bold text-yellow-300 drop-shadow-lg">
                🎰 ポーカー風ガチャ
              </p>
              <p className="mb-2 text-lg text-green-200">
                カードを引いてアイテムを獲得しましょう！
              </p>
              {(selectedGacha.pointCost ?? 0) > 0 && (
                <p className="text-lg font-semibold text-yellow-300">
                  必要ポイント: {(selectedGacha.pointCost ?? 0).toLocaleString()}ポイント
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
        {result && !showVideo && !showAnimation && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border-4 border-yellow-400 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 shadow-2xl ring-4 ring-yellow-500 ring-opacity-50">
            <h3 className="mb-6 text-center text-2xl font-bold text-yellow-300 drop-shadow-lg">
              🎉 獲得！
            </h3>
            <div className="text-center">
              <div className={`mb-4 text-3xl font-bold drop-shadow-lg ${
                result.item.rarity === 'epic' ? 'text-purple-400' :
                result.item.rarity === 'rare' ? 'text-blue-400' :
                'text-yellow-300'
              }`}>
                {result.item.name}
              </div>
              <div className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${
                result.item.rarity === 'epic' ? 'bg-purple-600 text-white' :
                result.item.rarity === 'rare' ? 'bg-blue-600 text-white' :
                'bg-gray-600 text-yellow-200'
              }`}>
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
      {!showVideo && !showAnimation && !showPayment && (
        <div className="border-t border-green-600 bg-gradient-to-r from-green-900 via-green-800 to-green-900 p-6 shadow-lg">
          <button
            onClick={handleDrawGacha}
            disabled={isDrawing}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 px-8 py-5 text-xl font-bold text-white shadow-2xl transition-all duration-300 hover:from-yellow-600 hover:via-yellow-700 hover:to-yellow-600 hover:shadow-yellow-500/50 disabled:from-gray-600 disabled:via-gray-700 disabled:to-gray-600 disabled:opacity-50"
          >
            {/* 光るエフェクト */}
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>
            
            <span className="relative z-10 flex items-center justify-center gap-3">
              {isDrawing ? (
                <>
                  <span className="animate-spin">🎰</span>
                  <span>抽選中...</span>
                </>
              ) : (
                <>
                  <span>🂡</span>
                  <span>
                    カードを引く
                    {(selectedGacha.pointCost ?? 0) > 0 ? (
                      ` (${(selectedGacha.pointCost ?? 0).toLocaleString()}ポイント)`
                    ) : (
                      ' (無料)'
                    )}
                  </span>
                  <span>🂡</span>
                </>
              )}
            </span>
          </button>
        </div>
      )}

    </div>
  );
}



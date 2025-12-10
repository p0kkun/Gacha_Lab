'use client';

import { useState, useEffect } from 'react';
import PokerCard from './PokerCard';
import { getHandName, type Card } from '@/lib/pokerHand';

type GachaItem = {
  id: number;
  name: string;
  rarity: 'common' | 'rare' | 'epic';
};

type PokerHand = {
  hand: string;
  handName: string;
  holeCards: Card[];
  communityCards: Card[];
  allCards: Card[];
};

type Props = {
  finalResult: GachaItem;
  pokerHand: PokerHand;
  onAnimationEnd: () => void;
};

export default function HoldemGachaAnimation({ finalResult, pokerHand, onAnimationEnd }: Props) {
  const [holeCardStates, setHoleCardStates] = useState<Array<{ isFlipped: boolean }>>([
    { isFlipped: false },
    { isFlipped: false },
  ]);
  const [communityCardStates, setCommunityCardStates] = useState<Array<{ isFlipped: boolean }>>([]);
  const [phase, setPhase] = useState<'hole' | 'flop' | 'turn' | 'river' | 'reveal'>('hole');
  const [showResult, setShowResult] = useState(false);
  const [holeCardsFlipped, setHoleCardsFlipped] = useState(false);

  // ホールカードをめくる関数
  const flipHoleCards = () => {
    if (holeCardsFlipped) return; // 既にめくられている場合は何もしない
    
    setHoleCardsFlipped(true);
    setHoleCardStates([
      { isFlipped: true },
      { isFlipped: true },
    ]);
    setPhase('flop');
    
    // ホールカードがめくられたら、コミュニティカードの配布を開始
    setTimeout(() => {
      setCommunityCardStates([
        { isFlipped: true },
        { isFlipped: true },
        { isFlipped: true },
      ]);
      setPhase('turn');
    }, 500);

    setTimeout(() => {
      setCommunityCardStates(prev => [
        ...prev,
        { isFlipped: true },
      ]);
      setPhase('river');
    }, 1000);

    setTimeout(() => {
      setCommunityCardStates(prev => [
        ...prev,
        { isFlipped: true },
      ]);
      setPhase('reveal');
      setShowResult(true);
    }, 1500);
  };

  useEffect(() => {
    setHoleCardStates([
      { isFlipped: false },
      { isFlipped: false },
    ]);
  }, []);

  return (
    <div 
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-900 overflow-hidden"
      style={{ touchAction: 'none' }}
      onTouchStart={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 md:space-y-8 w-full max-w-full px-2 sm:px-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 sm:mb-4">ポーカーテーブル</h2>

        {/* コミュニティカード - 少し小さく奥に表示 */}
        <div className="flex flex-col items-center w-full relative z-0 opacity-90">
          <div className="text-white mb-1 sm:mb-2 text-xs sm:text-sm">コミュニティカード</div>
          <div className="flex gap-1 sm:gap-2 justify-center flex-wrap max-w-full">
            {pokerHand.communityCards.map((card, index) => (
              <PokerCard
                key={index}
                isFlipped={communityCardStates[index]?.isFlipped || false}
                cardValue={communityCardStates[index]?.isFlipped ? {
                  suit: card.suit,
                  rank: card.rank,
                } : undefined}
                size="normal"
              />
            ))}
          </div>
        </div>

        {/* ホールカード - 大きく手前に表示 */}
        <div className="flex flex-col items-center w-full relative z-20">
          <div className="text-white mb-2 sm:mb-3 text-sm sm:text-base font-semibold">
            あなたの手札
            {!holeCardsFlipped && (
              <span className="block text-xs text-yellow-300 mt-1">タップしてめくる</span>
            )}
          </div>
          <div 
            className="flex gap-2 sm:gap-3 justify-center cursor-pointer"
            onClick={flipHoleCards}
            style={{ touchAction: 'manipulation' }}
          >
            {pokerHand.holeCards.map((card, index) => (
              <PokerCard
                key={index}
                isFlipped={holeCardStates[index]?.isFlipped || false}
                cardValue={holeCardStates[index]?.isFlipped ? {
                  suit: card.suit,
                  rank: card.rank,
                } : undefined}
                size="large"
              />
            ))}
          </div>
        </div>

        {/* 役の表示 */}
        {showResult && (
          <div className="mt-2 sm:mt-4 text-center px-2">
            <div className="text-sm sm:text-base md:text-lg text-yellow-300 mb-1 sm:mb-2">
              役: {pokerHand.handName}
            </div>
          </div>
        )}

        {/* 結果表示 */}
        {showResult && (
          <div className="mt-2 sm:mt-4 text-center px-2">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-300 mb-1 sm:mb-2 animate-pulse">
              ★ 獲得！ ★
            </div>
            <div className="text-base sm:text-lg md:text-xl text-white mb-1">
              {finalResult.name}
            </div>
            <div className={`text-xs sm:text-sm ${
              finalResult.rarity === 'epic' ? 'text-purple-300' :
              finalResult.rarity === 'rare' ? 'text-blue-300' :
              'text-gray-300'
            }`}>
              {finalResult.rarity === 'epic' ? 'エピック' :
               finalResult.rarity === 'rare' ? 'レア' : 'コモン'}
            </div>
          </div>
        )}

        {/* 閉じるボタン */}
        {showResult && (
          <div className="mt-4 sm:mt-6">
            <button
              onClick={onAnimationEnd}
              className="px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base font-bold text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors shadow-lg"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


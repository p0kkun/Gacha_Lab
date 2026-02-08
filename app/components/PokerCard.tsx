'use client';

import { CardBackIcon, SuitIcon } from '@/components/icons/AppIcons';

type CardProps = {
  isFlipped: boolean;
  cardValue?: {
    suit: 'spade' | 'heart' | 'diamond' | 'club';
    rank: string;
    name?: string;
    rarity?: 'common' | 'rare' | 'epic';
  };
  size?: 'normal' | 'large';
};

export default function PokerCard({ isFlipped, cardValue, size = 'normal' }: CardProps) {
  type Suit = NonNullable<CardProps['cardValue']>['suit'];

  const getSuitColor = (suit?: string) => {
    return suit === 'heart' || suit === 'diamond' ? 'text-red-600' : 'text-black';
  };

  const renderSuit = (suit: Suit, className: string) => {
    if (!suit) return null;
    return <SuitIcon suit={suit as 'spade' | 'heart' | 'diamond' | 'club'} className={className} />;
  };

  const cardSize = size === 'large' 
    ? { width: 'clamp(100px, 25vw, 180px)', height: 'clamp(140px, 35vw, 252px)' }
    : { width: 'clamp(65px, 16vw, 110px)', height: 'clamp(91px, 22.4vw, 154px)' };

  return (
    <div
      className={`relative flex-shrink-0 ${size === 'large' ? 'z-10' : ''}`}
      style={{
        ...cardSize,
        perspective: '1000px',
      }}
    >
      <div
        className="relative w-full h-full transition-transform duration-300"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* カードの裏面 - リアルなトランプバック */}
        <div
          className="absolute inset-0 w-full h-full rounded-lg border border-gray-300 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 shadow-lg"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
          }}
        >
          {/* パターン装飾 */}
          <div className="absolute inset-0 rounded-lg overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
            }}></div>
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
            }}></div>
          </div>
          {/* 中央のシンボル */}
          <div className="absolute inset-0 flex items-center justify-center">
            <CardBackIcon className="h-12 w-12 text-white opacity-30 sm:h-14 sm:w-14 md:h-16 md:w-16" />
          </div>
        </div>

        {/* カードの表面 - リアルなトランプカード */}
        {cardValue && (
          <div
            className={`absolute inset-0 w-full h-full rounded-lg border border-gray-800 bg-white transition-all duration-300 ${
              size === 'large' ? 'shadow-2xl' : 'shadow-xl'
            }`}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            {cardValue.name && cardValue.rarity ? (
              <div className={`flex h-full flex-col items-center justify-center text-center p-2 ${
                cardValue.rarity === 'epic' ? 'bg-purple-50' :
                cardValue.rarity === 'rare' ? 'bg-blue-50' :
                'bg-gray-50'
              }`}>
                <div className="text-[10px] sm:text-xs font-bold mb-0.5 sm:mb-1 break-words">{cardValue.name}</div>
                <div className="text-[8px] sm:text-[10px] text-gray-600">
                  {cardValue.rarity === 'epic' ? 'エピック' :
                   cardValue.rarity === 'rare' ? 'レア' : 'コモン'}
                </div>
              </div>
            ) : (
              <div className="relative h-full w-full p-1 sm:p-1.5">
                {/* 左上のランクとスーツ */}
                <div className={`absolute top-0 left-0 flex flex-col items-start ${getSuitColor(cardValue.suit)}`}>
                  <div className={`text-base sm:text-lg md:text-xl font-bold leading-tight ${size === 'large' ? 'text-xl sm:text-2xl md:text-3xl' : ''}`}>
                    {cardValue.rank}
                  </div>
                  <div className={`text-lg sm:text-xl md:text-2xl leading-none ${size === 'large' ? 'text-2xl sm:text-3xl md:text-4xl' : ''}`}>
                    {renderSuit(cardValue.suit, 'h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7')}
                  </div>
                </div>

                {/* 右下のランクとスーツ（上下反転） */}
                <div className={`absolute bottom-0 right-0 flex flex-col items-end ${getSuitColor(cardValue.suit)}`} style={{ transform: 'rotate(180deg)' }}>
                  <div className={`text-base sm:text-lg md:text-xl font-bold leading-tight ${size === 'large' ? 'text-xl sm:text-2xl md:text-3xl' : ''}`}>
                    {cardValue.rank}
                  </div>
                  <div className={`text-lg sm:text-xl md:text-2xl leading-none ${size === 'large' ? 'text-2xl sm:text-3xl md:text-4xl' : ''}`}>
                    {renderSuit(cardValue.suit, 'h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7')}
                  </div>
                </div>

                {/* 中央の大きなスーツシンボル */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`${getSuitColor(cardValue.suit)} ${size === 'large' ? 'opacity-80' : 'opacity-80'}`}>
                    {renderSuit(
                      cardValue.suit,
                      size === 'large'
                        ? 'h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16'
                        : 'h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11'
                    )}
                  </div>
                </div>

                {/* 細かい装飾線 */}
                <div className="absolute inset-x-0 top-1/2 border-t border-gray-200 opacity-30" style={{ transform: 'translateY(-50%)' }}></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

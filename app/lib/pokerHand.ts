export type Suit = 'spade' | 'heart' | 'diamond' | 'club';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

export type Card = {
  suit: Suit;
  rank: Rank;
};

export type HandRank =
  | 'royal_flush'
  | 'straight_flush'
  | 'four_of_a_kind'
  | 'full_house'
  | 'flush'
  | 'straight'
  | 'three_of_a_kind'
  | 'two_pair'
  | 'one_pair'
  | 'high_card';

const rankToNumber = (rank: Rank): number => {
  const rankMap: Record<Rank, number> = {
    'A': 14,
    'K': 13,
    'Q': 12,
    'J': 11,
    '10': 10,
    '9': 9,
    '8': 8,
    '7': 7,
    '6': 6,
    '5': 5,
    '4': 4,
    '3': 3,
    '2': 2,
  };
  return rankMap[rank];
};

function getCombinations<T>(arr: T[], n: number): T[][] {
  if (n === 0) return [[]];
  if (n > arr.length) return [];
  if (n === arr.length) return [arr];
  if (n === 1) return arr.map(item => [item]);

  const combinations: T[][] = [];
  for (let i = 0; i <= arr.length - n; i++) {
    const head = arr[i];
    const tailCombinations = getCombinations(arr.slice(i + 1), n - 1);
    for (const tail of tailCombinations) {
      combinations.push([head, ...tail]);
    }
  }
  return combinations;
}

function countOccurrences<T>(arr: T[]): Record<string, number> {
  return arr.reduce((acc, curr) => {
    acc[curr as any] = (acc[curr as any] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function isConsecutive(ranks: number[]): boolean {
  const uniqueSortedRanks = Array.from(new Set(ranks)).sort((a, b) => a - b);
  if (uniqueSortedRanks.length < 5) return false;

  let isNormalStraight = true;
  for (let i = 1; i < uniqueSortedRanks.length; i++) {
    if (uniqueSortedRanks[i] !== uniqueSortedRanks[i - 1] + 1) {
      isNormalStraight = false;
      break;
    }
  }

  if (isNormalStraight) return true;

  if (uniqueSortedRanks.includes(2) && uniqueSortedRanks.includes(3) && 
      uniqueSortedRanks.includes(4) && uniqueSortedRanks.includes(5) && 
      uniqueSortedRanks.includes(14)) {
    return true;
  }

  return false;
}

function evaluateFiveCards(cards: Card[]): HandRank {
  const suits = cards.map(c => c.suit);
  const ranks = cards.map(c => rankToNumber(c.rank)).sort((a, b) => b - a);

  const suitCounts = countOccurrences(suits);
  const rankCounts = countOccurrences(ranks);

  const isFlush = Object.values(suitCounts).some(count => count === 5);
  const isStraight = isConsecutive(ranks);

  if (isFlush && isStraight && ranks[0] === 14 && ranks[1] === 13 && 
      ranks[2] === 12 && ranks[3] === 11 && ranks[4] === 10) {
    return 'royal_flush';
  }

  if (isFlush && isStraight) {
    return 'straight_flush';
  }

  if (Object.values(rankCounts).some(count => count === 4)) {
    return 'four_of_a_kind';
  }

  const hasThree = Object.values(rankCounts).some(count => count === 3);
  const hasPair = Object.values(rankCounts).filter(count => count === 2).length >= 1;
  if (hasThree && hasPair) {
    return 'full_house';
  }

  if (isFlush) {
    return 'flush';
  }

  if (isStraight) {
    return 'straight';
  }

  if (hasThree) {
    return 'three_of_a_kind';
  }

  const pairCount = Object.values(rankCounts).filter(count => count === 2).length;
  if (pairCount === 2) {
    return 'two_pair';
  }

  if (pairCount === 1) {
    return 'one_pair';
  }

  return 'high_card';
}

function compareHands(hand1: HandRank, hand2: HandRank): number {
  const handRank: Record<HandRank, number> = {
    'royal_flush': 10,
    'straight_flush': 9,
    'four_of_a_kind': 8,
    'full_house': 7,
    'flush': 6,
    'straight': 5,
    'three_of_a_kind': 4,
    'two_pair': 3,
    'one_pair': 2,
    'high_card': 1,
  };
  return handRank[hand1] - handRank[hand2];
}

export function evaluateHand(cards: Card[]): HandRank {
  if (cards.length < 5) {
    return 'high_card';
  }

  const combinations = getCombinations(cards, 5);
  let bestHand: HandRank = 'high_card';

  for (const combo of combinations) {
    const hand = evaluateFiveCards(combo);
    if (compareHands(hand, bestHand) > 0) {
      bestHand = hand;
    }
  }

  return bestHand;
}

export function getBestHandCards(cards: Card[]): Card[] {
  if (cards.length < 5) {
    return [];
  }

  const combinations = getCombinations(cards, 5);
  let bestHand: HandRank = 'high_card';
  let bestCombo: Card[] = [];

  for (const combo of combinations) {
    const hand = evaluateFiveCards(combo);
    if (compareHands(hand, bestHand) > 0) {
      bestHand = hand;
      bestCombo = combo;
    }
  }
  return bestCombo;
}

export function getRarityFromHand(hand: HandRank): 'common' | 'rare' | 'epic' {
  switch (hand) {
    case 'royal_flush':
    case 'straight_flush':
    case 'four_of_a_kind':
      return 'epic';
    case 'full_house':
    case 'flush':
    case 'straight':
    case 'three_of_a_kind':
      return 'rare';
    case 'two_pair':
    case 'one_pair':
    case 'high_card':
    default:
      return 'common';
  }
}

export function getHandName(hand: HandRank): string {
  const handNames: Record<HandRank, string> = {
    'royal_flush': 'ロイヤルフラッシュ',
    'straight_flush': 'ストレートフラッシュ',
    'four_of_a_kind': 'フォーカード',
    'full_house': 'フルハウス',
    'flush': 'フラッシュ',
    'straight': 'ストレート',
    'three_of_a_kind': 'スリーカード',
    'two_pair': 'ツーペア',
    'one_pair': 'ワンペア',
    'high_card': 'ハイカード',
  };
  return handNames[hand];
}

export function generateRandomCard(): Card {
  const suits: Suit[] = ['spade', 'heart', 'diamond', 'club'];
  const ranks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  const randomSuit = suits[Math.floor(Math.random() * suits.length)];
  const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
  return { suit: randomSuit, rank: randomRank };
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateRandomCard, evaluateHand, getHandName, type Card, type HandRank as PokerHandRank } from '@/lib/pokerHand';
import { Rarity, HandRank } from '@prisma/client';

/**
 * ポーカーのHandRank（小文字）をPrismaのHandRank（大文字）に変換
 */
function convertHandRankToPrisma(handRank: PokerHandRank): HandRank {
  const mapping: Record<PokerHandRank, HandRank> = {
    'royal_flush': HandRank.ROYAL_FLUSH,
    'straight_flush': HandRank.STRAIGHT_FLUSH,
    'four_of_a_kind': HandRank.FOUR_OF_A_KIND,
    'full_house': HandRank.FULL_HOUSE,
    'flush': HandRank.FLUSH,
    'straight': HandRank.STRAIGHT,
    'three_of_a_kind': HandRank.THREE_OF_A_KIND,
    'two_pair': HandRank.TWO_PAIR,
    'one_pair': HandRank.ONE_PAIR,
    'high_card': HandRank.HIGH_CARD,
  };
  return mapping[handRank];
}

/**
 * ポーカーの役からレアリティを取得（ガチャタイプの設定に基づく）
 */
function getRarityFromHandRank(
  handRank: HandRank,
  gachaType: {
    firstPrizeHands: HandRank[];
    secondPrizeHands: HandRank[];
    thirdPrizeHands: HandRank[];
    fourthPrizeHands: HandRank[];
    fifthPrizeHands: HandRank[];
  }
): Rarity {
  // ガチャタイプで設定された役とレアリティのマッピングを使用（複数の役に対応）
  if (gachaType.firstPrizeHands.includes(handRank)) return Rarity.FIRST_PRIZE;
  if (gachaType.secondPrizeHands.includes(handRank)) return Rarity.SECOND_PRIZE;
  if (gachaType.thirdPrizeHands.includes(handRank)) return Rarity.THIRD_PRIZE;
  if (gachaType.fourthPrizeHands.includes(handRank)) return Rarity.FOURTH_PRIZE;
  if (gachaType.fifthPrizeHands.includes(handRank)) return Rarity.FIFTH_PRIZE;

  // ハズレ: 上位の当たりに設定されていない役すべてが対象
  // すべての当たりに設定されている役を取得
  const assignedHands = new Set([
    ...gachaType.firstPrizeHands,
    ...gachaType.secondPrizeHands,
    ...gachaType.thirdPrizeHands,
    ...gachaType.fourthPrizeHands,
    ...gachaType.fifthPrizeHands,
  ]);

  // 設定されていない役はすべてハズレ
  if (!assignedHands.has(handRank)) {
    return Rarity.LOSER;
  }

  // デフォルトマッピング（設定されていない場合のフォールバック）
  switch (handRank) {
    case HandRank.ROYAL_FLUSH:
    case HandRank.STRAIGHT_FLUSH:
    case HandRank.FOUR_OF_A_KIND:
      return Rarity.FIRST_PRIZE;
    case HandRank.FULL_HOUSE:
    case HandRank.FLUSH:
      return Rarity.SECOND_PRIZE;
    case HandRank.STRAIGHT:
    case HandRank.THREE_OF_A_KIND:
      return Rarity.THIRD_PRIZE;
    case HandRank.TWO_PAIR:
      return Rarity.FOURTH_PRIZE;
    case HandRank.ONE_PAIR:
      return Rarity.FIFTH_PRIZE;
    case HandRank.HIGH_CARD:
    default:
      return Rarity.LOSER;
  }
}

/**
 * 確率に基づいてレアリティを抽選
 */
function drawRarityByWeights(weights: {
  firstPrizeWeight: number;
  secondPrizeWeight: number;
  thirdPrizeWeight: number;
  fourthPrizeWeight: number;
  fifthPrizeWeight: number;
  loserWeight: number;
}): Rarity {
  const totalWeight =
    weights.firstPrizeWeight +
    weights.secondPrizeWeight +
    weights.thirdPrizeWeight +
    weights.fourthPrizeWeight +
    weights.fifthPrizeWeight +
    weights.loserWeight;

  if (totalWeight === 0) {
    // 確率が設定されていない場合はハズレ
    return Rarity.LOSER;
  }

  const random = Math.random() * totalWeight;
  let current = 0;

  current += weights.firstPrizeWeight;
  if (random < current) return Rarity.FIRST_PRIZE;

  current += weights.secondPrizeWeight;
  if (random < current) return Rarity.SECOND_PRIZE;

  current += weights.thirdPrizeWeight;
  if (random < current) return Rarity.THIRD_PRIZE;

  current += weights.fourthPrizeWeight;
  if (random < current) return Rarity.FOURTH_PRIZE;

  current += weights.fifthPrizeWeight;
  if (random < current) return Rarity.FIFTH_PRIZE;

  return Rarity.LOSER;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, gachaTypeId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    if (!gachaTypeId) {
      return NextResponse.json(
        { error: 'ガチャタイプIDが必要です' },
        { status: 400 }
      );
    }

    // ガチャタイプの設定を取得
    const gachaType = await prisma.gachaType.findUnique({
      where: { id: gachaTypeId },
    });

    if (!gachaType || !gachaType.isActive) {
      return NextResponse.json(
        { error: 'ガチャタイプが見つからないか、無効です' },
        { status: 404 }
      );
    }

    let selectedRarity: Rarity;
    let pokerHand: {
      hand: PokerHandRank;
      handName: string;
      holeCards: Card[];
      communityCards: Card[];
      allCards: Card[];
    } | null = null;

    // 通常ガチャはポーカーハンドで判定
    if (gachaTypeId === 'normal') {
      // 7枚のカードを生成
      const allCards: Card[] = Array.from({ length: 7 }, () => generateRandomCard());
      const holeCards = allCards.slice(0, 2);
      const communityCards = allCards.slice(2, 7);

      // 役を判定
      const pokerHandRank = evaluateHand(allCards);
      const handName = getHandName(pokerHandRank);
      const handRank = convertHandRankToPrisma(pokerHandRank);

      // ガチャタイプの設定に基づいてレアリティを決定
      selectedRarity = getRarityFromHandRank(handRank, {
        firstPrizeHands: gachaType.firstPrizeHands || [],
        secondPrizeHands: gachaType.secondPrizeHands || [],
        thirdPrizeHands: gachaType.thirdPrizeHands || [],
        fourthPrizeHands: gachaType.fourthPrizeHands || [],
        fifthPrizeHands: gachaType.fifthPrizeHands || [],
      });

      pokerHand = {
        hand: pokerHandRank,
        handName: handName,
        holeCards: holeCards,
        communityCards: communityCards,
        allCards: allCards,
      };
    } else {
      // プレミアムガチャなどは確率ベースで抽選
      selectedRarity = drawRarityByWeights({
        firstPrizeWeight: gachaType.firstPrizeWeight,
        secondPrizeWeight: gachaType.secondPrizeWeight,
        thirdPrizeWeight: gachaType.thirdPrizeWeight,
        fourthPrizeWeight: gachaType.fourthPrizeWeight,
        fifthPrizeWeight: gachaType.fifthPrizeWeight,
        loserWeight: gachaType.loserWeight,
      });
    }

    // 選択されたレアリティのアイテムを取得
    // gachaTypeIdでフィルタリング（nullの場合は共通アイテム）
    const availableItems = await prisma.gachaItem.findMany({
      where: {
        rarity: selectedRarity,
        isActive: true,
        OR: [
          { gachaTypeId: gachaTypeId }, // このガチャタイプ専用
          { gachaTypeId: null }, // 共通アイテム
        ],
      },
    });

    if (availableItems.length === 0) {
      return NextResponse.json(
        { error: '該当するアイテムが見つかりません' },
        { status: 404 }
      );
    }

    // ランダムにアイテムを選択
    const selectedItem = availableItems[Math.floor(Math.random() * availableItems.length)];

    // ガチャ履歴を保存
    const gachaHistory = await prisma.gachaHistory.create({
      data: {
        userId: userId,
        gachaTypeId: gachaTypeId,
        itemId: selectedItem.id,
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: selectedItem.id,
        name: selectedItem.name,
        rarity: selectedItem.rarity,
        videoUrl: selectedItem.videoUrl,
      },
      timestamp: new Date().toISOString(),
      pokerHand: pokerHand,
      historyId: gachaHistory.id,
    });
  } catch (error) {
    console.error('ガチャエラー:', error);
    return NextResponse.json(
      { error: 'ガチャ抽選に失敗しました' },
      { status: 500 }
    );
  }
}


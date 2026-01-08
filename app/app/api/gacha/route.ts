import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateRandomCard,
  evaluateHand,
  getHandName,
  type Card,
  type HandRank as PokerHandRank,
} from "@/lib/pokerHand";
import { Rarity, HandRank, Prisma } from "@prisma/client";

// PointTransactionTypeの一時的な回避策（Prismaクライアントの型解決問題のため）
const PointTransactionType = {
  PURCHASE: "PURCHASE" as const,
  CONSUME: "CONSUME" as const,
  GRANT: "GRANT" as const,
  REFUND: "REFUND" as const,
} as const;
import { sendGachaResultMessage } from "@/lib/line-messaging";

function drawByWeights<T extends { weight: number }>(rows: T[]): T {
  const total = rows.reduce(
    (sum, r) => sum + (Number.isFinite(r.weight) ? r.weight : 0),
    0
  );
  if (total <= 0) return rows[Math.floor(Math.random() * rows.length)];
  const rnd = Math.random() * total;
  let acc = 0;
  for (const row of rows) {
    acc += row.weight;
    if (rnd < acc) return row;
  }
  return rows[rows.length - 1];
}

/**
 * ポーカーのHandRank（小文字）をPrismaのHandRank（大文字）に変換
 */
function convertHandRankToPrisma(handRank: PokerHandRank): HandRank {
  const mapping: Record<PokerHandRank, HandRank> = {
    royal_flush: HandRank.ROYAL_FLUSH,
    straight_flush: HandRank.STRAIGHT_FLUSH,
    four_of_a_kind: HandRank.FOUR_OF_A_KIND,
    full_house: HandRank.FULL_HOUSE,
    flush: HandRank.FLUSH,
    straight: HandRank.STRAIGHT,
    three_of_a_kind: HandRank.THREE_OF_A_KIND,
    two_pair: HandRank.TWO_PAIR,
    one_pair: HandRank.ONE_PAIR,
    high_card: HandRank.HIGH_CARD,
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
 * 動的等級設定に対応した重みベースの抽選（統一ロジック）
 * @param prizeWeights 等級ごとの重み（{"FIRST_PRIZE": 10, "SECOND_PRIZE": 20, ...}）
 * @param prizeOrder 等級の順序（["FIRST_PRIZE", "SECOND_PRIZE", ...]）
 * @returns 抽選されたレアリティ
 */
function drawRarityByDynamicWeights(
  prizeWeights: Record<string, number>,
  prizeOrder: string[]
): Rarity {
  // 順序に従って重みを合計
  const totalWeight = prizeOrder.reduce(
    (sum, rarity) => sum + (prizeWeights[rarity] || 0),
    0
  );

  if (totalWeight === 0) {
    // 確率が設定されていない場合は最後の等級（通常はLOSER）
    return (prizeOrder[prizeOrder.length - 1] as Rarity) || Rarity.LOSER;
  }

  const random = Math.random() * totalWeight;
  let current = 0;

  // 順序に従って抽選
  for (const rarity of prizeOrder) {
    current += prizeWeights[rarity] || 0;
    if (random < current) {
      return rarity as Rarity;
    }
  }

  // フォールバック（通常は到達しない）
  return (prizeOrder[prizeOrder.length - 1] as Rarity) || Rarity.LOSER;
}

/**
 * 確率に基づいてレアリティを抽選（既存の固定フィールド用、後方互換性）
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
        { error: "ユーザーIDが必要です" },
        { status: 400 }
      );
    }

    if (!gachaTypeId) {
      return NextResponse.json(
        { error: "ガチャタイプIDが必要です" },
        { status: 400 }
      );
    }

    // ガチャタイプの設定を取得
    const gachaType = await prisma.gachaType.findUnique({
      where: { id: gachaTypeId },
    });

    if (!gachaType || !gachaType.isActive) {
      return NextResponse.json(
        { error: "ガチャタイプが見つからないか、無効です" },
        { status: 404 }
      );
    }

    // 動画設定のバリデーション（個別設定の場合のみ）
    // デフォルト設定を使用する場合は、動画選択ロジック側で処理されるため、ここではバリデーションしない
    if (gachaType.useDefaultVideos === false) {
      const commonVideoIds = gachaType.commonVideoIds || [];
      const rarityVideoIds = gachaType.rarityVideoIds
        ? (typeof gachaType.rarityVideoIds === 'string'
            ? JSON.parse(gachaType.rarityVideoIds)
            : gachaType.rarityVideoIds)
        : {};

      // 共通動画が設定されていない場合
      if (commonVideoIds.length === 0) {
        return NextResponse.json(
          { error: "このガチャタイプには共通動画が設定されていません" },
          { status: 400 }
        );
      }

      // 各レアリティの動画が設定されているか確認（あたりの場合のみ）
      const requiredRarities = ['FIRST_PRIZE', 'SECOND_PRIZE', 'THIRD_PRIZE', 'FOURTH_PRIZE', 'FIFTH_PRIZE'];
      const missingRarities: string[] = [];
      for (const rarity of requiredRarities) {
        const rarityVideos = (rarityVideoIds as Record<string, number[]>)[rarity] || [];
        if (rarityVideos.length === 0) {
          missingRarities.push(rarity);
        }
      }

      if (missingRarities.length > 0) {
        return NextResponse.json(
          { error: `このガチャタイプには以下のレアリティの動画が設定されていません: ${missingRarities.join('、')}` },
          { status: 400 }
        );
      }
    }

    // 期間チェック
    const now = new Date();
    // 型アサーション: PrismaスキーマにはstartAt/endAt/pointCostが存在するが、型解決の問題で型エラーが出る場合がある
    const gachaTypeWithDates = gachaType as typeof gachaType & {
      startAt: Date | null;
      endAt: Date | null;
      pointCost: number;
    };

    if (gachaTypeWithDates.startAt && now < gachaTypeWithDates.startAt) {
      return NextResponse.json(
        { error: "このガチャはまだ開始されていません" },
        { status: 403 }
      );
    }
    if (gachaTypeWithDates.endAt && now > gachaTypeWithDates.endAt) {
      return NextResponse.json(
        { error: "このガチャは終了しました" },
        { status: 403 }
      );
    }

    // ポイントチェック
    const pointCost = gachaTypeWithDates.pointCost || 0;
    if (pointCost > 0) {
      const { getPointBalances } = await import('@/lib/point-management');
      const balances = await getPointBalances(userId);

      if (balances.total < pointCost) {
        return NextResponse.json(
          {
            error: `ポイントが不足しています。必要: ${pointCost}ポイント、所持: ${balances.total}ポイント（有償: ${balances.paid}、無償: ${balances.free}）`,
          },
          { status: 403 }
        );
      }
    }

    // 統一された重みベースの抽選ロジック（動的等級設定に対応）
    let selectedRarity: Rarity;
    
    // 動的等級設定がある場合はそれを使用、なければ既存のフィールドから生成
    const prizeWeights = gachaType.prizeWeights
      ? (typeof gachaType.prizeWeights === 'string'
          ? JSON.parse(gachaType.prizeWeights)
          : gachaType.prizeWeights)
      : null;
    
    const prizeOrder = gachaType.prizeOrder
      ? (typeof gachaType.prizeOrder === 'string'
          ? JSON.parse(gachaType.prizeOrder)
          : gachaType.prizeOrder)
      : null;
    
    if (prizeWeights && prizeOrder) {
      // 動的等級設定を使用
      selectedRarity = drawRarityByDynamicWeights(prizeWeights, prizeOrder);
    } else {
      // 既存のフィールドから重みを取得（後方互換性）
      selectedRarity = drawRarityByWeights({
        firstPrizeWeight: gachaType.firstPrizeWeight,
        secondPrizeWeight: gachaType.secondPrizeWeight,
        thirdPrizeWeight: gachaType.thirdPrizeWeight,
        fourthPrizeWeight: gachaType.fourthPrizeWeight,
        fifthPrizeWeight: gachaType.fifthPrizeWeight,
        loserWeight: gachaType.loserWeight,
      });
    }
    
    // ポーカーハンドは結果表示用のみ（抽選には影響しない）
    // 役が設定されている場合のみ生成
    let pokerHand: {
      hand: PokerHandRank;
      handName: string;
      holeCards: Card[];
      communityCards: Card[];
      allCards: Card[];
    } | null = null;
    
    // 役が設定されているか確認
    const prizeHands = gachaType.prizeHands
      ? (typeof gachaType.prizeHands === 'string'
          ? JSON.parse(gachaType.prizeHands)
          : gachaType.prizeHands)
      : null;
    
    // 既存のフィールドからも確認（後方互換性）
    const hasHandsConfigured = prizeHands
      ? Object.values(prizeHands).some((hands: any) => Array.isArray(hands) && hands.length > 0)
      : (gachaType.firstPrizeHands.length > 0 ||
         gachaType.secondPrizeHands.length > 0 ||
         gachaType.thirdPrizeHands.length > 0 ||
         gachaType.fourthPrizeHands.length > 0 ||
         gachaType.fifthPrizeHands.length > 0);
    
    // 役が設定されている場合のみポーカーハンドを生成
    if (hasHandsConfigured) {
      try {
        const allCards: Card[] = Array.from({ length: 7 }, () =>
          generateRandomCard()
        );
        const holeCards = allCards.slice(0, 2);
        const communityCards = allCards.slice(2, 7);
        const pokerHandRank = evaluateHand(allCards);
        const handName = getHandName(pokerHandRank);
        
        pokerHand = {
          hand: pokerHandRank,
          handName: handName,
          holeCards: holeCards,
          communityCards: communityCards,
          allCards: allCards,
        };
      } catch (error) {
        // ポーカーハンド生成に失敗しても抽選には影響しない
        console.error('ポーカーハンド生成エラー（結果表示用）:', error);
      }
    }

    // 選択された等級の景品を取得（ガチャタイプ別割当が最優先）
    const assignments = await prisma.gachaPrizeAssignment.findMany({
      where: {
        gachaTypeId,
        rarity: selectedRarity,
        isActive: true,
        item: { isActive: true },
      },
      include: { item: true },
    });

    // 1) 割当がある場合は、割当（weight）で抽選して景品を決定
    // 2) 割当がない場合は後方互換として旧ロジックにフォールバック（将来的に廃止予定）
    let selectedItem =
      assignments.length > 0
        ? drawByWeights(
            assignments.map((a) => ({
              ...a,
              weight: typeof a.weight === "number" && Number.isFinite(a.weight) ? a.weight : 1,
            }))
          ).item
        : null;

    if (!selectedItem) {
      // 旧: GachaItemに等級（rarity）を持たせていた方式
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
          {
            error:
              "該当する景品が見つかりません（管理画面で景品割当を設定してください）",
          },
          { status: 404 }
        );
      }

      selectedItem = availableItems[Math.floor(Math.random() * availableItems.length)];
    }

    // ポイント消費とガチャ履歴保存をトランザクションで実行
    const result = await prisma.$transaction(async (tx) => {
      // ガチャ履歴を保存（ポイント使用情報を含む）
      const gachaHistory = await tx.gachaHistory.create({
        data: {
          userId: userId,
          gachaTypeId: gachaTypeId,
          itemId: selectedItem.id,
          rarity: selectedRarity,
          pointsUsed: pointCost,
        } as Prisma.GachaHistoryUncheckedCreateInput,
      });

      // ポイント消費（無償ポイントから優先的に消費）
      let newBalance = 0;
      if (pointCost > 0) {
        const nowDate = new Date();
        const unifiedExpiresAt = new Date(nowDate);
        unifiedExpiresAt.setFullYear(unifiedExpiresAt.getFullYear() + 1);

        // 残高行を確実に作成
        const existing = await tx.userPointBalance.findUnique({ where: { userId } });
        if (!existing) {
          await tx.userPointBalance.create({
            data: { userId, paidAmount: 0, freeAmount: 0, expiresAt: null, lastUpdated: nowDate },
          });
        }

        // 期限切れなら同時に失効（lastUpdatedは上書きしない）
        const before = await tx.userPointBalance.findUnique({ where: { userId } });
        if (
          before &&
          (before.paidAmount + before.freeAmount) > 0 &&
          before.expiresAt &&
          before.expiresAt <= nowDate
        ) {
          await tx.userPointBalance.update({
            where: { userId },
            data: { paidAmount: 0, freeAmount: 0, expiresAt: null },
          });
        }

        const balance = await tx.userPointBalance.findUnique({ where: { userId } });
        const freeAmount = balance?.freeAmount ?? 0;
        const paidAmount = balance?.paidAmount ?? 0;

        // 無償ポイントから優先的に消費
        const consumeFromFree = Math.min(freeAmount, pointCost);
        const remaining = pointCost - consumeFromFree;
        const consumeFromPaid = remaining;

        const newFreeAmount = freeAmount - consumeFromFree;
        const newPaidAmount = paidAmount - consumeFromPaid;
        const totalBalances = newFreeAmount + newPaidAmount;

        await tx.userPointBalance.update({
          where: { userId },
          data: {
            freeAmount: newFreeAmount,
            paidAmount: newPaidAmount,
            expiresAt: totalBalances > 0 ? unifiedExpiresAt : null,
            lastUpdated: nowDate,
          },
        });

        // ポイント履歴を記録
        await tx.pointHistory.create({
          data: {
            userId,
            transactionType: PointTransactionType.CONSUME,
            amount: -pointCost,
            balanceAfter: totalBalances,
            description: `${gachaType.name}ガチャ実行`,
            gachaHistoryId: gachaHistory.id,
          },
        });

        newBalance = totalBalances;
      } else {
        // ポイント不要の場合は通常通り保存
        newBalance = 0;
      }

      return { gachaHistory, newBalance };
    });

    // 被紹介者の行動を更新（将来の追加報酬機能用）
    const { updateRefereeActivity } = await import('@/lib/referral-management');
    updateRefereeActivity(userId).catch((error) => {
      console.error('被紹介者行動更新エラー:', error);
    });

    // 動画URLを取得（新しい動画システム、ガチャタイプの設定を使用）
    const { getGachaVideoUrls } = await import('@/lib/gacha-video');
    const videoUrls = await getGachaVideoUrls(gachaTypeId, selectedRarity);

    // ガチャ結果をLINEトークに送信（非同期、エラーが発生してもガチャ結果は返す）
    // 役が設定されている場合のみポーカーハンド情報を送信
    sendGachaResultMessage(
      userId,
      selectedItem.name,
      selectedRarity,
      gachaType.name,
      gachaType.resultMessageTemplate || null,
      pokerHand && pokerHand.handName
        ? {
            handName: pokerHand.handName,
            // 手札とコミュニティカードは送信しない（空配列として送信）
            holeCards: [],
            communityCards: [],
          }
        : undefined
    ).catch((error) => {
      // LINEメッセージ送信のエラーはログに記録するが、ガチャ結果には影響しない
      console.error("LINEメッセージ送信エラー（ガチャ結果は正常）:", error);
    });

    return NextResponse.json({
      success: true,
      item: {
        id: selectedItem.id,
        name: selectedItem.name,
        rarity: selectedRarity,
        videoUrl: selectedItem.videoUrl, // 後方互換性のため残す
      },
      videoUrls: videoUrls.length > 0 ? videoUrls : [selectedItem.videoUrl], // 新しい動画システム（フォールバック付き）
      timestamp: new Date().toISOString(),
      pokerHand: pokerHand,
      historyId: result.gachaHistory.id,
      pointsUsed: pointCost,
      pointsRemaining: result.newBalance,
    });
  } catch (error) {
    console.error("ガチャエラー:", error);
    return NextResponse.json(
      { error: "ガチャ抽選に失敗しました" },
      { status: 500 }
    );
  }
}

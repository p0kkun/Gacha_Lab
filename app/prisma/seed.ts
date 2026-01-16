// Prisma シードファイル
// 初期データを投入するためのスクリプト

import { PrismaClient, HandRank } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

// Load .env.local first, then .env
config({ path: ".env.local" });
config();

// Prisma 7の新しい方式でPrismaClientを初期化
// AWS RDSへの接続時は、SSL設定を明示的に指定
const databaseUrl = process.env.DATABASE_URL || '';
const isRds = databaseUrl.includes('rds.amazonaws.com');

// DATABASE_URLからSSLパラメータを削除（pgのSSL設定で上書きするため）
const cleanUrl = databaseUrl.replace(/[?&]sslmode=[^&]*/g, '');

const pool = databaseUrl
  ? new Pool({
      connectionString: cleanUrl,
      // AWS RDSへの接続時は、SSLを有効化し、証明書の検証を無効化
      ssl: isRds
        ? {
            rejectUnauthorized: false, // AWS RDSの自己署名証明書を許可
          }
        : false, // ローカル環境ではSSLを無効化
    })
  : undefined;

const adapter = pool ? new PrismaPg(pool) : undefined;

const prisma = new PrismaClient({
  ...(adapter && { adapter }),
});

async function main() {
  console.log("🌱 シードデータの投入を開始します...");

  // 0. 結果メッセージテンプレート（マスタ）
  console.log("📝 結果メッセージテンプレートを作成中...");
  // LINE Messaging APIのtextフィールドは最大120文字（改行を含む）のため、短縮版テンプレート
  const defaultTemplateText = `{rarityEmoji} {itemName}
レアリティ: {rarity}
{grantedPointsMessage}`;

  const defaultTemplate = await prisma.resultMessageTemplate.upsert({
    where: { code: "default" },
    update: {
      template: defaultTemplateText,
      description: "デフォルトテンプレート",
      isActive: true,
    },
    create: {
      code: "default",
      template: defaultTemplateText,
      description: "デフォルトテンプレート",
      isActive: true,
    },
  });

  // 0. 等級マスタ（運用で増減可能だが、初期値は従来の6等級を投入）
  console.log("🏷️ 等級マスタ（PrizeTier）を作成中...");
  const tierCount = await prisma.prizeTier.count();
  if (tierCount === 0) {
    await prisma.prizeTier.createMany({
      data: [
        { code: "FIRST_PRIZE", label: "1等", displayOrder: 10, isActive: true },
        { code: "SECOND_PRIZE", label: "2等", displayOrder: 20, isActive: true },
        { code: "THIRD_PRIZE", label: "3等", displayOrder: 30, isActive: true },
        { code: "FOURTH_PRIZE", label: "4等", displayOrder: 40, isActive: true },
        { code: "FIFTH_PRIZE", label: "5等", displayOrder: 50, isActive: true },
        { code: "LOSER", label: "ハズレ", displayOrder: 60, isActive: true },
      ],
      skipDuplicates: true,
    });
    console.log("✅ 等級マスタを作成しました（6件）");
  } else {
    console.log("ℹ️ 等級マスタは既に存在するためスキップします:", { tierCount });
  }

  // 0. ポイント購入プラン（購入画面の表示用）
  console.log("🧾 ポイント購入プランを作成中...");
  const planCount = await prisma.pointPurchasePlan.count();
  if (planCount === 0) {
    await prisma.pointPurchasePlan.createMany({
      data: [
        { id: "p100", points: 100, bonusFreePoints: 0, price: 100, label: "100ポイント", isActive: true, displayOrder: 0 },
        { id: "p500", points: 500, bonusFreePoints: 0, price: 500, label: "500ポイント", isActive: true, displayOrder: 1 },
        { id: "p1000", points: 1000, bonusFreePoints: 0, price: 1000, label: "1,000ポイント", isActive: true, displayOrder: 2 },
        { id: "p3000", points: 3000, bonusFreePoints: 0, price: 3000, label: "3,000ポイント", isActive: true, displayOrder: 3 },
        { id: "p5000", points: 5000, bonusFreePoints: 0, price: 5000, label: "5,000ポイント", isActive: true, displayOrder: 4 },
        { id: "p10000", points: 10000, bonusFreePoints: 0, price: 10000, label: "10,000ポイント", isActive: true, displayOrder: 5 },
      ],
      skipDuplicates: true,
    });
    console.log("✅ ポイント購入プランを作成しました（6件）");
  } else {
    console.log("ℹ️ ポイント購入プランは既に存在するためスキップします:", { planCount });
  }

  // 1. ガチャタイプの初期データ
  console.log("📦 ガチャタイプを作成中...");

  // NOTE: GachaTypeは id(Int) がPK、code(String) が外部参照キー
  const normal = await prisma.gachaType.upsert({
    where: { code: "normal" },
    update: {
      name: "通常ガチャ",
      description: "通常のガチャです",
      resultMessageTemplate: {
        connect: { id: defaultTemplate.id },
      },
      prizeWeights: {
        FIRST_PRIZE: 1,
        SECOND_PRIZE: 2,
        THIRD_PRIZE: 5,
        FOURTH_PRIZE: 10,
        FIFTH_PRIZE: 20,
        LOSER: 62,
      },
      prizeHands: {
        FIRST_PRIZE: [HandRank.ROYAL_FLUSH],
        SECOND_PRIZE: [HandRank.STRAIGHT_FLUSH],
        THIRD_PRIZE: [HandRank.FOUR_OF_A_KIND],
        FOURTH_PRIZE: [HandRank.FULL_HOUSE],
        FIFTH_PRIZE: [HandRank.FLUSH],
      },
      isActive: true,
      startAt: null,
      endAt: null,
      pointCost: 100,
    },
    create: {
      code: "normal",
      name: "通常ガチャ",
      description: "通常のガチャです",
      resultMessageTemplate: {
        connect: { id: defaultTemplate.id },
      },
      prizeWeights: {
        FIRST_PRIZE: 1,
        SECOND_PRIZE: 2,
        THIRD_PRIZE: 5,
        FOURTH_PRIZE: 10,
        FIFTH_PRIZE: 20,
        LOSER: 62,
      },
      prizeHands: {
        FIRST_PRIZE: [HandRank.ROYAL_FLUSH],
        SECOND_PRIZE: [HandRank.STRAIGHT_FLUSH],
        THIRD_PRIZE: [HandRank.FOUR_OF_A_KIND],
        FOURTH_PRIZE: [HandRank.FULL_HOUSE],
        FIFTH_PRIZE: [HandRank.FLUSH],
      },
      isActive: true,
      startAt: null,
      endAt: null,
      pointCost: 100,
    },
  });

  const premium = await prisma.gachaType.upsert({
    where: { code: "premium" },
    update: {
      name: "プレミアムガチャ",
      description: "プレミアムガチャです",
      resultMessageTemplate: {
        connect: { id: defaultTemplate.id },
      },
      prizeWeights: {
        FIRST_PRIZE: 3,
        SECOND_PRIZE: 5,
        THIRD_PRIZE: 10,
        FOURTH_PRIZE: 15,
        FIFTH_PRIZE: 25,
        LOSER: 42,
      },
      prizeHands: {
        FIRST_PRIZE: [HandRank.ROYAL_FLUSH],
        SECOND_PRIZE: [HandRank.STRAIGHT_FLUSH],
        THIRD_PRIZE: [HandRank.FOUR_OF_A_KIND],
        FOURTH_PRIZE: [HandRank.FULL_HOUSE],
        FIFTH_PRIZE: [HandRank.FLUSH],
      },
      isActive: true,
      startAt: null,
      endAt: null,
      pointCost: 300,
    },
    create: {
      code: "premium",
      name: "プレミアムガチャ",
      description: "プレミアムガチャです",
      resultMessageTemplate: {
        connect: { id: defaultTemplate.id },
      },
      prizeWeights: {
        FIRST_PRIZE: 3,
        SECOND_PRIZE: 5,
        THIRD_PRIZE: 10,
        FOURTH_PRIZE: 15,
        FIFTH_PRIZE: 25,
        LOSER: 42,
      },
      prizeHands: {
        FIRST_PRIZE: [HandRank.ROYAL_FLUSH],
        SECOND_PRIZE: [HandRank.STRAIGHT_FLUSH],
        THIRD_PRIZE: [HandRank.FOUR_OF_A_KIND],
        FOURTH_PRIZE: [HandRank.FULL_HOUSE],
        FIFTH_PRIZE: [HandRank.FLUSH],
      },
      isActive: true,
      startAt: null,
      endAt: null,
      pointCost: 300,
    },
  });

  console.log("✅ ガチャタイプの作成が完了しました");

  // 1.5 ガチャタイプ別の等級確率（テーブル化）
  // NOTE: 既存の firstPrizeWeight 等を後方互換として残しているが、抽選は基本こちらを使用する方針
  console.log("🎯 ガチャタイプ別の等級確率（GachaTierWeight）を作成中...");
  const tiers = await prisma.prizeTier.findMany({ select: { code: true } });
  const tierCodes = new Set(tiers.map((t) => t.code));
  const upsertTierWeights = async (
    gachaTypeId: number,
    weights: Record<string, number>
  ) => {
    for (const [tierCode, weight] of Object.entries(weights)) {
      if (!tierCodes.has(tierCode)) continue;
      await prisma.gachaTierWeight.upsert({
        where: { gachaTypeId_tierCode: { gachaTypeId, tierCode } },
        update: { weight, isActive: true },
        create: {
          gachaTypeId,
          tierCode,
          weight,
          displayOrder: 0,
          isActive: true,
        },
      });
    }
  };
  await upsertTierWeights(normal.id, {
    FIRST_PRIZE: 1,
    SECOND_PRIZE: 2,
    THIRD_PRIZE: 5,
    FOURTH_PRIZE: 10,
    FIFTH_PRIZE: 20,
    LOSER: 62,
  });
  await upsertTierWeights(premium.id, {
    FIRST_PRIZE: 3,
    SECOND_PRIZE: 5,
    THIRD_PRIZE: 10,
    FOURTH_PRIZE: 15,
    FIFTH_PRIZE: 25,
    LOSER: 42,
  });
  console.log("✅ ガチャタイプ別の等級確率を作成しました");

  // 2. ガチャアイテムの初期データ（サンプル）
  console.log("🎁 ガチャアイテムを作成中...");

  const items = [
    {
      name: "MAIN EVENT 無料 voucher",
      isActive: true,
      tierCode: "FIRST_PRIZE",
    },
    {
      name: "INVITATION 無料 voucher",
      isActive: true,
      tierCode: "SECOND_PRIZE",
    },
    {
      name: "5000円 OFF voucher",
      isActive: true,
      tierCode: "THIRD_PRIZE",
    },
    {
      name: "3000円 OFF voucher",
      isActive: true,
      tierCode: "FOURTH_PRIZE",
    },
    {
      name: "1000円 OFF voucher",
      isActive: true,
      tierCode: "FIFTH_PRIZE",
    },
    {
      name: "ハズレ",
      isActive: true,
      tierCode: "LOSER",
    },
  ];

  // ガチャアイテムの作成（既存データを保護）
  for (const item of items) {
    // 既存のアイテムを確認
    const existingItem = await prisma.gachaItem.findFirst({
      where: {
        name: item.name,
      },
    });

    if (existingItem) {
      // 既存データがある場合は更新（必要に応じて）
      await prisma.gachaItem.update({
        where: { id: existingItem.id },
        data: {
          isActive: item.isActive,
        },
      });
    } else {
      // 存在しない場合は作成
      const created = await prisma.gachaItem.create({
        data: {
          name: item.name,
          isActive: item.isActive,
        },
      });

      // 3. 景品割当（ガチャ別・等級別）
      // NOTE: 旧方式（GachaItem.rarity）を廃止したため、こちらが正
      for (const gachaTypeId of [normal.id, premium.id]) {
        await prisma.gachaPrizeAssignment.upsert({
          where: {
            gachaTypeId_tierCode_itemId: {
              gachaTypeId,
              tierCode: item.tierCode,
              itemId: created.id,
            },
          },
          update: { isActive: true, weight: 1 },
          create: {
            gachaTypeId,
            tierCode: item.tierCode,
            itemId: created.id,
            weight: 1,
            isActive: true,
          },
        });
      }
    }
  }

  console.log("✅ ガチャアイテムの作成が完了しました");

  // 無料ガチャ設定（デフォルトは無効、シングルトン）
  console.log("🎁 無料ガチャ設定を作成中...");
  const existingFreeGachaSettings = await prisma.freeGachaSettings.findFirst();
  if (!existingFreeGachaSettings) {
    await prisma.freeGachaSettings.create({
      data: {
        isActive: false,
        grantOnReferralComplete: false,
        referrerGachaTypeId: null,
        refereeGachaTypeId: null,
        expirationDays: null,
      },
    });
    console.log("✅ 無料ガチャ設定の作成が完了しました");
  } else {
    console.log("✅ 無料ガチャ設定は既に存在しています");
  }

  console.log("🎉 シードデータの投入が完了しました！");
}

main()
  .catch((e) => {
    console.error("❌ シードデータの投入中にエラーが発生しました:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

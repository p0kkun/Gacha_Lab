// Prisma シードファイル
// 初期データを投入するためのスクリプト

import { PrismaClient, Rarity, HandRank } from "@prisma/client";
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

  await prisma.gachaType.upsert({
    where: { id: "normal" },
    update: {
      // 既存データにもデフォルトの役を設定（配列形式）
      firstPrizeHands: [HandRank.ROYAL_FLUSH],
      secondPrizeHands: [HandRank.STRAIGHT_FLUSH],
      thirdPrizeHands: [HandRank.FOUR_OF_A_KIND],
      fourthPrizeHands: [HandRank.FULL_HOUSE],
      fifthPrizeHands: [HandRank.FLUSH],
      // 開始・終了日時をnullに設定（期間制限なし）
      startAt: null,
      endAt: null,
      // ポイントコストを設定（デフォルト: 100ポイント）
      pointCost: 100,
    },
    create: {
      id: "normal",
      name: "通常ガチャ",
      description: "通常のガチャです",
      firstPrizeWeight: 1, // 1%
      secondPrizeWeight: 2, // 2%
      thirdPrizeWeight: 5, // 5%
      fourthPrizeWeight: 10, // 10%
      fifthPrizeWeight: 20, // 20%
      loserWeight: 62, // 62%
      // デフォルトの役設定（配列形式）
      firstPrizeHands: [HandRank.ROYAL_FLUSH],      // 1等: ロイヤルフラッシュ（最強）
      secondPrizeHands: [HandRank.STRAIGHT_FLUSH],  // 2等: ストレートフラッシュ
      thirdPrizeHands: [HandRank.FOUR_OF_A_KIND],   // 3等: フォーカード
      fourthPrizeHands: [HandRank.FULL_HOUSE],      // 4等: フルハウス
      fifthPrizeHands: [HandRank.FLUSH],            // 5等: フラッシュ
      // ハズレは上位の当たりに設定されていない役すべてが対象
      isActive: true,
      // 開始・終了日時をnullに設定（期間制限なし）
      startAt: null,
      endAt: null,
      // ポイントコストを設定（デフォルト: 100ポイント）
      pointCost: 100,
    },
  });

  await prisma.gachaType.upsert({
    where: { id: "premium" },
    update: {
      // 既存データにもデフォルトの役を設定（配列形式）
      firstPrizeHands: [HandRank.ROYAL_FLUSH],
      secondPrizeHands: [HandRank.STRAIGHT_FLUSH],
      thirdPrizeHands: [HandRank.FOUR_OF_A_KIND],
      fourthPrizeHands: [HandRank.FULL_HOUSE],
      fifthPrizeHands: [HandRank.FLUSH],
      // 開始・終了日時をnullに設定（期間制限なし）
      startAt: null,
      endAt: null,
      // ポイントコストを設定（デフォルト: 300ポイント）
      pointCost: 300,
    },
    create: {
      id: "premium",
      name: "プレミアムガチャ",
      description: "プレミアムガチャです",
      firstPrizeWeight: 3, // 3%
      secondPrizeWeight: 5, // 5%
      thirdPrizeWeight: 10, // 10%
      fourthPrizeWeight: 15, // 15%
      fifthPrizeWeight: 25, // 25%
      loserWeight: 42, // 42%
      // デフォルトの役設定（配列形式）
      firstPrizeHands: [HandRank.ROYAL_FLUSH],      // 1等: ロイヤルフラッシュ（最強）
      secondPrizeHands: [HandRank.STRAIGHT_FLUSH],  // 2等: ストレートフラッシュ
      thirdPrizeHands: [HandRank.FOUR_OF_A_KIND],   // 3等: フォーカード
      fourthPrizeHands: [HandRank.FULL_HOUSE],      // 4等: フルハウス
      fifthPrizeHands: [HandRank.FLUSH],            // 5等: フラッシュ
      // ハズレは上位の当たりに設定されていない役すべてが対象
      isActive: true,
      // 開始・終了日時をnullに設定（期間制限なし）
      startAt: null,
      endAt: null,
      // ポイントコストを設定（デフォルト: 300ポイント）
      pointCost: 300,
    },
  });

  console.log("✅ ガチャタイプの作成が完了しました");

  // 2. ガチャアイテムの初期データ（サンプル）
  console.log("🎁 ガチャアイテムを作成中...");

  const items = [
    {
      name: "MAIN EVENT 無料 voucher",
      rarity: Rarity.FIRST_PRIZE,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
    {
      name: "INVITATION 無料 voucher",
      rarity: Rarity.SECOND_PRIZE,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
    {
      name: "5000円 OFF voucher",
      rarity: Rarity.THIRD_PRIZE,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
    {
      name: "3000円 OFF voucher",
      rarity: Rarity.FOURTH_PRIZE,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
    {
      name: "1000円 OFF voucher",
      rarity: Rarity.FIFTH_PRIZE,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
    {
      name: "ハズレ",
      rarity: Rarity.LOSER,
      videoUrl: "/videos/item1.mp4",
      isActive: true,
    },
  ];

  // ガチャアイテムの作成（既存データを保護）
  for (const item of items) {
    // 既存のアイテムを確認
    const existingItem = await prisma.gachaItem.findFirst({
      where: {
        name: item.name,
        rarity: item.rarity,
      },
    });

    if (existingItem) {
      // 既存データがある場合は更新（必要に応じて）
      await prisma.gachaItem.update({
        where: { id: existingItem.id },
        data: {
          videoUrl: item.videoUrl,
          isActive: item.isActive,
        },
      });
    } else {
      // 存在しない場合は作成
      await prisma.gachaItem.create({
        data: {
          name: item.name,
          rarity: item.rarity,
          videoUrl: item.videoUrl,
          isActive: item.isActive,
          gachaTypeId: null, // 共通アイテムとして設定
        },
      });
    }
  }

  console.log("✅ ガチャアイテムの作成が完了しました");
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

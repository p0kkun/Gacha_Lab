// Prisma シードファイル
// 初期データを投入するためのスクリプト

import { PrismaClient, Rarity } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

// Load .env.local first, then .env
config({ path: ".env.local" });
config();

// Prisma 7の新しい方式でPrismaClientを初期化
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  : undefined;

const adapter = pool ? new PrismaPg(pool) : undefined;

const prisma = new PrismaClient({
  ...(adapter && { adapter }),
});

async function main() {
  console.log("🌱 シードデータの投入を開始します...");

  // 1. ガチャタイプの初期データ
  console.log("📦 ガチャタイプを作成中...");

  await prisma.gachaType.upsert({
    where: { id: "normal" },
    update: {},
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
      isActive: true,
    },
  });

  await prisma.gachaType.upsert({
    where: { id: "premium" },
    update: {},
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
      isActive: true,
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

  // 既存のアイテムを削除してから作成（開発環境用）
  await prisma.gachaItem.deleteMany({});

  for (const item of items) {
    await prisma.gachaItem.create({
      data: item,
    });
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

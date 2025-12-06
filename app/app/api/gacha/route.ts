import { NextRequest, NextResponse } from 'next/server';

// 仮のガチャアイテム（後でデータベースに移行）
// 現在はitem1.mp4のみ配置されているため、すべてのアイテムでitem1.mp4を使用
const gachaItems = [
  { id: 1, name: 'アイテム1', rarity: 'common', videoUrl: '/videos/item1.mp4' },
  { id: 2, name: 'アイテム2', rarity: 'common', videoUrl: '/videos/item1.mp4' },
  { id: 3, name: 'アイテム3', rarity: 'rare', videoUrl: '/videos/item1.mp4' },
  { id: 4, name: 'アイテム4', rarity: 'rare', videoUrl: '/videos/item1.mp4' },
  { id: 5, name: 'アイテム5', rarity: 'epic', videoUrl: '/videos/item1.mp4' },
];

// レアリティごとの重み
const rarityWeights = {
  common: 70,
  rare: 25,
  epic: 5,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, gachaType } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // ガチャタイプに応じて重みを変更（プレミアムガチャはレアが出やすい）
    let weights = { ...rarityWeights };
    if (gachaType === 'premium') {
      weights = {
        common: 50,
        rare: 35,
        epic: 15,
      };
    }

    // レアリティを抽選
    const random = Math.random() * 100;
    let selectedRarity: 'common' | 'rare' | 'epic' = 'common';
    
    if (random < weights.epic) {
      selectedRarity = 'epic';
    } else if (random < weights.epic + weights.rare) {
      selectedRarity = 'rare';
    }

    // 選択されたレアリティのアイテムからランダムに選択
    const itemsOfRarity = gachaItems.filter(item => item.rarity === selectedRarity);
    const selectedItem = itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];

    // ここでデータベースに抽選履歴を保存する処理を追加（後で実装）

    return NextResponse.json({
      success: true,
      item: selectedItem,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('ガチャエラー:', error);
    return NextResponse.json(
      { error: 'ガチャ抽選に失敗しました' },
      { status: 500 }
    );
  }
}


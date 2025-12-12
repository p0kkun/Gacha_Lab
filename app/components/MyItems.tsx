'use client';

import { useEffect, useState } from 'react';

type UserItem = {
  id: number;
  item: {
    id: number;
    name: string;
    rarity: string;
  };
  createdAt: string;
  usedAt: string | null;
};

type MyItemsProps = {
  userId: string;
};

export default function MyItems({ userId }: MyItemsProps) {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, [userId]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/items`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error('アイテム取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityLabel = (rarity: string): string => {
    const labels: Record<string, string> = {
      FIRST_PRIZE: '1等',
      SECOND_PRIZE: '2等',
      THIRD_PRIZE: '3等',
      FOURTH_PRIZE: '4等',
      FIFTH_PRIZE: '5等',
      LOSER: 'ハズレ',
    };
    return labels[rarity] || rarity;
  };

  const activeItems = items.filter((item) => !item.usedAt);
  const usedItems = items.filter((item) => item.usedAt);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md">
        {/* ヘッダー */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-800">マイアイテム</h1>
        </div>

        {/* アイテム一覧 */}
        {loading ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-center text-gray-500">読み込み中...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-center text-gray-500">アイテムがありません</div>
            <div className="mt-4 text-center">
              <a
                href="?action=gacha"
                className="inline-block rounded-md bg-blue-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-600"
              >
                ガチャを引く
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* 使用可能なアイテム */}
            {activeItems.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-gray-800">使用可能</h2>
                <div className="space-y-3">
                  {activeItems.map((userItem) => (
                    <div key={userItem.id} className="rounded-lg bg-white p-4 shadow">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          {getRarityLabel(userItem.item.rarity)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(userItem.createdAt).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                      <div className="font-semibold text-gray-800">
                        {userItem.item.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 使用済みアイテム */}
            {usedItems.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-3 text-lg font-semibold text-gray-800">使用済み</h2>
                <div className="space-y-3">
                  {usedItems.map((userItem) => (
                    <div
                      key={userItem.id}
                      className="rounded-lg bg-gray-100 p-4 opacity-60"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="inline-flex rounded-full bg-gray-300 px-2 py-1 text-xs font-medium text-gray-600">
                          {getRarityLabel(userItem.item.rarity)}
                        </span>
                        <span className="text-xs text-gray-500">
                          使用日: {new Date(userItem.usedAt!).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                      <div className="font-semibold text-gray-600">{userItem.item.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* メニューリンク */}
        <div className="mt-6 space-y-2 rounded-lg bg-white p-4 shadow">
          <a
            href="?action=gacha"
            className="block rounded-md bg-blue-500 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-600"
          >
            ガチャを引く
          </a>
          <a
            href="/points"
            className="block rounded-md bg-green-500 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-green-600"
          >
            ポイント購入
          </a>
        </div>
      </div>
    </div>
  );
}



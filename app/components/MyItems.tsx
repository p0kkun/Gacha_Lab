"use client";

import { useEffect, useState, useCallback } from "react";
import ItemDetail from "./ItemDetail";

type UserItem = {
  id: number;
  item: {
    id: number;
    name: string;
    description: string | null;
    rarity: string;
    usageType: string;
    imageUrl: string | null;
    useStartAt: string | null;
    useEndAt: string | null;
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
  const [selectedItem, setSelectedItem] = useState<UserItem | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/items`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error("アイテム取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const getRarityLabel = (rarity: string): string => {
    const labels: Record<string, string> = {
      FIRST_PRIZE: "1等",
      SECOND_PRIZE: "2等",
      THIRD_PRIZE: "3等",
      FOURTH_PRIZE: "4等",
      FIFTH_PRIZE: "5等",
      LOSER: "ハズレ",
    };
    return labels[rarity] || rarity;
  };

  // アイテムの状態を判定する関数
  const getItemStatus = (
    item: UserItem
  ): "available" | "used" | "expired" | "notStarted" => {
    if (item.usedAt) {
      return "used";
    }

    const now = new Date();
    const useStartAt = item.item.useStartAt
      ? new Date(item.item.useStartAt)
      : null;
    const useEndAt = item.item.useEndAt ? new Date(item.item.useEndAt) : null;

    if (useStartAt && now < useStartAt) {
      return "notStarted";
    }
    if (useEndAt && now > useEndAt) {
      return "expired";
    }

    return "available";
  };

  // アイテムを状態別に分類
  const availableItems = items.filter(
    (item) => getItemStatus(item) === "available"
  );
  const usedItems = items.filter((item) => getItemStatus(item) === "used");
  const expiredItems = items.filter(
    (item) => getItemStatus(item) === "expired"
  );
  const notStartedItems = items.filter(
    (item) => getItemStatus(item) === "notStarted"
  );

  // 表示するアイテムを決定（デフォルトは使用可能のみ）
  const displayItems = showAll ? items : availableItems;

  // 表示用にソート（使用可能 > 使用開始前 > 期限切れ > 使用済み の順）
  const sortedDisplayItems = [...displayItems].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      available: 0,
      notStarted: 1,
      expired: 2,
      used: 3,
    };
    const statusA = getItemStatus(a);
    const statusB = getItemStatus(b);
    return statusOrder[statusA] - statusOrder[statusB];
  });

  // アイテム詳細画面を表示中の場合
  if (selectedItem) {
    return (
      <ItemDetail
        userItem={selectedItem}
        userId={userId}
        onBack={() => {
          setSelectedItem(null);
          fetchItems(); // アイテム一覧を再取得
        }}
        onUse={() => {
          fetchItems(); // アイテム一覧を再取得
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md">
        {/* ヘッダー */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-800">マイアイテム</h1>
        </div>

        {/* フィルター切替ボタン */}
        {!loading && items.length > 0 && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowAll(!showAll)}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              {showAll ? "使用可能のみ表示" : "すべて表示"}
            </button>
          </div>
        )}

        {/* アイテム一覧 */}
        {loading ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-center text-gray-500">読み込み中...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-center text-gray-500">
              アイテムがありません
            </div>
            <div className="mt-4 text-center">
              <a
                href="?action=gacha"
                className="inline-block rounded-md bg-blue-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-600"
              >
                ガチャを引く
              </a>
            </div>
          </div>
        ) : sortedDisplayItems.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-center text-gray-500">
              表示するアイテムがありません
            </div>
          </div>
        ) : (
          <div className="mb-6">
            {!showAll && availableItems.length > 0 && (
              <h2 className="mb-3 text-lg font-semibold text-gray-800">
                使用可能
              </h2>
            )}
            {showAll && (
              <>
                {availableItems.length > 0 && (
                  <h2 className="mb-3 text-lg font-semibold text-gray-800">
                    使用可能 ({availableItems.length})
                  </h2>
                )}
                {notStartedItems.length > 0 && (
                  <h2 className="mb-3 mt-6 text-lg font-semibold text-gray-800">
                    使用開始前 ({notStartedItems.length})
                  </h2>
                )}
                {expiredItems.length > 0 && (
                  <h2 className="mb-3 mt-6 text-lg font-semibold text-gray-800">
                    使用期限切れ ({expiredItems.length})
                  </h2>
                )}
                {usedItems.length > 0 && (
                  <h2 className="mb-3 mt-6 text-lg font-semibold text-gray-800">
                    使用済み ({usedItems.length})
                  </h2>
                )}
              </>
            )}
            <div className="space-y-3">
              {sortedDisplayItems.map((userItem) => {
                const status = getItemStatus(userItem);
                const isDisabled = status !== "available";

                return (
                  <div
                    key={userItem.id}
                    className={`cursor-pointer rounded-lg p-4 shadow transition-shadow hover:shadow-md ${
                      isDisabled ? "bg-gray-100 opacity-60" : "bg-white"
                    }`}
                    onClick={() => setSelectedItem(userItem)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            status === "available"
                              ? "bg-blue-100 text-blue-800"
                              : status === "notStarted"
                              ? "bg-yellow-100 text-yellow-800"
                              : status === "expired"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-300 text-gray-600"
                          }`}
                        >
                          {getRarityLabel(userItem.item.rarity)}
                        </span>
                        {status === "notStarted" && (
                          <span className="inline-flex rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">
                            使用開始前
                          </span>
                        )}
                        {status === "expired" && (
                          <span className="inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                            期限切れ
                          </span>
                        )}
                        {status === "used" && (
                          <span className="inline-flex rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                            使用済み
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {status === "used"
                          ? `使用日: ${new Date(
                              userItem.usedAt!
                            ).toLocaleDateString("ja-JP")}`
                          : status === "expired" && userItem.item.useEndAt
                          ? `期限: ${new Date(
                              userItem.item.useEndAt
                            ).toLocaleDateString("ja-JP")}`
                          : status === "notStarted" && userItem.item.useStartAt
                          ? `開始: ${new Date(
                              userItem.item.useStartAt
                            ).toLocaleDateString("ja-JP")}`
                          : `獲得日: ${new Date(
                              userItem.createdAt
                            ).toLocaleDateString("ja-JP")}`}
                      </span>
                    </div>
                    <div
                      className={`font-semibold ${
                        isDisabled ? "text-gray-600" : "text-gray-800"
                      }`}
                    >
                      {userItem.item.name}
                    </div>
                    {status === "available" && userItem.item.useEndAt && (
                      <div className="mt-1 text-xs text-gray-500">
                        使用期限:{" "}
                        {new Date(userItem.item.useEndAt).toLocaleString(
                          "ja-JP",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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

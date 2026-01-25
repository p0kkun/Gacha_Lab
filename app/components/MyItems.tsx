"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ItemDetail from "./ItemDetail";
import BottomNavigation from "./BottomNavigation";

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

type PrizeTier = {
  code: string;
  label: string;
  displayOrder: number;
};

type MyItemsProps = {
  userId: string;
};

export default function MyItems({ userId }: MyItemsProps) {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<UserItem | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [prizeTiers, setPrizeTiers] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchPrizeTiers();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [userId, page]);

  // ページ表示時に未送信メッセージをチェックして送信
  useEffect(() => {
    const sendPendingMessages = async () => {
      try {
        // 未送信メッセージを取得
        const pendingRes = await fetch(
          `/api/messages/pending?userId=${userId}&type=1`
        );
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json();
          if (pendingData.count > 0 && pendingData.messages.length > 0) {
            // 未送信メッセージを一括送信
            const messageQueueIds = pendingData.messages.map(
              (msg: { id: number }) => msg.id
            );
            const sendRes = await fetch("/api/messages/send-batch", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messageQueueIds,
                userId,
              }),
            });

            if (sendRes.ok) {
              const sendData = await sendRes.json();
              console.log(
                `未送信メッセージ送信完了: ${sendData.succeeded}/${sendData.total}件成功`
              );
            }
          }
        }
      } catch (error) {
        console.error("未送信メッセージ送信エラー:", error);
      }
    };

    if (userId) {
      sendPendingMessages();
    }
  }, [userId]);

  const fetchPrizeTiers = useCallback(async () => {
    try {
      const res = await fetch('/api/prize-tiers');
      if (res.ok) {
        const data = await res.json();
        const tierMap: Record<string, string> = {};
        if (Array.isArray(data.tiers)) {
          data.tiers.forEach((tier: PrizeTier) => {
            tierMap[tier.code] = tier.label;
          });
        }
        setPrizeTiers(tierMap);
      }
    } catch (error) {
      console.error('等級マスタ取得エラー:', error);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/items?page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setItems(data.items);
        } else {
          setItems((prev) => [...prev, ...data.items]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
      }
    } catch (error) {
      console.error("アイテム取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

  const getRarityLabel = (rarity: string): string => {
    return prizeTiers[rarity] || rarity;
  };

  const getRarityColor = (rarity: string): string => {
    const colors: Record<string, string> = {
      'FIRST_PRIZE': 'from-yellow-500 to-yellow-600',
      'SECOND_PRIZE': 'from-purple-500 to-purple-600',
      'THIRD_PRIZE': 'from-blue-500 to-blue-600',
      'FOURTH_PRIZE': 'from-green-500 to-green-600',
      'FIFTH_PRIZE': 'from-gray-400 to-gray-500',
      'LOSER': 'from-gray-300 to-gray-400',
    };
    return colors[rarity] || 'from-gray-400 to-gray-500';
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

  const renderItemCard = (userItem: UserItem) => {
    const status = getItemStatus(userItem);
    const isDisabled = status !== "available";

    return (
      <div
        key={userItem.id}
        className={`group cursor-pointer rounded-xl border-2 ${
          isDisabled
            ? "border-gray-400/30 bg-white/60 opacity-70"
            : "border-yellow-400/30 bg-gradient-to-r from-white/95 to-white/90"
        } p-4 shadow-lg transition-all hover:border-yellow-400/60 hover:shadow-xl hover:shadow-yellow-500/20 active:scale-[0.98]`}
        onClick={() => setSelectedItem(userItem)}
      >
        <div className="flex items-center gap-3">
          {userItem.item.imageUrl ? (
            <img
              src={userItem.item.imageUrl}
              alt={userItem.item.name}
              className="h-16 w-16 flex-shrink-0 rounded-lg object-cover border-2 border-gray-200 shadow-sm"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) {
                  fallback.style.display = "flex";
                }
              }}
            />
          ) : null}
          <div
            className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${getRarityColor(userItem.item.rarity)} text-2xl shadow-sm ${userItem.item.imageUrl ? "hidden" : ""}`}
            style={{ color: "#4a3a2a" }}
          >
            🎁
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
                style={{
                  background: "linear-gradient(to right, #f5d48a, #e7c675)",
                  color: "#4a3a2a",
                  border: "1px solid #b89f7a",
                }}
              >
                {getRarityLabel(userItem.item.rarity)}
              </span>
              {status === "notStarted" && (
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                  使用開始前
                </span>
              )}
              {status === "expired" && (
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                  期限切れ
                </span>
              )}
              {status === "used" && (
                <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                  使用済み
                </span>
              )}
            </div>
            <div
              className={`mb-1 font-bold truncate ${
                isDisabled ? "text-gray-600" : "text-gray-800"
              }`}
            >
              {userItem.item.name}
            </div>
            <div className="text-xs text-gray-500">
              {status === "used"
                ? `使用日: ${new Date(userItem.usedAt!).toLocaleDateString(
                    "ja-JP"
                  )}`
                : status === "expired" && userItem.item.useEndAt
                ? `期限: ${new Date(
                    userItem.item.useEndAt
                  ).toLocaleDateString("ja-JP")}`
                : status === "notStarted" && userItem.item.useStartAt
                ? `開始: ${new Date(
                    userItem.item.useStartAt
                  ).toLocaleDateString("ja-JP")}`
                : `獲得日: ${new Date(userItem.createdAt).toLocaleDateString(
                    "ja-JP"
                  )}`}
            </div>
            {/* 使用期限の表示（使用可能な場合のみ） */}
            {status === "available" && (
              <div className="mt-1 text-xs text-gray-500">
                {userItem.item.useEndAt ? (
                  <>
                    使用期限:{" "}
                    {new Date(userItem.item.useEndAt).toLocaleString("ja-JP", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                ) : (
                  <span className="text-gray-400">期限なし</span>
                )}
              </div>
            )}
          </div>
          <div className="text-yellow-600 transition-transform group-hover:translate-x-1">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  // アイテム詳細画面を表示中の場合
  if (selectedItem) {
    return (
      <ItemDetail
        userItem={selectedItem}
        userId={userId}
        onBack={() => {
          setSelectedItem(null);
          setPage(1); // 1ページ目に戻す
          fetchItems(); // アイテム一覧を再取得
        }}
        onUse={() => {
          setPage(1); // 1ページ目に戻す
          fetchItems(); // アイテム一覧を再取得
        }}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#e9dacb' }}>
        <div className="mx-auto max-w-md">
          {/* ヒーローセクション */}
          <div className="relative overflow-hidden px-4 pt-8 pb-6">
            {/* 背景装飾 */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 text-6xl">🂡</div>
              <div className="absolute top-20 right-10 text-5xl">🂮</div>
              <div className="absolute bottom-10 left-20 text-4xl">🃏</div>
              <div className="absolute bottom-20 right-20 text-5xl">🃎</div>
            </div>
            
            <div className="relative z-10 text-center" style={{ color: '#4a3a2a' }}>
              <h1 className="mb-2 text-3xl font-bold drop-shadow-md">マイアイテム</h1>
              <p className="text-sm" style={{ color: '#6b5a4a' }}>獲得したアイテム一覧</p>
            </div>
          </div>

          <div className="px-4 py-4">
            {/* フィルター切替ボタン */}
            {!loading && items.length > 0 && (
              <div className="mb-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowAll(!showAll);
                    setPage(1); // フィルタ変更時は1ページ目に戻す
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-95"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.5)", color: "#5a4a3a" }}
                >
                  {showAll ? "使用可能のみ表示" : "すべて表示"}
                </button>
              </div>
            )}

            {/* アイテム一覧 */}
            {loading ? (
              <div className="rounded-xl backdrop-blur-sm p-8 text-center shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                <div style={{ color: '#5a4a3a' }}>読み込み中...</div>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl backdrop-blur-sm p-8 text-center shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                <div className="mb-4" style={{ color: '#4a3a2a' }}>アイテムがありません</div>
                <Link
                  href="/?action=home"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold shadow-lg transition-all hover:shadow-xl"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.7)", color: "#4a3a2a", border: "1px solid #b89f7a" }}
                >
                  <img
                    src="/icons/navigation/icon-gacha.svg"
                    alt="ガチャ"
                    className="h-5 w-5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span>ガチャを引く</span>
                </Link>
              </div>
            ) : availableItems.length === 0 && !showAll ? (
              <div className="rounded-xl backdrop-blur-sm p-8 text-center shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                <div style={{ color: '#5a4a3a' }}>表示するアイテムがありません</div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  {!showAll && (
                    <>
                      <h2 className="mb-3 text-lg font-bold drop-shadow-md" style={{ color: "#4a3a2a" }}>
                        使用可能
                      </h2>
                      <div className="space-y-3">
                        {availableItems.map(renderItemCard)}
                      </div>
                    </>
                  )}
                  {showAll && (
                    <>
                      {availableItems.length > 0 && (
                        <>
                          <h2 className="mb-3 text-lg font-bold drop-shadow-md" style={{ color: "#4a3a2a" }}>
                            使用可能 ({availableItems.length})
                          </h2>
                          <div className="space-y-3">
                            {availableItems.map(renderItemCard)}
                          </div>
                        </>
                      )}
                      {notStartedItems.length > 0 && (
                        <>
                          <h2 className="mb-3 mt-6 text-lg font-bold drop-shadow-md" style={{ color: "#4a3a2a" }}>
                            使用開始前 ({notStartedItems.length})
                          </h2>
                          <div className="space-y-3">
                            {notStartedItems.map(renderItemCard)}
                          </div>
                        </>
                      )}
                      {expiredItems.length > 0 && (
                        <>
                          <h2 className="mb-3 mt-6 text-lg font-bold drop-shadow-md" style={{ color: "#4a3a2a" }}>
                            使用期限切れ ({expiredItems.length})
                          </h2>
                          <div className="space-y-3">
                            {expiredItems.map(renderItemCard)}
                          </div>
                        </>
                      )}
                      {usedItems.length > 0 && (
                        <>
                          <h2 className="mb-3 mt-6 text-lg font-bold drop-shadow-md" style={{ color: "#4a3a2a" }}>
                            使用済み ({usedItems.length})
                          </h2>
                          <div className="space-y-3">
                            {usedItems.map(renderItemCard)}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* もっと見る */}
                {hasMore && (
                  <div className="text-center">
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={loading}
                      className="rounded-xl backdrop-blur-sm px-6 py-3 font-semibold transition-all active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', color: '#5a4a3a' }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                      }}
                    >
                      {loading ? '読み込み中...' : 'もっと見る'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <BottomNavigation currentPage="items" />
    </>
  );
}

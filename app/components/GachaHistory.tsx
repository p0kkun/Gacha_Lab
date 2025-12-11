'use client';

import { useEffect, useState } from 'react';

type GachaHistoryItem = {
  id: number;
  createdAt: string;
  gachaType: {
    id: string;
    name: string;
  };
  item: {
    id: number;
    name: string;
    rarity: string;
  };
};

type GachaHistoryProps = {
  userId: string;
};

export default function GachaHistory({ userId }: GachaHistoryProps) {
  const [histories, setHistories] = useState<GachaHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchHistories();
  }, [userId, page]);

  const fetchHistories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/gacha-histories?page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setHistories(data.histories);
        } else {
          setHistories((prev) => [...prev, ...data.histories]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
      }
    } catch (error) {
      console.error('履歴取得エラー:', error);
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md">
        {/* ヘッダー */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-800">ガチャ履歴</h1>
        </div>

        {/* 履歴一覧 */}
        {loading && histories.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-center text-gray-500">読み込み中...</div>
          </div>
        ) : histories.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-center text-gray-500">ガチャ履歴がありません</div>
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
            <div className="space-y-3">
              {histories.map((history) => (
                <div key={history.id} className="rounded-lg bg-white p-4 shadow">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {new Date(history.createdAt).toLocaleString('ja-JP')}
                    </span>
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                      {getRarityLabel(history.item.rarity)}
                    </span>
                  </div>
                  <div className="mb-1 font-semibold text-gray-800">
                    {history.item.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {history.gachaType.name}
                  </div>
                </div>
              ))}
            </div>

            {/* もっと見る */}
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                  className="rounded-md bg-gray-200 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-50"
                >
                  {loading ? '読み込み中...' : 'もっと見る'}
                </button>
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



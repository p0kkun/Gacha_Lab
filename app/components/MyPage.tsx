'use client';

import { useEffect, useState } from 'react';
import type { LiffProfile } from '@/lib/liff';

type MyPageProps = {
  profile: LiffProfile;
};

type UserStats = {
  totalGachaCount: number;
  rarityStats: Record<string, number>;
};

export default function MyPage({ profile }: MyPageProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, [profile.userId]);

  const fetchUserStats = async () => {
    try {
      const res = await fetch(`/api/users/${profile.userId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('統計情報取得エラー:', error);
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
          <h1 className="mb-4 text-2xl font-bold text-gray-800">マイページ</h1>
          <div className="flex items-center gap-4">
            {profile.pictureUrl && (
              <img
                src={profile.pictureUrl}
                alt={profile.displayName}
                className="h-16 w-16 rounded-full"
              />
            )}
            <div>
              <div className="text-lg font-semibold text-gray-800">
                {profile.displayName}
              </div>
              <div className="text-sm text-gray-500">ID: {profile.userId}</div>
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        {loading ? (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="text-center text-gray-500">読み込み中...</div>
          </div>
        ) : stats ? (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">統計情報</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">ガチャ実行回数</div>
                <div className="text-2xl font-bold text-gray-800">
                  {stats.totalGachaCount} 回
                </div>
              </div>
              {Object.keys(stats.rarityStats).length > 0 && (
                <div>
                  <div className="mb-2 text-sm text-gray-500">レアリティ別獲得数</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(stats.rarityStats).map(([rarity, count]) => (
                      <div key={rarity} className="rounded-md bg-gray-50 p-2">
                        <div className="text-xs text-gray-500">{getRarityLabel(rarity)}</div>
                        <div className="text-lg font-semibold">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="text-center text-gray-500">統計情報がありません</div>
          </div>
        )}

        {/* メニューリンク */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">メニュー</h2>
          <div className="space-y-2">
            <a
              href="?action=gacha"
              className="block rounded-md bg-blue-500 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-600"
            >
              ガチャを引く
            </a>
            <a
              href="?action=history"
              className="block rounded-md bg-gray-200 px-4 py-3 text-center font-semibold text-gray-700 transition-colors hover:bg-gray-300"
            >
              ガチャ履歴
            </a>
            <a
              href="?action=items"
              className="block rounded-md bg-gray-200 px-4 py-3 text-center font-semibold text-gray-700 transition-colors hover:bg-gray-300"
            >
              マイアイテム
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}



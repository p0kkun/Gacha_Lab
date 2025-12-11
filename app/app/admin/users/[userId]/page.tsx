'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdminAuthToken } from '@/lib/admin-auth';

type GachaHistory = {
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

type UserDetail = {
  userId: string;
  displayName: string | null;
  pictureUrl: string | null;
  createdAt: string;
  updatedAt: string;
  counts: {
    gachaHistories: number;
    referralHistoriesAsReferrer: number;
    referralHistoriesAsReferee: number;
    freeGachaHistories: number;
  };
  rarityStats: Record<string, number>;
};

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [gachaHistories, setGachaHistories] = useState<GachaHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDetail();
  }, [userId]);

  const fetchUserDetail = async () => {
    setLoading(true);
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'X-Admin-Auth': authToken || '',
        },
      });

      if (res.status === 401) {
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = '/admin';
        return;
      }

      if (!res.ok) {
        throw new Error('ユーザー詳細の取得に失敗しました');
      }

      const data = await res.json();
      setUser(data.user);
      setGachaHistories(data.gachaHistories);
    } catch (error) {
      console.error('ユーザー詳細取得エラー:', error);
      alert('ユーザー詳細の取得に失敗しました');
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            ユーザーが見つかりませんでした
          </div>
          <div className="mt-4">
            <Link href="/admin/users" className="text-blue-600 hover:underline">
              ← ユーザー一覧に戻る
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-4">
          <Link href="/admin/users" className="text-blue-600 hover:underline">
            ← ユーザー一覧に戻る
          </Link>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-gray-800">ユーザー詳細</h1>

        {/* ユーザー情報 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-4">
            {user.pictureUrl && (
              <img
                src={user.pictureUrl}
                alt={user.displayName || ''}
                className="h-16 w-16 rounded-full"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {user.displayName || '（表示名なし）'}
              </h2>
              <p className="text-sm text-gray-500">ID: {user.userId}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <div className="text-sm text-gray-500">ガチャ実行回数</div>
              <div className="text-lg font-semibold">{user.counts.gachaHistories}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">紹介した人数</div>
              <div className="text-lg font-semibold">
                {user.counts.referralHistoriesAsReferrer}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">紹介された回数</div>
              <div className="text-lg font-semibold">
                {user.counts.referralHistoriesAsReferee}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">無料ガチャ</div>
              <div className="text-lg font-semibold">{user.counts.freeGachaHistories}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-500">登録日時</div>
            <div className="text-gray-800">
              {new Date(user.createdAt).toLocaleString('ja-JP')}
            </div>
          </div>
        </div>

        {/* レアリティ別統計 */}
        {Object.keys(user.rarityStats).length > 0 && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">レアリティ別獲得数</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Object.entries(user.rarityStats).map(([rarity, count]) => (
                <div key={rarity} className="rounded-md bg-gray-50 p-3">
                  <div className="text-sm text-gray-500">{getRarityLabel(rarity)}</div>
                  <div className="text-lg font-semibold">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ガチャ履歴 */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">ガチャ履歴（最新50件）</h2>
          {gachaHistories.length === 0 ? (
            <div className="text-center text-gray-500">ガチャ履歴がありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      実行日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ガチャタイプ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      獲得アイテム
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      レアリティ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {gachaHistories.map((history) => (
                    <tr key={history.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {new Date(history.createdAt).toLocaleString('ja-JP')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {history.gachaType.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {history.item.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          {getRarityLabel(history.item.rarity)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}



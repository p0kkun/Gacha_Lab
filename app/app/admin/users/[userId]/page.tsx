'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import ConfirmModal from '@/components/admin/ConfirmModal';
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

type Tag = {
  id: number;
  name: string;
  description: string | null;
};

type UserTag = {
  id: number;
  tag: Tag;
  createdAt: string;
};

type PrizeTier = {
  code: string;
  label: string;
  displayOrder: number;
};

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [gachaHistories, setGachaHistories] = useState<GachaHistory[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTagModal, setShowTagModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTagConfirm, setDeleteTagConfirm] = useState<{
    isOpen: boolean;
    tagId: number | null;
  }>({ isOpen: false, tagId: null });
  const [prizeTiers, setPrizeTiers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPrizeTiers();
    fetchUserDetail();
    fetchUserTags();
    fetchAllTags();
  }, [userId]);

  const fetchPrizeTiers = async () => {
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/prize-tiers', {
        headers: {
          'X-Admin-Auth': authToken || '',
        },
      });
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
  };

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
      setError('ユーザー詳細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTags = async () => {
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/users/${userId}/tags`, {
        headers: {
          'X-Admin-Auth': authToken || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUserTags(data.userTags);
      }
    } catch (error) {
      console.error('ユーザータグ取得エラー:', error);
    }
  };

  const fetchAllTags = async () => {
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/tags', {
        headers: {
          'X-Admin-Auth': authToken || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setAllTags(data.tags);
      }
    } catch (error) {
      console.error('タグ一覧取得エラー:', error);
    }
  };

  const handleAddTag = async (tagId: number) => {
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/users/${userId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': authToken || '',
        },
        body: JSON.stringify({
          tagId,
          adminUserId: sessionStorage.getItem('admin_user_id') || null,
          adminName: sessionStorage.getItem('admin_name') || null,
        }),
      });

      if (res.status === 401) {
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = '/admin';
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || 'タグの付与に失敗しました');
        return;
      }

      await fetchUserTags();
      setShowTagModal(false);
    } catch (error) {
      console.error('タグ付与エラー:', error);
      setError('タグの付与に失敗しました');
    }
  };

  const handleRemoveTagClick = (tagId: number) => {
    setDeleteTagConfirm({ isOpen: true, tagId });
  };

  const handleRemoveTag = async () => {
    if (!deleteTagConfirm.tagId) return;

    const tagId = deleteTagConfirm.tagId;
    setDeleteTagConfirm({ isOpen: false, tagId: null });

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/users/${userId}/tags/${tagId}`, {
        method: 'DELETE',
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
        const errorData = await res.json();
        setError(errorData.error || 'タグの削除に失敗しました');
        return;
      }

      await fetchUserTags();
    } catch (error) {
      console.error('タグ削除エラー:', error);
      setError('タグの削除に失敗しました');
    }
  };

  const getRarityLabel = (rarity: string): string => {
    return prizeTiers[rarity] || rarity;
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

        {/* タグ */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">タグ</h2>
            <button
              onClick={() => setShowTagModal(true)}
              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              タグを追加
            </button>
          </div>
          {userTags.length === 0 ? (
            <div className="text-center text-gray-500">タグがありません</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {userTags.map((userTag) => (
                <span
                  key={userTag.id}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                >
                  {userTag.tag.name}
                  <button
                    onClick={() => handleRemoveTagClick(userTag.tag.id)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* タグ追加モーダル */}
        {showTagModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* オーバーレイ */}
            <div
              className="absolute inset-0 backdrop-blur-sm transition-opacity"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
              onClick={() => setShowTagModal(false)}
            />
            {/* モーダル */}
            <div 
              className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-800">タグを追加</h3>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {allTags
                  .filter((tag) => !userTags.some((ut) => ut.tag.id === tag.id))
                  .map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleAddTag(tag.id)}
                      className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="font-medium text-gray-900">{tag.name}</div>
                      {tag.description && (
                        <div className="text-sm text-gray-500">{tag.description}</div>
                      )}
                    </button>
                  ))}
                {allTags.filter((tag) => !userTags.some((ut) => ut.tag.id === tag.id))
                  .length === 0 && (
                  <div className="text-center text-gray-500">
                    追加できるタグがありません
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowTagModal(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

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
                          {getRarityLabel((history as any).tierCode || "UNKNOWN")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* タグ削除確認モーダル */}
        <ConfirmModal
          isOpen={deleteTagConfirm.isOpen}
          title="タグの削除"
          message="このタグをユーザーから削除しますか？"
          changes={
            (() => {
              const tag = allTags.find((t) => t.id === deleteTagConfirm.tagId);
              if (!tag) return [];
              return [
                {
                  label: "対象ユーザー",
                  from: "-",
                  to: user?.displayName
                    ? `${user.displayName}（${user.userId}）`
                    : user?.userId || userId,
                },
                { label: "対象タグ", from: "付与済み", to: `削除（${tag.name}）` },
              ];
            })()
          }
          confirmText="削除"
          cancelText="キャンセル"
          variant="danger"
          onConfirm={handleRemoveTag}
          onCancel={() => setDeleteTagConfirm({ isOpen: false, tagId: null })}
        />
      </div>
    </AdminLayout>
  );
}







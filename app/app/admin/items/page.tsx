'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdminAuthToken } from '@/lib/admin-auth';

type GachaItem = {
  id: number;
  name: string;
  rarity: string;
  videoUrl: string;
  gachaTypeId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type GachaType = {
  id: string;
  name: string;
};

const RARITY_OPTIONS = [
  { value: 'FIRST_PRIZE', label: '1等' },
  { value: 'SECOND_PRIZE', label: '2等' },
  { value: 'THIRD_PRIZE', label: '3等' },
  { value: 'FOURTH_PRIZE', label: '4等' },
  { value: 'FIFTH_PRIZE', label: '5等' },
  { value: 'LOSER', label: 'ハズレ' },
];

export default function ItemsPage() {
  const [items, setItems] = useState<GachaItem[]>([]);
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [gachaTypeFilter, setGachaTypeFilter] = useState<string>('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('true');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<Partial<GachaItem>>({
    name: '',
    rarity: 'FIRST_PRIZE',
    videoUrl: '',
    gachaTypeId: null,
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchGachaTypes();
    fetchItems();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [rarityFilter, gachaTypeFilter, isActiveFilter]);

  const fetchGachaTypes = async () => {
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/gacha-types', {
        headers: {
          'X-Admin-Auth': authToken || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setGachaTypes(data.gachaTypes || []);
      }
    } catch (error) {
      console.error('ガチャタイプ取得エラー:', error);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (rarityFilter) {
        params.append('rarity', rarityFilter);
      }
      if (gachaTypeFilter) {
        params.append('gachaTypeId', gachaTypeFilter);
      }
      if (isActiveFilter !== '') {
        params.append('isActive', isActiveFilter);
      }

      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/items?${params}`, {
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
        throw new Error('アイテム一覧の取得に失敗しました');
      }

      const data = await res.json();
      setItems(data.items);
    } catch (error) {
      console.error('アイテム取得エラー:', error);
      alert('アイテム一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.rarity) {
      setError('名前とレアリティは必須です');
      return;
    }

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': authToken || '',
        },
        body: JSON.stringify(formData),
      });

      if (res.status === 401) {
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = '/admin';
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '作成に失敗しました');
      }

      setSuccess('アイテムを作成しました');
      setShowCreateForm(false);
      setFormData({
        name: '',
        rarity: 'FIRST_PRIZE',
        videoUrl: '',
        gachaTypeId: null,
        isActive: true,
      });
      await fetchItems();
    } catch (error) {
      console.error('作成エラー:', error);
      setError(error instanceof Error ? error.message : '作成に失敗しました');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このアイテムを無効化しますか？')) {
      return;
    }

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/items/${id}`, {
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
        throw new Error('削除に失敗しました');
      }

      setSuccess('アイテムを無効化しました');
      await fetchItems();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const getRarityLabel = (rarity: string): string => {
    const option = RARITY_OPTIONS.find((opt) => opt.value === rarity);
    return option?.label || rarity;
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">アイテム設定</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            {showCreateForm ? 'キャンセル' : '新規作成'}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
            {success}
          </div>
        )}

        {/* フィルター */}
        <div className="mb-4 flex gap-4">
          <select
            value={gachaTypeFilter}
            onChange={(e) => setGachaTypeFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
          >
            <option value="">すべてのガチャタイプ</option>
            <option value="null">共通アイテム（ガチャタイプ未設定）</option>
            {gachaTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
          >
            <option value="">すべてのレアリティ</option>
            {RARITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={isActiveFilter}
            onChange={(e) => setIsActiveFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
          >
            <option value="">すべて</option>
            <option value="true">有効</option>
            <option value="false">無効</option>
          </select>
        </div>

        {/* 作成フォーム */}
        {showCreateForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">新規アイテム作成</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">名前</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ガチャタイプ</label>
                <select
                  value={formData.gachaTypeId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gachaTypeId: e.target.value || null,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                >
                  <option value="">共通アイテム（全ガチャタイプで使用可能）</option>
                  {gachaTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">レアリティ</label>
                <select
                  value={formData.rarity || 'FIRST_PRIZE'}
                  onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                >
                  {RARITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">動画URL</label>
                <input
                  type="text"
                  value={formData.videoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive ?? true}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">有効</span>
                </label>
              </div>
              <button
                onClick={handleCreate}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                作成
              </button>
            </div>
          </div>
        )}

        {/* アイテム一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500">
            アイテムがありません
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    名前
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    ガチャタイプ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    レアリティ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    作成日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.gachaTypeId ? (
                        <span className="inline-flex rounded-full bg-purple-200 px-2 py-1 text-xs font-semibold text-purple-900">
                          {gachaTypes.find((t) => t.id === item.gachaTypeId)?.name || item.gachaTypeId}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-900">
                          共通
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <span className="inline-flex rounded-full bg-blue-200 px-2 py-1 text-xs font-semibold text-blue-900">
                        {getRarityLabel(item.rarity)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          item.isActive
                            ? 'bg-green-200 text-green-900'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        {item.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {new Date(item.createdAt).toLocaleString('ja-JP')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-blue-600">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/items/${item.id}`}
                          className="hover:underline"
                        >
                          編集
                        </Link>
                        {item.isActive && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:underline"
                          >
                            無効化
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}



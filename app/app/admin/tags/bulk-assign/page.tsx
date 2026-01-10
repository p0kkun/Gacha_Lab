'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { getAdminAuthToken } from '@/lib/admin-auth';

type Tag = {
  id: number;
  name: string;
  description: string | null;
};

type GachaType = {
  id: number; // 内部ID（DB）
  code: string; // 外部参照用コード（例: "normal"）
  name: string;
};

type SearchConditions = {
  gachaTypeId?: string;
  minPurchaseAmount?: number;
  minReferralCount?: number;
  rarity?: string;
  hasUsedItem?: boolean;
  minGachaCount?: number;
};

export default function BulkAssignTagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [conditions, setConditions] = useState<SearchConditions>({});
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<{
    total: number;
    alreadyAssigned: number;
    newlyAssigned: number;
  } | null>(null);
  const [assignConfirm, setAssignConfirm] = useState(false);

  useEffect(() => {
    fetchTags();
    fetchGachaTypes();
  }, []);

  const fetchTags = async () => {
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/tags', {
        headers: {
          'X-Admin-Auth': authToken || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setTags(data.tags);
      }
    } catch (error) {
      console.error('タグ取得エラー:', error);
    }
  };

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

  const handlePreview = async () => {
    if (!hasAnyCondition()) {
      setError('少なくとも1つの条件を指定してください');
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewCount(null);

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/users/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': authToken || '',
        },
        body: JSON.stringify(conditions),
      });

      if (res.status === 401) {
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = '/admin';
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'プレビューに失敗しました');
      }

      const data = await res.json();
      setPreviewCount(data.count);
    } catch (error) {
      console.error('プレビューエラー:', error);
      setError(error instanceof Error ? error.message : 'プレビューに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTagId) {
      setError('タグを選択してください');
      return;
    }

    if (!hasAnyCondition()) {
      setError('少なくとも1つの条件を指定してください');
      return;
    }

    if (previewCount === null || previewCount === 0) {
      setError('対象ユーザー数を確認してください');
      return;
    }

    setAssignConfirm(true);
  };

  const handleAssignConfirm = async () => {
    setAssignConfirm(false);
    setAssigning(true);
    setError(null);
    setSuccess(null);
    setResult(null);

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/tags/bulk-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': authToken || '',
        },
        body: JSON.stringify({
          tagId: selectedTagId,
          conditions,
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
        throw new Error(errorData.error || 'タグの一括付与に失敗しました');
      }

      const data = await res.json();
      setResult(data);
      setSuccess('タグの一括付与が完了しました');
      setPreviewCount(null);
      setConditions({});
    } catch (error) {
      console.error('一括付与エラー:', error);
      setError(error instanceof Error ? error.message : 'タグの一括付与に失敗しました');
    } finally {
      setAssigning(false);
    }
  };

  const hasAnyCondition = () => {
    return (
      conditions.gachaTypeId ||
      conditions.minPurchaseAmount !== undefined ||
      conditions.minReferralCount !== undefined ||
      conditions.rarity ||
      conditions.hasUsedItem !== undefined ||
      conditions.minGachaCount !== undefined
    );
  };

  const rarityOptions = [
    { value: 'FIRST_PRIZE', label: '1等' },
    { value: 'SECOND_PRIZE', label: '2等' },
    { value: 'THIRD_PRIZE', label: '3等' },
    { value: 'FOURTH_PRIZE', label: '4等' },
    { value: 'FIFTH_PRIZE', label: '5等' },
    { value: 'LOSER', label: 'ハズレ' },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-4">
          <button
            onClick={() => router.push('/admin/tags')}
            className="text-blue-600 hover:underline"
          >
            ← タグ一覧に戻る
          </button>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-gray-800">タグ一括付与</h1>

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

        {result && (
          <div className="mb-4 rounded-md bg-blue-50 p-4">
            <h3 className="mb-2 font-semibold text-gray-800">付与結果</h3>
            <div className="space-y-1 text-sm">
              <div>対象ユーザー数: {result.total}人</div>
              <div className="text-gray-600">既に付与済み: {result.alreadyAssigned}人</div>
              <div className="text-green-600">新規付与: {result.newlyAssigned}人</div>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="space-y-6">
            {/* タグ選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                付与するタグ *
              </label>
              <select
                value={selectedTagId || ''}
                onChange={(e) => setSelectedTagId(parseInt(e.target.value) || null)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              >
                <option value="">タグを選択してください</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name} {tag.description && `(${tag.description})`}
                  </option>
                ))}
              </select>
            </div>

            {/* 条件設定 */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-800">条件設定</h2>
              <div className="space-y-4">
                {/* 特定ガチャタイプを引いたユーザー */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    特定ガチャタイプを引いたユーザー
                  </label>
                  <select
                    value={conditions.gachaTypeId || ''}
                    onChange={(e) =>
                      setConditions({
                        ...conditions,
                        gachaTypeId: e.target.value || undefined,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  >
                    <option value="">指定なし</option>
                    {gachaTypes.map((type) => (
                      <option key={type.id} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 最小課金額 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    最小課金額（ポイント）
                  </label>
                  <input
                    type="number"
                    value={conditions.minPurchaseAmount || ''}
                    onChange={(e) =>
                      setConditions({
                        ...conditions,
                        minPurchaseAmount: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    min="0"
                    placeholder="例: 1000"
                  />
                </div>

                {/* 最小紹介人数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    最小紹介人数
                  </label>
                  <input
                    type="number"
                    value={conditions.minReferralCount || ''}
                    onChange={(e) =>
                      setConditions({
                        ...conditions,
                        minReferralCount: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    min="0"
                    placeholder="例: 3"
                  />
                </div>

                {/* 特定レアリティで当選 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    特定レアリティで当選したユーザー
                  </label>
                  <select
                    value={conditions.rarity || ''}
                    onChange={(e) =>
                      setConditions({
                        ...conditions,
                        rarity: e.target.value || undefined,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  >
                    <option value="">指定なし</option>
                    {rarityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* アイテム使用済み */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={conditions.hasUsedItem === true}
                      onChange={(e) =>
                        setConditions({
                          ...conditions,
                          hasUsedItem: e.target.checked ? true : undefined,
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      アイテム使用済みのユーザー
                    </span>
                  </label>
                </div>

                {/* 最小ガチャ実行回数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    最小ガチャ実行回数
                  </label>
                  <input
                    type="number"
                    value={conditions.minGachaCount || ''}
                    onChange={(e) =>
                      setConditions({
                        ...conditions,
                        minGachaCount: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    min="0"
                    placeholder="例: 10"
                  />
                </div>
              </div>
            </div>

            {/* プレビュー */}
            {previewCount !== null && (
              <div className="rounded-md bg-blue-50 p-4">
                <div className="text-sm">
                  <span className="font-semibold">条件に合致するユーザー数:</span>{' '}
                  <span className="text-lg font-bold text-blue-600">{previewCount}人</span>
                </div>
              </div>
            )}

            {/* 操作ボタン */}
            <div className="flex gap-2">
              <button
                onClick={handlePreview}
                disabled={loading || !hasAnyCondition()}
                className="rounded-md bg-gray-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:bg-gray-300"
              >
                {loading ? '検索中...' : '対象ユーザー数を確認'}
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning || !selectedTagId || !hasAnyCondition() || previewCount === null}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300"
              >
                {assigning ? '付与中...' : 'タグを一括付与'}
              </button>
            </div>
          </div>
        </div>

        {/* 一括付与確認モーダル */}
        <ConfirmModal
          isOpen={assignConfirm}
          title="タグの一括付与"
          message={`条件に合致する${previewCount || 0}人のユーザーにタグを付与しますか？`}
          confirmText="付与"
          cancelText="キャンセル"
          variant="info"
          onConfirm={handleAssignConfirm}
          onCancel={() => setAssignConfirm(false)}
        />
      </div>
    </AdminLayout>
  );
}


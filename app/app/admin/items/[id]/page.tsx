'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdminAuthToken } from '@/lib/admin-auth';

type GachaItem = {
  id: number;
  name: string;
  rarity: string;
  videoUrl: string;
  imageUrl: string | null;
  usageType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    gachaHistories: number;
  };
};

const RARITY_OPTIONS = [
  { value: 'FIRST_PRIZE', label: '1等' },
  { value: 'SECOND_PRIZE', label: '2等' },
  { value: 'THIRD_PRIZE', label: '3等' },
  { value: 'FOURTH_PRIZE', label: '4等' },
  { value: 'FIFTH_PRIZE', label: '5等' },
  { value: 'LOSER', label: 'ハズレ' },
];

const USAGE_TYPE_OPTIONS = [
  { value: 'IMAGE', label: '画像' },
  { value: 'SHOW_TO_STAFF', label: '見せて使用' },
];

export default function ItemEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const [item, setItem] = useState<GachaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<GachaItem>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/items/${id}`, {
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
        throw new Error('アイテム詳細の取得に失敗しました');
      }

      const data = await res.json();
      setItem(data.item);
      setFormData(data.item);
    } catch (error) {
      console.error('アイテム取得エラー:', error);
      setError('アイテム詳細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.rarity) {
      setError('名前とレアリティは必須です');
      return;
    }

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/items/${id}`, {
        method: 'PUT',
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
        throw new Error(errorData.error || '保存に失敗しました');
      }

      setSuccess('保存しました');
      await fetchItem();
    } catch (error) {
      console.error('保存エラー:', error);
      setError(error instanceof Error ? error.message : '保存に失敗しました');
    }
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

  if (!item) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            アイテムが見つかりませんでした
          </div>
          <div className="mt-4">
            <button
              onClick={() => router.push('/admin/items')}
              className="text-blue-600 hover:underline"
            >
              ← アイテム一覧に戻る
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-4">
          <button
            onClick={() => router.push('/admin/items')}
            className="text-blue-600 hover:underline"
          >
            ← アイテム一覧に戻る
          </button>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-gray-800">アイテム編集</h1>

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

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ID</label>
              <div className="mt-1 text-gray-900">{item.id}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">名前</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">レアリティ</label>
              <select
                value={formData.rarity || 'FIRST_PRIZE'}
                onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">使用方法</label>
              <select
                value={formData.usageType || 'IMAGE'}
                onChange={(e) => setFormData({ ...formData, usageType: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              >
                {USAGE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {formData.usageType === 'IMAGE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  使用画像
                </label>
                <p className="mb-2 text-xs text-gray-500">
                  アイテム使用時に表示する画像をアップロードしてください
                </p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
                {formData.imageUrl && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-gray-600">現在の画像:</p>
                    <img
                      src={formData.imageUrl}
                      alt="アイテム画像"
                      className="h-32 w-32 rounded border border-gray-300 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: null })}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      画像を削除
                    </button>
                  </div>
                )}
                {imageFile && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!imageFile || !id) return;
                      try {
                        setUploadingImage(true);
                        const uploadFormData = new FormData();
                        uploadFormData.append('file', imageFile);
                        uploadFormData.append('itemId', id.toString());

                        const authToken = getAdminAuthToken();
                        const res = await fetch('/api/admin/items/upload-image', {
                          method: 'POST',
                          headers: {
                            'X-Admin-Auth': authToken || '',
                          },
                          body: uploadFormData,
                        });

                        if (!res.ok) {
                          const data = await res.json();
                          throw new Error(data.error || 'アップロードに失敗しました');
                        }

                        const data = await res.json();
                        setFormData({ ...formData, imageUrl: data.imageUrl });
                        setImageFile(null);
                        setSuccess('画像をアップロードしました');
                      } catch (error) {
                        console.error('画像アップロードエラー:', error);
                        setError(error instanceof Error ? error.message : '画像のアップロードに失敗しました');
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                    disabled={uploadingImage}
                    className="mt-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {uploadingImage ? 'アップロード中...' : '画像をアップロード'}
                  </button>
                )}
              </div>
            )}

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

            {item._count && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ガチャ実行回数
                </label>
                <div className="mt-1 text-gray-900">{item._count.gachaHistories} 回</div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                保存
              </button>
              <button
                onClick={() => router.push('/admin/items')}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}







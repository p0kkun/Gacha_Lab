'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { getAdminAuthToken } from '@/lib/admin-auth';
import { Rarity } from '@prisma/client';

type GachaVideo = {
  id: number;
  videoType: 'COMMON' | 'RARITY';
  rarity: string | null;
  s3Url: string;
  fileName: string;
  fileSize: number;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

const RARITY_LABELS: Record<string, string> = {
  FIRST_PRIZE: '1等',
  SECOND_PRIZE: '2等',
  THIRD_PRIZE: '3等',
  FOURTH_PRIZE: '4等',
  FIFTH_PRIZE: '5等',
  LOSER: 'ハズレ',
};

export default function VideosPage() {
  const [videos, setVideos] = useState<GachaVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedVideoType, setSelectedVideoType] = useState<'COMMON' | 'RARITY'>('COMMON');
  const [selectedRarity, setSelectedRarity] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; videoId: number | null }>({
    isOpen: false,
    videoId: null,
  });
  const [showDefaultSettings, setShowDefaultSettings] = useState(false);
  const [defaultSettings, setDefaultSettings] = useState<{
    id: number | null;
    commonVideoIds: number[];
    rarityVideoIds: Record<string, number[]> | null;
  } | null>(null);
  const [loadingDefaultSettings, setLoadingDefaultSettings] = useState(false);
  const [savingDefaultSettings, setSavingDefaultSettings] = useState(false);

  // 動画一覧を取得
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const token = getAdminAuthToken();
      const res = await fetch('/api/admin/videos', {
        headers: {
          'X-Admin-Auth': token || '',
        },
      });

      if (!res.ok) {
        throw new Error('動画一覧の取得に失敗しました');
      }

      const data = await res.json();
      setVideos(data.videos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // 動画をアップロード
  const handleUpload = async () => {
    if (!uploadFile) {
      setError('ファイルを選択してください');
      return;
    }

    if (selectedVideoType === 'RARITY' && !selectedRarity) {
      setError('等級を選択してください');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('videoType', selectedVideoType);
      if (selectedVideoType === 'RARITY') {
        formData.append('rarity', selectedRarity);
      }
      if (description) {
        formData.append('description', description);
      }

      const token = getAdminAuthToken();
      const res = await fetch('/api/admin/videos/upload', {
        method: 'POST',
        headers: {
          'X-Admin-Auth': token || '',
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'アップロードに失敗しました');
      }

      // 成功
      setShowUploadForm(false);
      setUploadFile(null);
      setDescription('');
      setSelectedRarity('');
      await fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // 動画の有効/無効を切り替え
  const toggleVideoActive = async (videoId: number, currentStatus: boolean) => {
    try {
      const token = getAdminAuthToken();
      const res = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': token || '',
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      if (!res.ok) {
        throw new Error('更新に失敗しました');
      }

      await fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    }
  };

  // 動画削除の確認モーダルを開く
  const handleDeleteClick = (videoId: number) => {
    setDeleteConfirm({ isOpen: true, videoId });
  };

  // 動画を削除
  const handleDelete = async () => {
    if (!deleteConfirm.videoId) return;

    try {
      const token = getAdminAuthToken();
      const res = await fetch(`/api/admin/videos/${deleteConfirm.videoId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Auth': token || '',
        },
      });

      if (!res.ok) {
        throw new Error('削除に失敗しました');
      }

      setDeleteConfirm({ isOpen: false, videoId: null });
      await fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
      setDeleteConfirm({ isOpen: false, videoId: null });
    }
  };

  // デフォルト設定を取得
  const fetchDefaultSettings = async () => {
    try {
      setLoadingDefaultSettings(true);
      const token = getAdminAuthToken();
      const res = await fetch('/api/admin/videos/default-settings', {
        headers: {
          'X-Admin-Auth': token || '',
        },
      });

      if (!res.ok) {
        throw new Error('デフォルト設定の取得に失敗しました');
      }

      const data = await res.json();
      setDefaultSettings({
        id: data.settings.id,
        commonVideoIds: data.settings.commonVideoIds || [],
        rarityVideoIds: data.settings.rarityVideoIds
          ? (typeof data.settings.rarityVideoIds === 'string'
              ? JSON.parse(data.settings.rarityVideoIds)
              : data.settings.rarityVideoIds)
          : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'デフォルト設定の取得に失敗しました');
    } finally {
      setLoadingDefaultSettings(false);
    }
  };

  // デフォルト設定を保存
  const saveDefaultSettings = async () => {
    if (!defaultSettings) return;

    try {
      setSavingDefaultSettings(true);
      setError(null);

      const token = getAdminAuthToken();
      const res = await fetch('/api/admin/videos/default-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': token || '',
        },
        body: JSON.stringify({
          commonVideoIds: defaultSettings.commonVideoIds,
          rarityVideoIds: defaultSettings.rarityVideoIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      const data = await res.json();
      setDefaultSettings({
        id: data.settings.id,
        commonVideoIds: data.settings.commonVideoIds || [],
        rarityVideoIds: data.settings.rarityVideoIds
          ? (typeof data.settings.rarityVideoIds === 'string'
              ? JSON.parse(data.settings.rarityVideoIds)
              : data.settings.rarityVideoIds)
          : null,
      });
      setShowDefaultSettings(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSavingDefaultSettings(false);
    }
  };

  // 動画をタイプ別・等級別にグループ化
  const groupedVideos = {
    COMMON: videos.filter((v) => v.videoType === 'COMMON'),
    RARITY: videos.filter((v) => v.videoType === 'RARITY').reduce((acc, video) => {
      const rarity = video.rarity || 'UNKNOWN';
      if (!acc[rarity]) {
        acc[rarity] = [];
      }
      acc[rarity].push(video);
      return acc;
    }, {} as Record<string, GachaVideo[]>),
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">ガチャ動画管理</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowDefaultSettings(!showDefaultSettings);
                if (!showDefaultSettings && !defaultSettings) {
                  fetchDefaultSettings();
                }
              }}
              className="rounded-lg bg-purple-500 px-4 py-2 text-white transition-colors hover:bg-purple-600"
            >
              {showDefaultSettings ? '一括設定を閉じる' : '一括設定'}
            </button>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            >
              {showUploadForm ? 'キャンセル' : '+ 動画をアップロード'}
          </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* アップロードフォーム */}
        {showUploadForm && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">動画をアップロード</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  動画タイプ
                </label>
                <select
                  value={selectedVideoType}
                  onChange={(e) => {
                    setSelectedVideoType(e.target.value as 'COMMON' | 'RARITY');
                    if (e.target.value === 'COMMON') {
                      setSelectedRarity('');
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="COMMON">共通動画（あたりかハズレの判定動画まで）</option>
                  <option value="RARITY">等級別動画（あたりの等級別）</option>
                </select>
              </div>

              {selectedVideoType === 'RARITY' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    等級
                  </label>
                  <select
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">選択してください</option>
                    {Object.entries(RARITY_LABELS)
                      .filter(([key]) => key !== 'LOSER')
                      .map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  動画ファイル
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {uploadFile && (
                  <p className="mt-1 text-sm text-gray-500">
                    選択: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  説明（任意）
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="動画の説明を入力してください"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile}
                  className="rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {uploading ? 'アップロード中...' : 'アップロード'}
                </button>
                <button
                  onClick={() => {
                    setShowUploadForm(false);
                    setUploadFile(null);
                    setDescription('');
                    setSelectedRarity('');
                  }}
                  className="rounded-lg bg-gray-200 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-300"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 共通動画 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-800">
                共通動画（あたりかハズレの判定動画まで）
              </h2>
              {groupedVideos.COMMON.length > 0 ? (
                <div className="space-y-4">
                  {groupedVideos.COMMON.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <video
                            src={video.s3Url}
                            className="h-20 w-32 rounded object-cover"
                            controls={false}
                            muted
                          />
                          <div>
                            <div className="font-medium text-gray-900">{video.fileName}</div>
                            {video.description && (
                              <div className="text-sm text-gray-500">{video.description}</div>
                            )}
                            <div className="mt-1 text-xs text-gray-400">
                              {formatFileSize(video.fileSize)} •{' '}
                              {new Date(video.createdAt).toLocaleDateString('ja-JP')}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleVideoActive(video.id, video.isActive)}
                          className={`rounded px-3 py-1 text-sm ${
                            video.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {video.isActive ? '有効' : '無効'}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(video.id)}
                          className="rounded bg-red-100 px-3 py-1 text-sm text-red-800 hover:bg-red-200"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-gray-500">
                  共通動画が登録されていません
                </div>
              )}
            </div>

            {/* 等級別動画 */}
            {Object.entries(groupedVideos.RARITY).map(([rarity, videos]) => (
              <div key={rarity} className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-gray-800">
                  {RARITY_LABELS[rarity] || rarity} の動画
                </h2>
                {videos.length > 0 ? (
                  <div className="space-y-4">
                    {videos.map((video) => (
                      <div
                        key={video.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <video
                              src={video.s3Url}
                              className="h-20 w-32 rounded object-cover"
                              controls={false}
                              muted
                            />
                            <div>
                              <div className="font-medium text-gray-900">{video.fileName}</div>
                              {video.description && (
                                <div className="text-sm text-gray-500">{video.description}</div>
                              )}
                              <div className="mt-1 text-xs text-gray-400">
                                {formatFileSize(video.fileSize)} •{' '}
                                {new Date(video.createdAt).toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleVideoActive(video.id, video.isActive)}
                            className={`rounded px-3 py-1 text-sm ${
                              video.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {video.isActive ? '有効' : '無効'}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(video.id)}
                            className="rounded bg-red-100 px-3 py-1 text-sm text-red-800 hover:bg-red-200"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-gray-500">
                    {RARITY_LABELS[rarity] || rarity} の動画が登録されていません
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 削除確認モーダル */}
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          title="動画の削除"
          message="この動画を削除しますか？この操作は取り消せません。"
          confirmText="削除"
          cancelText="キャンセル"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, videoId: null })}
        />
      </div>
    </AdminLayout>
  );
}


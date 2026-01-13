'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { getAdminAuthToken } from '@/lib/admin-auth';

type User = {
  userId: string;
  displayName: string | null;
  pictureUrl: string | null;
};

type Tag = {
  id: number;
  name: string;
  description: string | null;
  _count: {
    userTags: number;
  };
};

export default function PointsManagementContent() {
  const [grantType, setGrantType] = useState<'all' | 'selected' | 'tags'>('selected');
  const [pointType, setPointType] = useState<'PAID' | 'FREE'>('FREE');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [sendNotification, setSendNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagUserCount, setTagUserCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [grantConfirm, setGrantConfirm] = useState(false);
  const [grantResults, setGrantResults] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ userId: string; error: string }>;
    notificationResults?: {
      total: number;
      success: number;
      failed: number;
    };
  } | null>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (grantType === 'tags' && selectedTagIds.length > 0) {
      fetchTagUserCount();
    } else {
      setTagUserCount(0);
    }
  }, [grantType, selectedTagIds]);

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

  const fetchTagUserCount = async () => {
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/users/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': authToken || '',
        },
        body: JSON.stringify({
          tagIds: selectedTagIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTagUserCount(data.count || 0);
      }
    } catch (error) {
      console.error('タグユーザー数取得エラー:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('検索キーワードを入力してください');
      return;
    }

    setSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'X-Admin-Auth': authToken || '',
          },
        }
      );

      if (res.status === 401) {
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = '/admin';
        return;
      }

      if (!res.ok) {
        throw new Error('ユーザー検索に失敗しました');
      }

      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (err: any) {
      console.error('ユーザー検索エラー:', err);
      setError(err.message || 'ユーザー検索に失敗しました');
    } finally {
      setSearching(false);
    }
  };

  const handleAddUser = (user: User) => {
    if (!selectedUsers.find((u) => u.userId === user.userId)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.userId !== userId));
  };

  const handleGrantClick = () => {
    if (!amount || parseInt(amount) <= 0) {
      setError('ポイント数は1以上である必要があります');
      return;
    }

    if (grantType === 'selected' && selectedUsers.length === 0) {
      setError('ユーザーを選択してください');
      return;
    }

    if (grantType === 'tags' && selectedTagIds.length === 0) {
      setError('タグを選択してください');
      return;
    }

    setGrantConfirm(true);
  };

  const handleGrant = async () => {
    setGrantConfirm(false);
    setLoading(true);
    setError(null);
    setSuccess(null);
    setGrantResults(null);

    try {
      const authToken = getAdminAuthToken();

      // 全員付与の場合は、全ユーザーIDを取得
      let userIds: string[] = [];
      if (grantType === 'all') {
        const res = await fetch('/api/admin/users?limit=10000', {
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
          throw new Error('ユーザー一覧の取得に失敗しました');
        }

        const data = await res.json();
        userIds = data.users.map((u: User) => u.userId);
      } else if (grantType === 'tags') {
        // タグで選択した場合は、タグに紐づくユーザーIDを取得
        const searchRes = await fetch('/api/admin/users/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Auth': authToken || '',
          },
          body: JSON.stringify({
            tagIds: selectedTagIds,
          }),
        });

        if (searchRes.status === 401) {
          sessionStorage.removeItem('admin_authenticated');
          window.location.href = '/admin';
          return;
        }

        if (!searchRes.ok) {
          throw new Error('タグに紐づくユーザーの取得に失敗しました');
        }

        const searchData = await searchRes.json();
        userIds = searchData.users.map((u: User) => u.userId);
      } else {
        userIds = selectedUsers.map((u) => u.userId);
      }

      if (userIds.length === 0) {
        setError('対象ユーザーが0人です');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/points/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': authToken || '',
        },
        body: JSON.stringify({
          userIds,
          amount: parseInt(amount),
          pointType,
          description: description || undefined,
          sendNotification: sendNotification,
          notificationMessage: sendNotification ? (notificationMessage.trim() || undefined) : undefined,
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
        throw new Error(errorData.error || 'ポイント付与に失敗しました');
      }

      const data = await res.json();
      setGrantResults(data.results);
      
      let successMessage = `ポイント付与が完了しました。成功: ${data.results.success}人、失敗: ${data.results.failed}人`;
      if (sendNotification && data.results.notificationResults) {
        const notif = data.results.notificationResults;
        successMessage += `\n通知送信: 成功 ${notif.success}人、失敗 ${notif.failed}人`;
      }
      setSuccess(successMessage);
      setAmount('');
      setDescription('');
      setSelectedUsers([]);
      setSelectedTagIds([]);
      setSendNotification(false);
      setNotificationMessage('');
    } catch (err: any) {
      console.error('ポイント付与エラー:', err);
      setError(err.message || 'ポイント付与に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 whitespace-pre-line">
          {success}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">ポイント付与</h2>

        <div className="space-y-6">
          {/* 付与タイプ選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              付与タイプ
            </label>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="selected"
                  checked={grantType === 'selected'}
                  onChange={(e) => {
                    setGrantType(e.target.value as 'all' | 'selected' | 'tags');
                    setSelectedUsers([]);
                    setSelectedTagIds([]);
                  }}
                  className="mr-2"
                />
                <span className="text-gray-900">特定ユーザー</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="tags"
                  checked={grantType === 'tags'}
                  onChange={(e) => {
                    setGrantType(e.target.value as 'all' | 'selected' | 'tags');
                    setSelectedUsers([]);
                  }}
                  className="mr-2"
                />
                <span className="flex items-center text-gray-900">
                  <span>タグで選択</span>
                  {grantType === 'tags' && tagUserCount > 0 && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {tagUserCount}人
                    </span>
                  )}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="all"
                  checked={grantType === 'all'}
                  onChange={(e) => {
                    setGrantType(e.target.value as 'all' | 'selected' | 'tags');
                    setSelectedUsers([]);
                    setSelectedTagIds([]);
                  }}
                  className="mr-2"
                />
                <span className="text-gray-900">全ユーザー</span>
              </label>
            </div>
          </div>

          {/* ポイント種別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              ポイント種別
            </label>
            <select
              value={pointType}
              onChange={(e) => setPointType(e.target.value as 'PAID' | 'FREE')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            >
              <option value="FREE">無償ポイント</option>
              <option value="PAID">有償ポイント</option>
            </select>
          </div>

          {/* ポイント数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              ポイント数
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              placeholder="例: 100"
              min="1"
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              説明（任意）
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              placeholder="例: キャンペーン特典"
            />
          </div>

          {/* 通知メッセージ送信 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => {
                  setSendNotification(e.target.checked);
                  if (!e.target.checked) {
                    setNotificationMessage('');
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">
                ポイント付与通知を送信する
              </span>
            </label>
            {sendNotification && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  通知メッセージ（任意）
                </label>
                <textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  placeholder={`例: ${amount || 'XXX'}ポイントを付与しました。ガチャをお楽しみください！`}
                  rows={3}
                />
                <p className="mt-1 text-xs text-gray-500">
                  未入力の場合は、デフォルトメッセージが送信されます。
                </p>
              </div>
            )}
          </div>

          {/* タグ選択（タグで選択の場合） */}
          {grantType === 'tags' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タグを選択（複数選択可）
              </label>
              <div className="max-h-[200px] overflow-y-auto rounded-md border border-gray-300 bg-white p-2 shadow-sm">
                {tags.length === 0 ? (
                  <div className="py-4 text-center text-sm text-gray-500">
                    タグがありません
                  </div>
                ) : (
                  <div className="space-y-1">
                    {tags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <label
                          key={tag.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTagIds([...selectedTagIds, tag.id]);
                              } else {
                                setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="flex-1 text-gray-900">{tag.name}</span>
                          {tag.description && (
                            <span className="text-xs text-gray-500">{tag.description}</span>
                          )}
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {tag._count.userTags}人
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ユーザー検索（特定ユーザーの場合） */}
          {grantType === 'selected' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                ユーザー検索
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  placeholder="ユーザーIDまたは表示名で検索"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                >
                  {searching ? '検索中...' : '検索'}
                </button>
              </div>

              {/* 検索結果 */}
              {searchResults.length > 0 && (
                <div className="mt-4 max-h-64 overflow-y-auto rounded-md border border-gray-300">
                  {searchResults.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between border-b border-gray-200 p-3 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        {user.pictureUrl && (
                          <img
                            src={user.pictureUrl}
                            alt={user.displayName || ''}
                            className="h-10 w-10 rounded-full"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.displayName || '（表示名なし）'}
                          </div>
                          <div className="text-sm text-gray-500">{user.userId}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddUser(user)}
                        disabled={selectedUsers.some((u) => u.userId === user.userId)}
                        className="rounded-md bg-blue-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300"
                      >
                        {selectedUsers.some((u) => u.userId === user.userId)
                          ? '追加済み'
                          : '追加'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 選択済みユーザー */}
              {selectedUsers.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    選択済みユーザー ({selectedUsers.length}人)
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-gray-300">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between border-b border-gray-200 p-3 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          {user.pictureUrl && (
                            <img
                              src={user.pictureUrl}
                              alt={user.displayName || ''}
                              className="h-10 w-10 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.displayName || '（表示名なし）'}
                            </div>
                            <div className="text-sm text-gray-500">{user.userId}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveUser(user.userId)}
                          className="rounded-md bg-red-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-600"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 付与ボタン */}
          <div className="flex justify-end">
            <button
              onClick={handleGrantClick}
              disabled={
                loading ||
                !amount ||
                parseInt(amount) <= 0 ||
                (grantType === 'selected' && selectedUsers.length === 0) ||
                (grantType === 'tags' && selectedTagIds.length === 0)
              }
              className="rounded-md bg-blue-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '付与中...' : 'ポイントを付与'}
            </button>
          </div>

          {/* 付与結果 */}
          {grantResults && (
            <div className="mt-4 rounded-md bg-gray-50 p-4">
              <h3 className="mb-2 font-semibold text-gray-800">付与結果:</h3>
              <p>総対象ユーザー: {grantResults.total}人</p>
              <p className="text-green-600">成功: {grantResults.success}人</p>
              <p className="text-red-600">失敗: {grantResults.failed}人</p>
              {grantResults.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">エラー詳細:</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-red-600">
                    {grantResults.errors.map((err, index) => (
                      <li key={index}>
                        {err.userId.substring(0, 10)}...: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 付与確認モーダル */}
      <ConfirmModal
        isOpen={grantConfirm}
        title="ポイント付与の確認"
        message={
          (grantType === 'all'
            ? `全ユーザーに${amount}ポイント（${pointType === 'PAID' ? '有償' : '無償'}）を付与しますか？`
            : grantType === 'tags'
            ? `選択したタグに紐づく${tagUserCount}人のユーザーに${amount}ポイント（${pointType === 'PAID' ? '有償' : '無償'}）を付与しますか？`
            : `選択した${selectedUsers.length}人のユーザーに${amount}ポイント（${pointType === 'PAID' ? '有償' : '無償'}）を付与しますか？`) +
          (sendNotification ? '\n\n通知メッセージも送信します。' : '')
        }
        changes={[
          {
            label: '対象',
            from: '-',
            to:
              grantType === 'all'
                ? '全ユーザー'
                : grantType === 'tags'
                ? `タグ指定（${selectedTagIds.length}個 / 対象 ${tagUserCount}人）`
                : `個別指定（${selectedUsers.length}人）`,
          },
          {
            label: 'ポイント種別',
            from: '-',
            to: pointType === 'PAID' ? '有償' : '無償',
          },
          {
            label: '付与ポイント',
            from: '-',
            to: `${Number(amount || 0).toLocaleString()}pt`,
          },
          {
            label: '通知',
            from: '送信しない',
            to: sendNotification ? '送信する' : '送信しない',
          },
        ]}
        confirmText="付与"
        cancelText="キャンセル"
        variant="info"
        onConfirm={handleGrant}
        onCancel={() => setGrantConfirm(false)}
      />
    </div>
  );
}

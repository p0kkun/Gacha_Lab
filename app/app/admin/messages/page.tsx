'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdminAuthToken } from '@/lib/admin-auth';

type Tag = {
  id: number;
  name: string;
  description: string | null;
  _count: {
    userTags: number;
  };
};

type User = {
  userId: string;
  displayName: string | null;
};

export default function MessagesPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sendMode, setSendMode] = useState<'tags' | 'users'>('tags');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ userId: string; error: string }>;
  } | null>(null);

  useEffect(() => {
    fetchTags();
    fetchUsers();
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

  const fetchUsers = async () => {
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/users', {
        headers: {
          'X-Admin-Auth': authToken || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      setSendError('メッセージ内容を入力してください');
      return;
    }

    if (sendMode === 'tags' && selectedTagIds.length === 0) {
      setSendError('送信対象のタグを選択してください');
      return;
    }

    if (sendMode === 'users' && selectedUserIds.length === 0) {
      setSendError('送信対象のユーザーを選択してください');
      return;
    }

    setSending(true);
    setSendResult(null);
    setSendError(null);

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': authToken || '',
        },
        body: JSON.stringify({
          message: message.trim(),
          tagIds: sendMode === 'tags' ? selectedTagIds : undefined,
          userIds: sendMode === 'users' ? selectedUserIds : undefined,
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
        throw new Error(errorData.error || 'メッセージの送信に失敗しました');
      }

      const data = await res.json();
      setSendResult(data.results);
      setMessage('');
      setSelectedTagIds([]);
      setSelectedUserIds([]);
      setSendError(null);
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      setSendError(error instanceof Error ? error.message : 'メッセージの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">メッセージ配信</h1>

        {sendError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {sendError}
          </div>
        )}

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="space-y-6">
            {/* 送信モード選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                送信対象の選択方法
              </label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="tags"
                    checked={sendMode === 'tags'}
                    onChange={(e) => {
                      setSendMode(e.target.value as 'tags');
                      setSelectedUserIds([]);
                    }}
                    className="mr-2"
                  />
                  タグで選択
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="users"
                    checked={sendMode === 'users'}
                    onChange={(e) => {
                      setSendMode(e.target.value as 'users');
                      setSelectedTagIds([]);
                    }}
                    className="mr-2"
                  />
                  ユーザーで選択
                </label>
              </div>
            </div>

            {/* タグ選択 */}
            {sendMode === 'tags' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  送信対象タグ（複数選択可）
                </label>
                <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-md border border-gray-300 p-3">
                  {tags.length === 0 ? (
                    <div className="text-center text-gray-500">
                      タグがありません。先にタグを作成してください。
                    </div>
                  ) : (
                    tags.map((tag) => (
                      <label key={tag.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedTagIds.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTagIds([...selectedTagIds, tag.id]);
                            } else {
                              setSelectedTagIds(
                                selectedTagIds.filter((id) => id !== tag.id)
                              );
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="font-medium">{tag.name}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({tag._count.userTags}人)
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {selectedTagIds.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    選択中のタグ: {selectedTagIds.length}個
                  </div>
                )}
              </div>
            )}

            {/* ユーザー選択 */}
            {sendMode === 'users' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  送信対象ユーザー（複数選択可）
                </label>
                <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-md border border-gray-300 p-3">
                  {users.length === 0 ? (
                    <div className="text-center text-gray-500">ユーザーがありません</div>
                  ) : (
                    users.map((user) => (
                      <label key={user.userId} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds([...selectedUserIds, user.userId]);
                            } else {
                              setSelectedUserIds(
                                selectedUserIds.filter((id) => id !== user.userId)
                              );
                            }
                          }}
                          className="mr-2"
                        />
                        <span>{user.displayName || user.userId}</span>
                      </label>
                    ))
                  )}
                </div>
                {selectedUserIds.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    選択中のユーザー: {selectedUserIds.length}人
                  </div>
                )}
              </div>
            )}

            {/* メッセージ入力 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                メッセージ内容 *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                rows={6}
                placeholder="送信するメッセージを入力してください"
              />
              <div className="mt-1 text-sm text-gray-500">
                {message.length}文字
              </div>
            </div>

            {/* 送信結果 */}
            {sendResult && (
              <div className="rounded-md bg-blue-50 p-4">
                <h3 className="mb-2 font-semibold text-gray-800">送信結果</h3>
                <div className="space-y-1 text-sm">
                  <div>送信対象: {sendResult.total}人</div>
                  <div className="text-green-600">成功: {sendResult.success}人</div>
                  <div className="text-red-600">失敗: {sendResult.failed}人</div>
                  {sendResult.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="font-semibold">エラー詳細:</div>
                      <ul className="list-disc pl-5">
                        {sendResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>
                            {error.userId}: {error.error}
                          </li>
                        ))}
                        {sendResult.errors.length > 5 && (
                          <li>他 {sendResult.errors.length - 5}件のエラー</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 送信ボタン */}
            <div className="flex justify-end">
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="rounded-md bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-600"
              >
                {sending ? '送信中...' : 'メッセージを送信'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}


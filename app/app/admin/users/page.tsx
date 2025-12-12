'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { getAdminAuthToken } from '@/lib/admin-auth';

type User = {
  userId: string;
  displayName: string | null;
  pictureUrl: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    gachaHistories: number;
  };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'displayName' | 'gachaCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchUsers();
  }, [page, search, sortBy, sortOrder]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: sortBy,
        sortOrder: sortOrder,
      });
      if (search) {
        params.append('search', search);
      }

      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'X-Admin-Auth': authToken || '',
        },
      });

      if (res.status === 401) {
        // 認証エラーの場合はログイン画面にリダイレクト
        sessionStorage.removeItem('admin_authenticated');
        window.location.href = '/admin';
        return;
      }

      if (!res.ok) {
        throw new Error('ユーザー一覧の取得に失敗しました');
      }

      const data = await res.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
      alert('ユーザー一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div>
        <h1 className="mb-4 text-xl font-bold text-gray-800 lg:mb-6 lg:text-2xl">ユーザー管理</h1>

        {/* 検索とソート */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="ユーザーIDまたは表示名で検索"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'createdAt' | 'displayName' | 'gachaCount');
                  setPage(1);
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="createdAt">登録日時</option>
                <option value="displayName">表示名</option>
                <option value="gachaCount">ガチャ実行回数</option>
              </select>
              <button
                onClick={() => {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  setPage(1);
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50"
                title={sortOrder === 'asc' ? '昇順' : '降順'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* ユーザー一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500">
            ユーザーが見つかりませんでした
          </div>
        ) : (
          <>
            {/* デスクトップ用テーブル */}
            <div className="hidden overflow-x-auto rounded-lg bg-white shadow lg:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ユーザーID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <button
                        onClick={() => {
                          setSortBy('displayName');
                          setSortOrder(sortBy === 'displayName' && sortOrder === 'asc' ? 'desc' : 'asc');
                          setPage(1);
                        }}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        表示名
                        {sortBy === 'displayName' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <button
                        onClick={() => {
                          setSortBy('gachaCount');
                          setSortOrder(sortBy === 'gachaCount' && sortOrder === 'asc' ? 'desc' : 'asc');
                          setPage(1);
                        }}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        ガチャ実行回数
                        {sortBy === 'gachaCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <button
                        onClick={() => {
                          setSortBy('createdAt');
                          setSortOrder(sortBy === 'createdAt' && sortOrder === 'asc' ? 'desc' : 'asc');
                          setPage(1);
                        }}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        登録日時
                        {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {user.userId}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {user.pictureUrl && (
                            <img
                              src={user.pictureUrl}
                              alt={user.displayName || ''}
                              className="h-8 w-8 rounded-full"
                            />
                          )}
                          <span>{user.displayName || '-'}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {user._count.gachaHistories}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {new Date(user.createdAt).toLocaleString('ja-JP')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-blue-600">
                        <Link
                          href={`/admin/users/${user.userId}`}
                          className="hover:underline"
                        >
                          詳細
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* モバイル用カード */}
            <div className="space-y-4 lg:hidden">
              {users.map((user) => (
                <div
                  key={user.userId}
                  className="rounded-lg bg-white p-4 shadow"
                >
                  <div className="mb-3 flex items-center gap-3">
                    {user.pictureUrl && (
                      <img
                        src={user.pictureUrl}
                        alt={user.displayName || ''}
                        className="h-12 w-12 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {user.displayName || '-'}
                      </div>
                      <div className="text-xs text-gray-500">{user.userId}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ガチャ実行回数:</span>
                      <span className="font-medium text-gray-900">
                        {user._count.gachaHistories}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">登録日時:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(user.createdAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link
                      href={`/admin/users/${user.userId}`}
                      className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600"
                    >
                      詳細を見る
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-full rounded-md bg-gray-200 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 sm:w-auto"
            >
              前へ
            </button>
            <span className="px-4 py-2 text-center text-sm text-gray-700 sm:text-base">
              {page} / {pagination.totalPages} （全 {pagination.total} 件）
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="w-full rounded-md bg-gray-200 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 sm:w-auto"
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}



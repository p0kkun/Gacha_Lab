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

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
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
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">ユーザー管理</h1>

        {/* 検索 */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="ユーザーIDまたは表示名で検索"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full max-w-md rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    ユーザーID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    表示名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    ガチャ実行回数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    登録日時
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
        )}

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md bg-gray-200 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
            >
              前へ
            </button>
            <span className="px-4 py-2 text-gray-700">
              {page} / {pagination.totalPages} （全 {pagination.total} 件）
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="rounded-md bg-gray-200 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}



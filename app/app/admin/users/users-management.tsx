"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminAuthToken } from "@/lib/admin-auth";

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

export default function UsersManagementContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "createdAt" | "displayName" | "gachaCount"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchUsers();
  }, [page, search, sortBy, sortOrder]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortBy,
        sortOrder,
      });
      if (search) {
        params.append("search", search);
      }

      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          "X-Admin-Auth": authToken || "",
        },
      });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        throw new Error("ユーザー一覧の取得に失敗しました");
      }

      const data = await res.json();
      setUsers(data.users || []);
      setPagination(
        data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
      );
    } catch (err: any) {
      console.error("ユーザー一覧取得エラー:", err);
      setError(err.message || "ユーザー一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* 検索フォーム */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ユーザーIDまたは表示名で検索"
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600"
          >
            検索
          </button>
        </form>
      </div>

      {/* ソート */}
      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">ソート:</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-black"
        >
          <option value="createdAt">作成日時</option>
          <option value="displayName">表示名</option>
          <option value="gachaCount">ガチャ実行回数</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-black"
        >
          <option value="desc">降順</option>
          <option value="asc">昇順</option>
        </select>
      </div>

      {/* ユーザー一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-black">読み込み中...</div>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-center text-black">
            ユーザーが見つかりませんでした
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg bg-white shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    ガチャ実行回数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    作成日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.pictureUrl && (
                          <img
                            src={user.pictureUrl}
                            alt={user.displayName || ""}
                            className="h-10 w-10 rounded-full mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-black">
                            {user.displayName || "（表示名なし）"}
                          </div>
                          <div className="text-sm text-black">
                            {user.userId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {user._count.gachaHistories}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {new Date(user.createdAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/users/${user.userId}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {pagination.total}件中{" "}
                {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)}
                件を表示
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                <span className="flex items-center px-4 py-2 text-sm text-gray-700">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage(Math.min(pagination.totalPages, page + 1))
                  }
                  disabled={page === pagination.totalPages}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

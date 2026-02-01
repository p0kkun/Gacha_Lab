"use client";

import { useState, useEffect } from "react";
import { getAdminAuthToken } from "@/lib/admin-auth";
import {
  AdminActionTypeLabels,
  type AdminActionType,
} from "@/lib/admin-action-types";

type AdminActionHistory = {
  id: number;
  actionType: string;
  adminUserId: string | null;
  adminName: string | null;
  targetUserId: string | null;
  targetUserIds: string[];
  description: string;
  metadata: any;
  createdAt: Date;
};

export default function ActionHistoryPage() {
  const [histories, setHistories] = useState<AdminActionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    actionType: "" as string,
    adminUserId: "",
    targetUserId: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchHistories();
  }, [page, filters]);

  const fetchHistories = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "50");
      if (filters.actionType) {
        params.append("actionType", filters.actionType);
      }
      if (filters.adminUserId) {
        params.append("adminUserId", filters.adminUserId);
      }
      if (filters.targetUserId) {
        params.append("targetUserId", filters.targetUserId);
      }
      if (filters.startDate) {
        params.append("startDate", filters.startDate);
      }
      if (filters.endDate) {
        params.append("endDate", filters.endDate);
      }

      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/action-history?${params}`, {
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
        throw new Error("操作履歴の取得に失敗しました");
      }

      const data = await res.json();
      setHistories(data.histories);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      console.error("操作履歴取得エラー:", err);
      setError(err.message || "操作履歴の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // フィルタ変更時は1ページ目に戻す
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="w-full">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* フィルタ */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">フィルタ</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                操作タイプ
              </label>
              <select
                value={filters.actionType}
                onChange={(e) =>
                  handleFilterChange("actionType", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
              >
                <option value="">すべて</option>
                {Object.entries(AdminActionTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                管理者ユーザーID
              </label>
              <input
                type="text"
                value={filters.adminUserId}
                onChange={(e) =>
                  handleFilterChange("adminUserId", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                placeholder="管理者ユーザーID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                対象ユーザーID
              </label>
              <input
                type="text"
                value={filters.targetUserId}
                onChange={(e) =>
                  handleFilterChange("targetUserId", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                placeholder="対象ユーザーID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                終了日
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black"
              />
            </div>
          </div>
        </div>

        {/* 履歴一覧 */}
        <div className="rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    操作タイプ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    管理者
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    対象ユーザー
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    説明
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-black"
                    >
                      読み込み中...
                    </td>
                  </tr>
                ) : histories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-black"
                    >
                      履歴がありません
                    </td>
                  </tr>
                ) : (
                  histories.map((history) => (
                    <tr key={history.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-black">
                        {formatDate(history.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          {AdminActionTypeLabels[
                            history.actionType as AdminActionType
                          ] || history.actionType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-black">
                        {history.adminName || history.adminUserId || "（不明）"}
                      </td>
                      <td className="px-4 py-3 text-sm text-black">
                        {history.targetUserId ? (
                          <div className="text-xs">
                            {history.targetUserId.substring(0, 10)}...
                          </div>
                        ) : history.targetUserIds &&
                          history.targetUserIds.length > 0 ? (
                          <div className="text-xs">
                            {history.targetUserIds.length}人
                            {history.targetUserIds.length <= 3 && (
                              <div className="mt-1 space-y-0.5">
                                {history.targetUserIds.map((id, idx) => (
                                  <div key={idx} className="text-gray-600">
                                    {id.substring(0, 10)}...
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-black">
                        <div className="max-w-md">{history.description}</div>
                        {history.metadata && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-black hover:text-gray-700">
                              詳細を見る
                            </summary>
                            <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs">
                              {JSON.stringify(history.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
              <div className="text-sm text-gray-700">
                ページ {page} / {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  前へ
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

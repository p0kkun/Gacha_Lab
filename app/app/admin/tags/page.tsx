"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { getAdminAuthToken } from "@/lib/admin-auth";

type Tag = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    userTags: number;
  };
};

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    tagId: number | null;
  }>({ isOpen: false, tagId: null });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/tags", {
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
        throw new Error("タグ一覧の取得に失敗しました");
      }

      const data = await res.json();
      setTags(data.tags);
    } catch (error) {
      console.error("タグ取得エラー:", error);
      setError("タグ一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError("タグ名は必須です");
      return;
    }

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Auth": authToken || "",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        }),
      });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "タグの作成に失敗しました");
      }

      setSuccess("タグを作成しました");
      setFormData({ name: "", description: "" });
      setShowCreateForm(false);
      await fetchTags();
    } catch (error) {
      console.error("タグ作成エラー:", error);
      setError(
        error instanceof Error ? error.message : "タグの作成に失敗しました"
      );
    }
  };

  const handleDeleteClick = (tagId: number) => {
    setDeleteConfirm({ isOpen: true, tagId });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.tagId) return;

    const tagId = deleteConfirm.tagId;
    setDeleteConfirm({ isOpen: false, tagId: null });

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/tags/${tagId}`, {
        method: "DELETE",
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
        const errorData = await res.json();
        throw new Error(errorData.error || "タグの削除に失敗しました");
      }

      setSuccess("タグを削除しました");
      await fetchTags();
    } catch (error) {
      console.error("タグ削除エラー:", error);
      setError(
        error instanceof Error ? error.message : "タグの削除に失敗しました"
      );
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">タグ管理</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/tags/bulk-assign"
            className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
          >
            一括付与
          </Link>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            {showCreateForm ? "キャンセル" : "新規作成"}
          </button>
        </div>
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

      {/* 作成フォーム */}
      {showCreateForm && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            新規タグ作成
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                タグ名 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                placeholder="例: VIP会員"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                説明文
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                rows={3}
                placeholder="タグの説明を入力（任意）"
              />
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

      {/* タグ一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-black">読み込み中...</div>
        </div>
      ) : tags.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-black shadow">
          タグがありません
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                  タグ名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                  説明
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                  対象ユーザー数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                  作成日時
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tags.map((tag) => (
                <tr key={tag.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-black">
                    {tag.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-black">
                    {tag.description || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-black">
                    {tag._count.userTags}人
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-black">
                    {new Date(tag.createdAt).toLocaleString("ja-JP")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <Link
                      href={`/admin/tags/${tag.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      詳細
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(tag.id)}
                      className="ml-4 text-red-600 hover:text-red-900"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 削除確認モーダル */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="タグの削除"
        message="このタグを削除しますか？この操作は取り消せません。"
        changes={(() => {
          const tag = tags.find((t) => t.id === deleteConfirm.tagId);
          if (!tag) return [];
          return [
            { label: "対象タグ", from: "登録済み", to: `削除（${tag.name}）` },
            {
              label: "対象ユーザー数",
              from: `${tag._count.userTags}人`,
              to: "（タグ削除により解除されます）",
            },
          ];
        })()}
        confirmText="削除"
        cancelText="キャンセル"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, tagId: null })}
      />
    </div>
  );
}

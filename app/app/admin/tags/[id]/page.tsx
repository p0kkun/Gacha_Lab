"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
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

export default function TagDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const [tag, setTag] = useState<Tag | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTag();
  }, [id]);

  const fetchTag = async () => {
    setLoading(true);
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/tags/${id}`, {
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
        throw new Error("タグ詳細の取得に失敗しました");
      }

      const data = await res.json();
      setTag(data.tag);
      setFormData({
        name: data.tag.name,
        description: data.tag.description || "",
      });
    } catch (error) {
      console.error("タグ取得エラー:", error);
      setError("タグ詳細の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("タグ名は必須です");
      return;
    }

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/tags/${id}`, {
        method: "PUT",
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
        throw new Error(errorData.error || "保存に失敗しました");
      }

      setSuccess("保存しました");
      await fetchTag();
    } catch (error) {
      console.error("保存エラー:", error);
      setError(error instanceof Error ? error.message : "保存に失敗しました");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-black">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!tag) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            タグが見つかりませんでした
          </div>
          <div className="mt-4">
            <button
              onClick={() => router.push("/admin/tags")}
              className="text-blue-600 hover:underline"
            >
              ← タグ一覧に戻る
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
            onClick={() => router.push("/admin/tags")}
            className="text-blue-600 hover:underline"
          >
            ← タグ一覧に戻る
          </button>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-gray-800">タグ詳細</h1>

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
              <label className="block text-sm font-medium text-gray-700">
                ID
              </label>
              <div className="mt-1 text-black">{tag.id}</div>
            </div>

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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                対象ユーザー数
              </label>
              <div className="mt-1 text-black">{tag._count.userTags}人</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                保存
              </button>
              <button
                onClick={() => router.push("/admin/tags")}
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

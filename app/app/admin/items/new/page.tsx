"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";

type FormData = {
  name: string;
  description: string;
  usageType: "IMAGE" | "SHOW_TO_STAFF";
  isActive: boolean;
  useStartAt: string;
  useEndAt: string;
};

const INITIAL_FORM: FormData = {
  name: "",
  description: "",
  usageType: "IMAGE",
  isActive: true,
  useStartAt: "",
  useEndAt: "",
};

export default function NewItemPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("アイテム名は必須です");
      return;
    }
    if (form.useStartAt && form.useEndAt) {
      if (new Date(form.useStartAt) > new Date(form.useEndAt)) {
        setError("使用期限は使用開始日時より後にしてください");
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          usageType: form.usageType,
          isActive: form.isActive,
          useStartAt: form.useStartAt ? new Date(form.useStartAt).toISOString() : null,
          useEndAt: form.useEndAt ? new Date(form.useEndAt).toISOString() : null,
        }),
      });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "作成に失敗しました");

      const itemId = data.item?.id as number | undefined;
      if (!itemId) throw new Error("作成結果の取得に失敗しました");

      if (form.usageType === "IMAGE" && imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", imageFile);
        uploadFormData.append("itemId", String(itemId));

        const uploadRes = await fetch("/api/admin/items/upload-image", {
          method: "POST",
          body: uploadFormData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "画像アップロードに失敗しました");
        }

        await fetch(`/api/admin/items/${itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || null,
            usageType: form.usageType,
            isActive: form.isActive,
            useStartAt: form.useStartAt ? new Date(form.useStartAt).toISOString() : null,
            useEndAt: form.useEndAt ? new Date(form.useEndAt).toISOString() : null,
            imageUrl: uploadData.imageUrl,
          }),
        });
      }

      setSuccess("アイテムを作成しました");
      router.replace(`/admin/items/${itemId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-5xl p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">新規アイテム作成</h1>
            <p className="mt-1 text-sm text-gray-600">
              管理者が必要な入力だけに絞って登録できます
            </p>
          </div>
          <Link
            href="/admin/master?tab=items"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            一覧へ戻る
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_.7fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">基本情報</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  アイテム名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  placeholder="例: 限定カードスリーブ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">説明（任意）</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  placeholder="ユーザー向けの説明文"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">使用方法</label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, usageType: "IMAGE" })}
                    className={`rounded-md border px-3 py-2 text-left text-sm ${
                      form.usageType === "IMAGE"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700"
                    }`}
                  >
                    画像
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, usageType: "SHOW_TO_STAFF" })}
                    className={`rounded-md border px-3 py-2 text-left text-sm ${
                      form.usageType === "SHOW_TO_STAFF"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700"
                    }`}
                  >
                    見せて使用
                  </button>
                </div>
              </div>

              {form.usageType === "IMAGE" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    使用画像（任意）
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                  {imageFile && (
                    <p className="mt-1 text-xs text-gray-500">選択済み: {imageFile.name}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    使用開始日時（任意）
                  </label>
                  <input
                    type="datetime-local"
                    value={form.useStartAt}
                    onChange={(e) => setForm({ ...form, useStartAt: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    使用期限（任意）
                  </label>
                  <input
                    type="datetime-local"
                    value={form.useEndAt}
                    onChange={(e) => setForm({ ...form, useEndAt: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <span className="text-sm text-gray-700">作成直後から有効にする</span>
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">確認</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <div>名前: {form.name || "未入力"}</div>
              <div>使用方法: {form.usageType === "IMAGE" ? "画像" : "見せて使用"}</div>
              <div>状態: {form.isActive ? "有効" : "無効"}</div>
              <div>画像: {imageFile ? "あり" : "なし"}</div>
            </div>
            <div className="mt-6 rounded-md bg-blue-50 p-3 text-xs text-blue-800">
              等級（1等/2等…）は「景品割当（ガチャ別）」で設定します。
            </div>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "作成中..." : "この内容で作成"}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

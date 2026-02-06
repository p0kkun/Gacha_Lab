"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";

type GachaItem = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  usageType: string;
  grantFreePoints: number;
  isActive: boolean;
  useStartAt: string | null;
  useEndAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    gachaHistories: number;
  };
};

// NOTE: 等級（1等/2等…）は「景品割当（ガチャ別）」で管理するため、アイテムマスタ側では管理しない

const USAGE_TYPE_OPTIONS = [
  { value: "IMAGE", label: "画像" },
  { value: "SHOW_TO_STAFF", label: "見せて使用" },
];

export default function ItemEditPage() {
  const params = useParams();
  const id = parseInt(params.id as string);

  const [item, setItem] = useState<GachaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<GachaItem>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [descriptionTextareaRef, setDescriptionTextareaRef] =
    useState<HTMLTextAreaElement | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkData, setLinkData] = useState({ text: "", url: "" });

  const toDatetimeLocalValue = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fromDatetimeLocalValue = (value: string): string | null => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  // リンク挿入処理
  const handleInsertLink = () => {
    if (!descriptionTextareaRef) return;

    const textarea = descriptionTextareaRef;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = formData.description || "";
    const selectedText = currentText.substring(start, end);

    // 選択テキストがある場合はそれをリンクテキストとして使用
    const linkText = linkData.text || selectedText || "リンク";
    const linkUrl = linkData.url || "";

    if (!linkUrl) {
      alert("URLを入力してください");
      return;
    }

    const markdownLink = `[${linkText}](${linkUrl})`;
    const newText =
      currentText.substring(0, start) +
      markdownLink +
      currentText.substring(end);

    setFormData({ ...formData, description: newText });
    setShowLinkModal(false);
    setLinkData({ text: "", url: "" });

    // テキストエリアのフォーカスを復帰し、カーソル位置を調整
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + markdownLink.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/items/${id}`, {
        headers: {} });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        throw new Error("アイテム詳細の取得に失敗しました");
      }

      const data = await res.json();
      setItem(data.item);
      setFormData(data.item);
    } catch (error) {
      console.error("アイテム取得エラー:", error);
      setError("アイテム詳細の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      setError("名前は必須です");
      return;
    }

    try {
      const res = await fetch(`/api/admin/items/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json" },
        body: JSON.stringify(formData) });

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
      await fetchItem();
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

  if (!item) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            アイテムが見つかりませんでした
          </div>
          <div className="mt-4">
            <Link
              href="/admin/items"
              className="text-blue-600 hover:underline"
            >
              ← アイテム一覧に戻る
            </Link>
          </div>
        </div>

        {/* リンク挿入モーダル */}
        {showLinkModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            onClick={() => setShowLinkModal(false)}
          >
            <div
              className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-800">
                リンクを挿入
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    リンクテキスト
                  </label>
                  <input
                    type="text"
                    value={linkData.text}
                    onChange={(e) =>
                      setLinkData({ ...linkData, text: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                    placeholder="例: 詳細はこちら"
                  />
                  <p className="mt-1 text-xs text-black">
                    テキストエリアで選択したテキストがある場合は、それがリンクテキストとして使用されます
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    URL *
                  </label>
                  <input
                    type="url"
                    value={linkData.url}
                    onChange={(e) =>
                      setLinkData({ ...linkData, url: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                    placeholder="https://example.com"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkData({ text: "", url: "" });
                  }}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleInsertLink}
                  className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                >
                  挿入
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-4">
          <Link
            href="/admin/items"
            className="text-blue-600 hover:underline"
          >
            ← アイテム一覧に戻る
          </Link>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-gray-800">アイテム編集</h1>

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
              <div className="mt-1 text-black">{item.id}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                名前
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                説明文（任意）
              </label>
              <div className="mt-1 flex gap-2">
                <textarea
                  ref={(el) => setDescriptionTextareaRef(el)}
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-black"
                  rows={4}
                  placeholder="アイテムの説明を入力してください。リンクは[リンク挿入]ボタンから追加できます。"
                />
                <button
                  type="button"
                  onClick={() => setShowLinkModal(true)}
                  className="h-fit rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                  title="リンクを挿入"
                >
                  リンク挿入
                </button>
              </div>
              <p className="mt-1 text-xs text-black">
                Markdown形式でリンクを記述できます: [リンクテキスト](URL)
              </p>
            </div>

            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
              等級（1等/2等…）は「景品割当（ガチャ別）」タブで設定します。
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                （参考）動画URL
              </label>
              <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                ガチャ演出動画は「動画管理」「ガチャ設定」で管理します（アイテムマスタでは管理しません）。
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                使用方法
              </label>
              <select
                value={formData.usageType || "IMAGE"}
                onChange={(e) =>
                  setFormData({ ...formData, usageType: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
              >
                {USAGE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                当選時付与無償ポイント
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.grantFreePoints ?? 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    grantFreePoints: parseInt(e.target.value) || 0 })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-black">
                ガチャでこのアイテムが当選した際に付与する無償ポイント数（0の場合は付与しない）
              </p>
            </div>
            {formData.usageType === "IMAGE" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  使用画像
                </label>
                <p className="mb-2 text-xs text-black">
                  アイテム使用時に表示する画像をアップロードしてください
                </p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                />
                {formData.imageUrl && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-gray-600">現在の画像:</p>
                    <img
                      src={formData.imageUrl}
                      alt="アイテム画像"
                      className="h-32 w-32 rounded border border-gray-300 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, imageUrl: null })
                      }
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      画像を削除
                    </button>
                  </div>
                )}
                {imageFile && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!imageFile || !id) return;
                      try {
                        setUploadingImage(true);
                        const uploadFormData = new FormData();
                        uploadFormData.append("file", imageFile);
                        uploadFormData.append("itemId", id.toString());

                        const res = await fetch(
                          "/api/admin/items/upload-image",
                          {
                            method: "POST",
                            headers: {},
                            body: uploadFormData }
                        );

                        if (!res.ok) {
                          const data = await res.json();
                          throw new Error(
                            data.error || "アップロードに失敗しました"
                          );
                        }

                        const data = await res.json();
                        setFormData({ ...formData, imageUrl: data.imageUrl });
                        setImageFile(null);
                        setSuccess("画像をアップロードしました");
                      } catch (error) {
                        console.error("画像アップロードエラー:", error);
                        setError(
                          error instanceof Error
                            ? error.message
                            : "画像のアップロードに失敗しました"
                        );
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                    disabled={uploadingImage}
                    className="mt-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {uploadingImage
                      ? "アップロード中..."
                      : "画像をアップロード"}
                  </button>
                )}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive ?? true}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">有効</span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  使用開始日時（任意）
                </label>
                <input
                  type="datetime-local"
                  value={toDatetimeLocalValue(formData.useStartAt)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      useStartAt: fromDatetimeLocalValue(e.target.value) })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                />
                <p className="mt-1 text-xs text-black">
                  未設定の場合は使用開始の制限なし
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  使用期限（任意）
                </label>
                <input
                  type="datetime-local"
                  value={toDatetimeLocalValue(formData.useEndAt)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      useEndAt: fromDatetimeLocalValue(e.target.value) })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                />
                <p className="mt-1 text-xs text-black">
                  未設定の場合は使用期限の制限なし
                </p>
              </div>
            </div>

            {item._count && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ガチャ実行回数
                </label>
                <div className="mt-1 text-black">
                  {item._count.gachaHistories} 回
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                保存
              </button>
              <Link
                href="/admin/items"
                className="inline-block rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
              >
                キャンセル
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* リンク挿入モーダル */}
      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
          onClick={() => setShowLinkModal(false)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              リンクを挿入
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  リンクテキスト
                </label>
                <input
                  type="text"
                  value={linkData.text}
                  onChange={(e) =>
                    setLinkData({ ...linkData, text: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                  placeholder="例: 詳細はこちら"
                />
                <p className="mt-1 text-xs text-black">
                  テキストエリアで選択したテキストがある場合は、それがリンクテキストとして使用されます
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  URL *
                </label>
                <input
                  type="url"
                  value={linkData.url}
                  onChange={(e) =>
                    setLinkData({ ...linkData, url: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkData({ text: "", url: "" });
                }}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={handleInsertLink}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                挿入
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

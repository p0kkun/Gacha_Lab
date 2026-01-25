"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { getAdminAuthToken } from "@/lib/admin-auth";

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
};

type GachaType = {
  id: string;
  name: string;
};

// NOTE: 等級（1等/2等…）は「景品割当（ガチャ別）」で管理するため、アイテムマスタ側では管理しない

const USAGE_TYPE_OPTIONS = [
  { value: "IMAGE", label: "画像" },
  { value: "SHOW_TO_STAFF", label: "見せて使用" },
];

export default function ItemsPage() {
  const [items, setItems] = useState<GachaItem[]>([]);
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActiveFilter, setIsActiveFilter] = useState<string>("true");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<Partial<GachaItem>>({
    name: "",
    description: null,
    imageUrl: null,
    usageType: "IMAGE",
    grantFreePoints: 0,
    isActive: true,
    useStartAt: null,
    useEndAt: null,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    itemId: number | null;
  }>({ isOpen: false, itemId: null });
  const [descriptionTextareaRef, setDescriptionTextareaRef] =
    useState<HTMLTextAreaElement | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkData, setLinkData] = useState({ text: "", url: "" });

  useEffect(() => {
    fetchGachaTypes();
    fetchItems();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [isActiveFilter]);

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

  const fetchGachaTypes = async () => {
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/gacha-types", {
        headers: {
          "X-Admin-Auth": authToken || "",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setGachaTypes(data.gachaTypes || []);
      }
    } catch (error) {
      console.error("ガチャタイプ取得エラー:", error);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isActiveFilter !== "") {
        params.append("isActive", isActiveFilter);
      }

      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/items?${params}`, {
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
        throw new Error("アイテム一覧の取得に失敗しました");
      }

      const data = await res.json();
      setItems(data.items);
    } catch (error) {
      console.error("アイテム取得エラー:", error);
      setError("アイテム一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      setError("名前は必須です");
      return;
    }

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Auth": authToken || "",
        },
        body: JSON.stringify(formData),
      });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "作成に失敗しました");
      }

      const data = await res.json();
      setSuccess("アイテムを作成しました");

      // 画像が選択されている場合はアップロード
      if (imageFile && data.item?.id) {
        try {
          setUploadingImage(true);
          const uploadFormData = new FormData();
          uploadFormData.append("file", imageFile);
          uploadFormData.append("itemId", data.item.id.toString());

          const uploadRes = await fetch("/api/admin/items/upload-image", {
            method: "POST",
            headers: {
              "X-Admin-Auth": authToken || "",
            },
            body: uploadFormData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            // アイテムを更新してimageUrlを設定
            await fetch(`/api/admin/items/${data.item.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "X-Admin-Auth": authToken || "",
              },
              body: JSON.stringify({
                ...formData,
                imageUrl: uploadData.imageUrl,
              }),
            });
            setSuccess("アイテムを作成し、画像をアップロードしました");
          }
        } catch (error) {
          console.error("画像アップロードエラー:", error);
          setError(
            "アイテムは作成されましたが、画像のアップロードに失敗しました"
          );
        } finally {
          setUploadingImage(false);
        }
      }

      setShowCreateForm(false);
      setFormData({
        name: "",
        imageUrl: null,
        usageType: "IMAGE",
        isActive: true,
        useStartAt: null,
        useEndAt: null,
      });
      setImageFile(null);
      await fetchItems();
    } catch (error) {
      console.error("作成エラー:", error);
      setError(error instanceof Error ? error.message : "作成に失敗しました");
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm({ isOpen: true, itemId: id });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.itemId) return;

    const id = deleteConfirm.itemId;
    setDeleteConfirm({ isOpen: false, itemId: null });

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/items/${id}`, {
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
        throw new Error("削除に失敗しました");
      }

      setSuccess("アイテムを無効化しました");
      await fetchItems();
    } catch (error) {
      console.error("削除エラー:", error);
      setError("削除に失敗しました");
    }
  };

  // 等級は「景品割当（ガチャ別）」で管理するため、アイテムマスタ側では表示しない

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="w-full rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 sm:w-auto"
        >
          {showCreateForm ? "キャンセル" : "新規作成"}
        </button>
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

      {/* フィルター */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:gap-4">
        <select
          value={isActiveFilter}
          onChange={(e) => setIsActiveFilter(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 lg:text-base"
        >
          <option value="">すべて</option>
          <option value="true">有効</option>
          <option value="false">無効</option>
        </select>
      </div>

      {/* 作成フォーム */}
      {showCreateForm && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            新規アイテム作成
          </h2>
          <div className="space-y-4">
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
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
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
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
              <p className="mt-1 text-xs text-gray-500">
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
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
              >
                {USAGE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {formData.usageType === "IMAGE" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  使用画像
                </label>
                <p className="mb-2 text-xs text-gray-500">
                  アイテム使用時に表示する画像をアップロードしてください
                </p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
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
                  <p className="mt-2 text-xs text-gray-600">
                    選択済み: {imageFile.name}
                    （アイテム作成後にアップロードされます）
                  </p>
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
                      useStartAt: fromDatetimeLocalValue(e.target.value),
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-500">
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
                      useEndAt: fromDatetimeLocalValue(e.target.value),
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-500">
                  未設定の場合は使用期限の制限なし
                </p>
              </div>
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

      {/* アイテム一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500">
          アイテムがありません
        </div>
      ) : (
        <>
          {/* デスクトップ用テーブル */}
          <div className="hidden overflow-x-auto rounded-lg bg-white shadow lg:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    名前
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    景品割当（ガチャ別）
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    作成日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <span className="inline-flex rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-900">
                        景品割当（ガチャ別）で設定
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          item.isActive
                            ? "bg-green-200 text-green-900"
                            : "bg-gray-200 text-gray-900"
                        }`}
                      >
                        {item.isActive ? "有効" : "無効"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {new Date(item.createdAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-blue-600">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/items/${item.id}`}
                          className="hover:underline"
                        >
                          編集
                        </Link>
                        {item.isActive && (
                          <button
                            onClick={() => handleDeleteClick(item.id)}
                            className="text-red-600 hover:underline"
                          >
                            無効化
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* モバイル用カード */}
          <div className="space-y-4 lg:hidden">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg bg-white p-4 shadow">
                <div className="mb-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.name}
                    </h3>
                    <span className="text-xs text-gray-500">ID: {item.id}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-900">
                      景品割当（ガチャ別）で設定
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        item.isActive
                          ? "bg-green-200 text-green-900"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      {item.isActive ? "有効" : "無効"}
                    </span>
                  </div>
                </div>
                <div className="mb-3 text-xs text-gray-600">
                  作成日時: {new Date(item.createdAt).toLocaleString("ja-JP")}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/items/${item.id}`}
                    className="flex-1 rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600"
                  >
                    編集
                  </Link>
                  {item.isActive && (
                    <button
                      onClick={() => handleDeleteClick(item.id)}
                      className="flex-1 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                    >
                      無効化
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 削除確認モーダル */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="アイテムの無効化"
        message="このアイテムを無効化しますか？無効化されたアイテムはガチャで抽選されなくなります。"
        changes={(() => {
          const item = items.find((i) => i.id === deleteConfirm.itemId);
          if (!item) return [];
          return [
            {
              label: "対象アイテム",
              from: "登録済み",
              to: `無効化（${item.name}）`,
            },
            { label: "状態", from: "有効", to: "無効" },
          ];
        })()}
        confirmText="無効化"
        cancelText="キャンセル"
        variant="warning"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, itemId: null })}
      />

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
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  placeholder="例: 詳細はこちら"
                />
                <p className="mt-1 text-xs text-gray-500">
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
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
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
    </div>
  );
}

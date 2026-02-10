"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import VariableInfoModal from "@/components/admin/VariableInfoModal";
import { WarningIcon } from "@/components/admin/icons/AdminIcons";

type Template = {
  id: number;
  code: string;
  template: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function ResultMessageTemplatesPage() {

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newRow, setNewRow] = useState<{
    code: string;
    template: string;
    description: string;
    isActive: boolean;
  }>({ code: "", template: "", description: "", isActive: true });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<Partial<Template>>({});

  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: "danger" | "warning" | "info";
    changes?: Array<{ label: string; from: string; to: string }>;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const [showVariableInfo, setShowVariableInfo] = useState(false);

  const closeConfirm = () => setConfirm(null);

  const fetchTemplates = async () => {
    const res = await fetch("/api/admin/result-message-templates", {
      headers: {} });
    if (res.status === 401) {
      sessionStorage.removeItem("admin_authenticated");
      window.location.href = "/admin";
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "テンプレート一覧の取得に失敗しました");
    setTemplates(Array.isArray(data.templates) ? data.templates : []);
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await fetchTemplates();
      } catch (e) {
        setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setEditRow({ ...t });
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRow({});
  };

  const createTemplate = async () => {
    setError(null);
    setSuccess(null);
    const code = newRow.code.trim();
    const template = newRow.template;
    if (!code) return setError("code は必須です");
    if (!template.trim()) return setError("template は必須です");

    setConfirm({
      isOpen: true,
      title: "テンプレート作成",
      message: "この内容でテンプレートを作成します。よろしいですか？",
      confirmText: "作成",
      variant: "info",
      changes: [
        { label: "テンプレート識別コード", from: "-", to: code },
        { label: "状態", from: "-", to: newRow.isActive ? "有効" : "無効" },
      ],
      onConfirm: async () => {
        const res = await fetch("/api/admin/result-message-templates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            template,
            description: newRow.description.trim() || null,
            isActive: newRow.isActive }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "作成に失敗しました");
        setNewRow({ code: "", template: "", description: "", isActive: true });
        await fetchTemplates();
        setSuccess("作成しました");
      } });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setError(null);
    setSuccess(null);

    const before = templates.find((t) => t.id === editingId);
    if (!before) return setError("対象が見つかりません");

    const next: Partial<Template> = {
      code: typeof editRow.code === "string" ? editRow.code.trim() : before.code,
      template:
        typeof editRow.template === "string" ? editRow.template : before.template,
      description:
        typeof editRow.description === "string" ? editRow.description : before.description,
      isActive:
        typeof editRow.isActive === "boolean" ? editRow.isActive : before.isActive };

    const changes: Array<{ label: string; from: string; to: string }> = [];
    if (next.code !== before.code) changes.push({ label: "テンプレート識別コード", from: before.code, to: String(next.code) });
    if ((next.description ?? "") !== (before.description ?? "")) changes.push({ label: "説明", from: before.description ?? "-", to: next.description ?? "-" });
    if (!!next.isActive !== !!before.isActive) changes.push({ label: "状態", from: before.isActive ? "有効" : "無効", to: next.isActive ? "有効" : "無効" });
    if ((next.template ?? "") !== before.template) changes.push({ label: "本文", from: "（変更前）", to: "（変更後）" });

    setConfirm({
      isOpen: true,
      title: "テンプレート保存",
      message: "この変更を保存します。よろしいですか？",
      confirmText: "保存",
      variant: "info",
      changes,
      onConfirm: async () => {
        const res = await fetch(`/api/admin/result-message-templates/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json" },
          body: JSON.stringify({
            code: next.code,
            template: next.template,
            description: next.description ?? null,
            isActive: next.isActive }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "保存に失敗しました");
        await fetchTemplates();
        setEditingId(null);
        setEditRow({});
        setSuccess("保存しました");
      } });
  };

  const deleteTemplate = async (t: Template) => {
    setError(null);
    setSuccess(null);
    setConfirm({
      isOpen: true,
      title: "テンプレート削除",
      message:
        "このテンプレートを削除します。ガチャ設定で使用中の場合は削除できません。",
      confirmText: "削除",
      variant: "danger",
      changes: [{ label: "テンプレート識別コード", from: "-", to: t.code }],
      onConfirm: async () => {
        const res = await fetch(`/api/admin/result-message-templates/${t.id}`, {
          method: "DELETE",
          headers: {} });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "削除に失敗しました");
        await fetchTemplates();
        setSuccess("削除しました");
      } });
  };

  return (
    <div className="w-full">
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

        <div className="mb-6 rounded-lg bg-white p-4 shadow lg:p-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">新規作成</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                テンプレート識別コード
                <span className="ml-2 text-xs text-gray-500">（ガチャ設定で選択する際に使用）</span>
              </label>
              <input
                value={newRow.code}
                onChange={(e) => setNewRow({ ...newRow, code: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="例: default, premium-result"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">説明</label>
              <input
                value={newRow.description}
                onChange={(e) =>
                  setNewRow({ ...newRow, description: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="任意"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700">本文</label>
              <textarea
                value={newRow.template}
                onChange={(e) =>
                  setNewRow({ ...newRow, template: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 font-mono"
                rows={8}
              />
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  使用可能な変数: {"{itemName}"} / {"{rarity}"} / {"{rarityEmoji}"} / {"{gachaTypeName}"} / {"{handName}"} / {"{grantedPoints}"} / {"{grantedPointsMessage}"}
                </p>
                <button
                  type="button"
                  onClick={() => setShowVariableInfo(true)}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  aria-label="変数の詳細を見る"
                  title="変数の詳細を見る"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </button>
                </div>
                <p className="text-xs text-gray-500">
                  ※ 変数置換後の文字数が60文字以内である必要があります（LINE Messaging APIの制限）
                </p>
                <div className="flex items-center gap-2">
                  <p className={`text-xs ${newRow.template.length > 60 ? 'text-red-600 font-semibold' : newRow.template.length > 50 ? 'text-orange-600' : 'text-gray-600'}`}>
                    テンプレート文字数: {newRow.template.length} / 60
                    {newRow.template.length <= 60 && ` (残り ${60 - newRow.template.length} 文字)`}
                  </p>
                  {newRow.template.length > 60 && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600">
                      <WarningIcon className="h-3 w-3" />
                      <span>変数置換後の文字数が60文字以内である必要があります</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={newRow.isActive}
                onChange={(e) =>
                  setNewRow({ ...newRow, isActive: e.target.checked })
                }
              />
              有効
            </label>
          </div>
          <div className="mt-4">
            <button
              onClick={() => createTemplate().catch((e) => setError(String(e)))}
              className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
            >
              作成
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow lg:p-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">一覧</h2>
          {loading ? (
            <div className="py-10 text-center text-gray-500">読み込み中...</div>
          ) : templates.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              テンプレートがありません
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((t) => {
                const isEditing = editingId === t.id;
                const view = isEditing ? (editRow as any) : t;
                return (
                  <div key={t.id} className="rounded-md border border-gray-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-gray-800">
                        {t.code}{" "}
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                            t.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {t.isActive ? "有効" : "無効"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() =>
                                saveEdit().catch((e) =>
                                  setError(e instanceof Error ? e.message : String(e))
                                )
                              }
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                            >
                              保存
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-md bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
                            >
                              キャンセル
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(t)}
                              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => deleteTemplate(t).catch(() => {})}
                              className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                            >
                              削除
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600">
                          テンプレート識別コード
                          <span className="ml-1 text-xs text-gray-400">（ガチャ設定で選択する際に使用）</span>
                        </label>
                        <input
                          disabled={!isEditing}
                          value={String(view.code ?? "")}
                          onChange={(e) =>
                            setEditRow({ ...editRow, code: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600">
                          説明
                        </label>
                        <input
                          disabled={!isEditing}
                          value={String(view.description ?? "")}
                          onChange={(e) =>
                            setEditRow({ ...editRow, description: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-50"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-gray-600">
                          本文
                        </label>
                        <textarea
                          disabled={!isEditing}
                          value={isEditing ? String(editRow.template ?? view.template ?? "") : String(view.template ?? "")}
                          onChange={(e) =>
                            setEditRow({ ...editRow, template: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 font-mono disabled:bg-gray-50"
                          rows={8}
                        />
                        {isEditing && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-500">
                              ※ 変数置換後の文字数が60文字以内である必要があります（LINE Messaging APIの制限）
                            </p>
                            <p className={`text-xs ${(editRow.template ?? view.template ?? "").length > 60 ? 'text-red-600 font-semibold' : (editRow.template ?? view.template ?? "").length > 50 ? 'text-orange-600' : 'text-gray-600'}`}>
                              テンプレート文字数: {(editRow.template ?? view.template ?? "").length} / 60
                              {(editRow.template ?? view.template ?? "").length <= 60 && ` (残り ${60 - (editRow.template ?? view.template ?? "").length} 文字)`}
                            </p>
                            {(editRow.template ?? view.template ?? "").length > 60 && (
                              <p className="mt-1 inline-flex items-center gap-1 text-xs text-red-600">
                                <WarningIcon className="h-3 w-3" />
                                <span>変数置換後の文字数が60文字以内である必要があります</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          disabled={!isEditing}
                          checked={!!view.isActive}
                          onChange={(e) =>
                            setEditRow({ ...editRow, isActive: e.target.checked })
                          }
                        />
                        有効
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {confirm?.isOpen && (
          <ConfirmModal
            isOpen={confirm.isOpen}
            title={confirm.title}
            message={confirm.message}
            confirmText={confirm.confirmText}
            variant={confirm.variant}
            changes={confirm.changes}
            onConfirm={async () => {
              try {
                await confirm.onConfirm();
                closeConfirm();
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
                closeConfirm();
              }
            }}
            onCancel={closeConfirm}
          />
        )}

        <VariableInfoModal
          isOpen={showVariableInfo}
          onClose={() => setShowVariableInfo(false)}
        />
    </div>
  );
}





"use client";

import { useEffect, useState } from "react";
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
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
  const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;
  const sanitizeTemplateCode = (value: string) =>
    value.replace(/[^A-Za-z0-9_-]/g, "");

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

  const truncateText = (value: string | null | undefined, max = 32) => {
    if (!value) return "未設定";
    if (value.length <= max) return value;
    return `${value.slice(0, max)}...`;
  };

  const createTemplate = async () => {
    setError(null);
    setSuccess(null);
    const code = newRow.code.trim();
    const template = newRow.template;
    if (!code) return setError("code は必須です");
    if (!CODE_PATTERN.test(code)) {
      return setError(
        "テンプレート識別コードは英数字/ハイフン/アンダースコアのみ使用できます"
      );
    }
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
    if (!next.code || !CODE_PATTERN.test(String(next.code))) {
      return setError(
        "テンプレート識別コードは英数字/ハイフン/アンダースコアのみ使用できます"
      );
    }

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
                <span className="ml-2 text-sm font-medium text-gray-600">（ガチャ設定で選択する際に使用）</span>
              </label>
              <input
                value={newRow.code}
                onChange={(e) =>
                  setNewRow({
                    ...newRow,
                    code: sanitizeTemplateCode(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="例: default, premium-result"
                inputMode="text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={80}
              />
              <p className="mt-2 text-sm font-medium text-gray-600">
                英数字/ハイフン/アンダースコアのみ使用できます
              </p>
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVariableInfo(true)}
                    className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-blue-600 text-base font-bold leading-none shadow-sm transition-colors hover:bg-blue-50"
                    aria-label="変数の詳細を見る"
                    title="変数の詳細を見る"
                  >
                    ?
                  </button>
                  <p className="text-xs text-gray-600">
                    使用可能な変数: {"{itemName}"} / {"{rarity}"} / {"{rarityEmoji}"} / {"{gachaTypeName}"} / {"{handName}"} / {"{grantedPoints}"} / {"{grantedPointsMessage}"}
                  </p>
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
                const isExpanded = expandedId === t.id;
                const view = isEditing ? (editRow as any) : t;
                return (
                  <div key={t.id} className="rounded-md border border-gray-200 p-4">
                    {!isEditing ? (
                      <>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(260px,1.2fr)_auto] md:items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold text-gray-900">
                                {t.code}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  t.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {t.isActive ? "有効" : "無効"}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 text-sm text-gray-600">
                            説明: {truncateText(t.description)}
                          </div>
                          <div className="flex items-center gap-2 md:justify-end">
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : t.id)
                              }
                              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                            >
                              詳細
                            </button>
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
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-4 space-y-3 rounded-md bg-gray-50 p-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-600">
                                説明
                              </p>
                              <p className="mt-1 text-sm text-gray-800">
                                {t.description || "未設定"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600">
                                本文
                              </p>
                              <pre className="mt-1 max-h-52 overflow-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-800">
                                {t.template}
                              </pre>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-gray-800">
                            {t.code} を編集中
                          </div>
                          <div className="flex gap-2">
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
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600">
                              テンプレート識別コード
                              <span className="ml-1 text-sm font-medium text-gray-500">（ガチャ設定で選択する際に使用）</span>
                            </label>
                            <input
                              value={String(view.code ?? "")}
                              onChange={(e) =>
                                setEditRow({
                                  ...editRow,
                                  code: sanitizeTemplateCode(e.target.value),
                                })
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                              inputMode="text"
                              autoCapitalize="off"
                              autoCorrect="off"
                              spellCheck={false}
                              maxLength={80}
                            />
                            <p className="mt-1 text-sm font-medium text-gray-600">
                              英数字/ハイフン/アンダースコアのみ使用できます
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">
                              説明
                            </label>
                            <input
                              value={String(view.description ?? "")}
                              onChange={(e) =>
                                setEditRow({ ...editRow, description: e.target.value })
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                            />
                          </div>
                          <div className="lg:col-span-2">
                            <label className="block text-xs font-medium text-gray-600">
                              本文
                            </label>
                            <textarea
                              value={String(editRow.template ?? view.template ?? "")}
                              onChange={(e) =>
                                setEditRow({ ...editRow, template: e.target.value })
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 font-mono"
                              rows={8}
                            />
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
                          </div>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={!!view.isActive}
                              onChange={(e) =>
                                setEditRow({ ...editRow, isActive: e.target.checked })
                              }
                            />
                            有効
                          </label>
                        </div>
                      </>
                    )}
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

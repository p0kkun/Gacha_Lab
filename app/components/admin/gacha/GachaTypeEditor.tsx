"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Alert, Badge, Button, Card } from "@/components/admin/ui";
import Tooltip from "@/components/admin/ui/Tooltip";
import WeightExplanationModal from "@/components/admin/WeightExplanationModal";

type EditorMode = "create" | "edit";
type HandRank =
  | "ROYAL_FLUSH"
  | "STRAIGHT_FLUSH"
  | "FOUR_OF_A_KIND"
  | "FULL_HOUSE"
  | "FLUSH"
  | "STRAIGHT"
  | "THREE_OF_A_KIND"
  | "TWO_PAIR"
  | "ONE_PAIR"
  | "HIGH_CARD";

const handRankOptions: { value: HandRank; label: string }[] = [
  { value: "ROYAL_FLUSH", label: "ロイヤルフラッシュ" },
  { value: "STRAIGHT_FLUSH", label: "ストレートフラッシュ" },
  { value: "FOUR_OF_A_KIND", label: "フォーカード" },
  { value: "FULL_HOUSE", label: "フルハウス" },
  { value: "FLUSH", label: "フラッシュ" },
  { value: "STRAIGHT", label: "ストレート" },
  { value: "THREE_OF_A_KIND", label: "スリーカード" },
  { value: "TWO_PAIR", label: "ツーペア" },
  { value: "ONE_PAIR", label: "ワンペア" },
  { value: "HIGH_CARD", label: "ハイカード" },
];

type GachaType = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  iconImageUrl: string | null;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  pointCost: number;
  prizeWeights?: Record<string, number>;
  prizeHands?: Record<string, HandRank[]>;
  prizeOrder?: string[];
  rarityVideoIds: Record<string, number[]> | null;
  useDefaultVideos?: boolean;
  resultMessageTemplateId?: number | null;
  tierWeights?: Array<{
    tierCode: string;
    weight: number;
    displayOrder: number;
    isActive: boolean;
  }>;
};

type ResultMessageTemplate = {
  id: number;
  code: string;
  template: string;
  isActive: boolean;
};

type GachaVideo = {
  id: number;
  videoType: "COMMON" | "RARITY";
  rarity: string | null;
  fileName: string;
  isActive: boolean;
  categories?: string[];
};

type PrizeTier = {
  code: string;
  label: string;
  isActive: boolean;
  displayOrder: number;
};

export function GachaTypeEditor({
  mode,
  initialCode,
}: {
  mode: EditorMode;
  initialCode?: string;
}) {
  const POINT_COST_MIN = 0;
  const POINT_COST_MAX = 1000000;
  const TIER_WEIGHT_MIN = 0;
  const TIER_WEIGHT_MAX = 1000000;

  const router = useRouter();
  const code = initialCode ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [videos, setVideos] = useState<GachaVideo[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<ResultMessageTemplate[]>([]);
  const [prizeTiers, setPrizeTiers] = useState<PrizeTier[]>([]);
  const [showHandSettings, setShowHandSettings] = useState(false);
  const [showWeightExplanation, setShowWeightExplanation] = useState(false);
  const [formData, setFormData] = useState<Partial<GachaType>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>("");
  const [tiersToAdd, setTiersToAdd] = useState<string[]>([]);
  const iconInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  const activeTiers = useMemo(
    () =>
      [...prizeTiers]
        .filter((t) => t.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [prizeTiers]
  );

  const selectedTierCodes = useMemo(
    () => formData.prizeOrder || [],
    [formData.prizeOrder]
  );

  const selectedTiers = useMemo(
    () => selectedTierCodes.map((code) => activeTiers.find((t) => t.code === code)).filter(Boolean) as PrizeTier[],
    [selectedTierCodes, activeTiers]
  );

  const availableTiersForAdd = useMemo(
    () => activeTiers.filter((tier) => !selectedTierCodes.includes(tier.code)),
    [activeTiers, selectedTierCodes]
  );

  const getTierLabel = (tierCode: string) =>
    activeTiers.find((t) => t.code === tierCode)?.label ?? tierCode;

  const toDatetimeLocalValue = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getDefaultPrizeOrder = (): string[] => activeTiers.map((t) => t.code);

  const hasAnyHands = (hands?: Record<string, HandRank[]>): boolean => {
    if (!hands) return false;
    return Object.values(hands).some((v) => (v || []).length > 0);
  };

  const getPrizeConfigs = (): Array<{ rarity: string; weight: number; hands: HandRank[] }> => {
    const order = selectedTierCodes;
    const weights = formData.prizeWeights || {};
    const hands = formData.prizeHands || {};
    return order.map((rarity) => ({
      rarity,
      weight: Number(weights[rarity] ?? 0),
      hands: hands[rarity] ?? [],
    }));
  };

  const totalWeight = useMemo(
    () => getPrizeConfigs().reduce((sum, c) => sum + (Number(c.weight) || 0), 0),
    [formData.prizeOrder, formData.prizeWeights, formData.prizeHands]
  );

  const getWeightRate = (weight: number) => {
    if (!Number.isFinite(weight) || weight <= 0 || totalWeight <= 0) return 0;
    return (weight / totalWeight) * 100;
  };

  const updatePrizeConfig = (
    rarity: string,
    updates: { weight?: number; hands?: HandRank[] }
  ) => {
    const nextWeights = { ...(formData.prizeWeights || {}) };
    const nextHands = { ...(formData.prizeHands || {}) };
    if (updates.weight !== undefined) nextWeights[rarity] = updates.weight;
    if (updates.hands !== undefined) nextHands[rarity] = updates.hands;
    setFormData({ ...formData, prizeWeights: nextWeights, prizeHands: nextHands });
  };

  const addTiersToGacha = (tierCodes: string[]) => {
    const uniqueTargets = tierCodes.filter(
      (tierCode, index) =>
        !!tierCode &&
        tierCodes.indexOf(tierCode) === index &&
        !selectedTierCodes.includes(tierCode)
    );
    if (uniqueTargets.length === 0) return;
    const nextOrder = [...selectedTierCodes, ...uniqueTargets];
    const nextWeights = { ...(formData.prizeWeights || {}) };
    const nextHands = { ...(formData.prizeHands || {}) };
    for (const tierCode of uniqueTargets) {
      if (nextWeights[tierCode] === undefined) nextWeights[tierCode] = 0;
      if (nextHands[tierCode] === undefined) nextHands[tierCode] = [];
    }
    setFormData({
      ...formData,
      prizeOrder: nextOrder,
      prizeWeights: nextWeights,
      prizeHands: nextHands,
    });
    setTiersToAdd([]);
  };

  const removeTierFromGacha = (tierCode: string) => {
    if (!selectedTierCodes.includes(tierCode)) return;
    const nextOrder = selectedTierCodes.filter((code) => code !== tierCode);
    const nextWeights = { ...(formData.prizeWeights || {}) };
    const nextHands = { ...(formData.prizeHands || {}) };
    const nextVideoIds = {
      ...((formData.rarityVideoIds || {}) as Record<string, number[]>),
    };
    delete nextWeights[tierCode];
    delete nextHands[tierCode];
    delete nextVideoIds[tierCode];
    setFormData({
      ...formData,
      prizeOrder: nextOrder,
      prizeWeights: nextWeights,
      prizeHands: nextHands,
      rarityVideoIds: nextVideoIds,
    });
  };

  const insertMarkdownLink = () => {
    const textarea = descriptionRef.current;
    if (!textarea) return;
    const url = window.prompt("リンクURLを入力してください", "https://");
    if (!url) return;
    const selectedText =
      textarea.value.slice(textarea.selectionStart, textarea.selectionEnd) || "リンクテキスト";
    const markdownLink = `[${selectedText}](${url})`;
    const nextValue =
      textarea.value.slice(0, textarea.selectionStart) +
      markdownLink +
      textarea.value.slice(textarea.selectionEnd);
    setFormData({ ...formData, description: nextValue });
    setTimeout(() => {
      const pos = (textarea.selectionStart || 0) + markdownLink.length;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [videoRes, templateRes, tierRes] = await Promise.all([
          fetch("/api/admin/videos"),
          fetch("/api/admin/result-message-templates"),
          fetch("/api/admin/prize-tiers"),
        ]);

        const fetchedTiers: PrizeTier[] = tierRes.ok
          ? ((await tierRes.json()).tiers || [])
          : [];
        const sortedActiveTiers = [...fetchedTiers]
          .filter((t) => t.isActive)
          .sort((a, b) => a.displayOrder - b.displayOrder);
        const defaultOrder = sortedActiveTiers.map((t) => t.code);

        setPrizeTiers(fetchedTiers);
        if (videoRes.ok) setVideos((await videoRes.json()).videos || []);
        if (templateRes.ok) setMessageTemplates((await templateRes.json()).templates || []);

        if (mode === "edit") {
          if (!code) throw new Error("編集対象が指定されていません");
          const gachaRes = await fetch(`/api/admin/gacha-types/${code}`);
          if (gachaRes.status === 401) {
            sessionStorage.removeItem("admin_authenticated");
            router.push("/admin");
            return;
          }
          const gachaData = await gachaRes.json();
          if (!gachaRes.ok) {
            throw new Error(gachaData.error || "ガチャ詳細の取得に失敗しました");
          }
          const gachaType: GachaType = gachaData.gachaType;

          let prizeWeights = gachaType.prizeWeights || {};
          let prizeHands = gachaType.prizeHands || {};
          let prizeOrder = gachaType.prizeOrder || defaultOrder;

          if (Array.isArray(gachaType.tierWeights) && gachaType.tierWeights.length > 0) {
            prizeOrder = gachaType.tierWeights
              .filter((x) => x.isActive)
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((x) => x.tierCode);
            prizeWeights = {};
            for (const row of gachaType.tierWeights) {
              if (row.isActive) prizeWeights[row.tierCode] = row.weight;
            }
          }

          for (const tier of defaultOrder) {
            if (prizeWeights[tier] === undefined) prizeWeights[tier] = 0;
            if (!prizeHands[tier]) prizeHands[tier] = [];
          }

          setFormData({
            ...gachaType,
            rarityVideoIds: gachaType.rarityVideoIds || {},
            useDefaultVideos: gachaType.useDefaultVideos ?? true,
            prizeOrder,
            prizeWeights,
            prizeHands,
            resultMessageTemplateId: gachaType.resultMessageTemplateId ?? null,
          });
          setShowHandSettings(hasAnyHands(prizeHands));
          setImagePreview(gachaType.iconImageUrl || null);
          setSelectedImageName("");
          setTiersToAdd([]);
        } else {
          setFormData({
            code: "",
            name: "",
            description: "",
            isActive: true,
            pointCost: 0,
            startAt: null,
            endAt: null,
            rarityVideoIds: {},
            prizeWeights: {},
            prizeHands: {},
            prizeOrder: [],
            resultMessageTemplateId: null,
            useDefaultVideos: true,
          });
          setShowHandSettings(false);
          setImagePreview(null);
          setSelectedImageName("");
          setTiersToAdd([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [code, mode, router]);

  const handleImageUpload = async (file: File) => {
    if (!formData.code) {
      setError("ガチャ識別名を入力してから画像をアップロードしてください");
      return;
    }
    try {
      setUploadingImage(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("gachaTypeId", formData.code);
      const res = await fetch("/api/admin/gacha-types/upload-icon", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "画像のアップロードに失敗しました");
      setFormData({ ...formData, iconImageUrl: data.imageUrl });
      setImagePreview(data.imageUrl);
      setSelectedImageName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像アップロードに失敗しました");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      setError("ガチャ識別名とガチャ名は必須です");
      return;
    }

    if (selectedTierCodes.length === 0) {
      setError("このガチャで使用する等級を1つ以上追加してください");
      return;
    }

    const rarityVideoIds = (formData.rarityVideoIds as Record<string, number[]>) || {};
    if (formData.useDefaultVideos === false) {
      const missing = selectedTiers
        .filter((t) => (rarityVideoIds[t.code] || []).length === 0)
        .map((t) => t.label);
      if (missing.length > 0) {
        setError(`以下の等級の動画が未設定です: ${missing.join("、")}`);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        ...formData,
        rarityVideoIds:
          formData.useDefaultVideos === false
            ? (() => {
                const filtered = Object.fromEntries(
                  Object.entries(
                    ((formData.rarityVideoIds || {}) as Record<string, number[]>)
                  ).filter(([tierCode]) => selectedTierCodes.includes(tierCode))
                );
                return Object.keys(filtered).length > 0 ? filtered : null;
              })()
            : null,
        prizeWeights: formData.prizeWeights || null,
        prizeHands: showHandSettings ? formData.prizeHands || null : null,
        prizeOrder: formData.prizeOrder || null,
        tierWeights: (formData.prizeWeights || null),
        tierOrder: (formData.prizeOrder || null),
        resultMessageTemplateId: formData.resultMessageTemplateId ?? null,
        useDefaultVideos: formData.useDefaultVideos ?? true,
      };

      const res = await fetch("/api/admin/gacha-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存に失敗しました");
      setSuccess("保存しました");
      if (mode === "create") {
        router.replace(`/admin/gacha-types/${formData.code}/edit`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 text-gray-600">読み込み中...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1400px] p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "create" ? "ガチャ新規作成" : "ガチャ編集"}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {mode === "create"
                ? "新しいガチャを作成します"
                : `${formData.name} (${formData.code})`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => router.push("/admin/gacha?tab=gacha-types")}>
              一覧へ戻る
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={saving} disabled={saving}>
              保存
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-4" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <Card title="基本設定">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">ガチャ識別名</label>
                <input
                  type="text"
                  value={formData.code || ""}
                  disabled={mode === "edit"}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.trim().toLowerCase() })
                  }
                  placeholder="例: normal-gacha"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 disabled:bg-gray-100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">名前</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">説明</label>
                  <Button type="button" variant="secondary" size="sm" onClick={insertMarkdownLink}>
                    リンク挿入
                  </Button>
                </div>
                <textarea
                  ref={descriptionRef}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-500">Markdown形式のリンク: [テキスト](URL)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">開始日時（任意）</label>
                <input
                  type="datetime-local"
                  value={toDatetimeLocalValue(formData.startAt)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      startAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">終了日時（任意）</label>
                <input
                  type="datetime-local"
                  value={toDatetimeLocalValue(formData.endAt)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      endAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">ポイントコスト</label>
                <input
                  type="number"
                  min={POINT_COST_MIN}
                  max={POINT_COST_MAX}
                  value={formData.pointCost ?? 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pointCost: Math.min(
                        POINT_COST_MAX,
                        Math.max(POINT_COST_MIN, Number(e.target.value || 0))
                      ),
                    })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {POINT_COST_MIN.toLocaleString()}〜{POINT_COST_MAX.toLocaleString()}で入力してください
                </p>
              </div>
              <div className="flex items-end gap-3">
                <label className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span className="text-sm">有効</span>
                </label>
                <Badge variant={formData.isActive ? "success" : "gray"}>
                  {formData.isActive ? "有効" : "無効"}
                </Badge>
              </div>
            </div>
          </Card>

          <Card title="アイコン画像">
            <div className="space-y-3">
              {imagePreview ? (
                <img src={imagePreview} alt="icon" className="h-24 w-24 rounded border border-gray-300 object-cover" />
              ) : (
                <div className="text-sm text-gray-500">未設定</div>
              )}
              <input
                ref={iconInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void handleImageUpload(file);
                }}
                disabled={uploadingImage}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? "アップロード中..." : "画像を選択"}
                </Button>
                <span className="max-w-[320px] truncate text-sm text-gray-600">
                  {selectedImageName || "ファイル未選択"}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                対応形式: PNG / JPG / GIF / WEBP
              </p>
              {uploadingImage && <div className="text-sm text-gray-500">アップロード中...</div>}
            </div>
          </Card>

          <Card title="結果メッセージテンプレート">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">テンプレート</label>
                <select
                  value={formData.resultMessageTemplateId ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      resultMessageTemplateId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                >
                  <option value="">default（デフォルト）</option>
                  {messageTemplates
                    .filter((t) => t.isActive)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">プレビュー</label>
                <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">
                  {messageTemplates.find((t) => t.id === formData.resultMessageTemplateId)?.template ||
                    "{rarityEmoji} {itemName}\nレアリティ: {rarity}\n{grantedPointsMessage}"}
                </pre>
              </div>
            </div>
          </Card>

          <Card title="動画設定">
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2">
                <input
                  type="checkbox"
                  checked={formData.useDefaultVideos !== false}
                  onChange={(e) =>
                    setFormData({ ...formData, useDefaultVideos: e.target.checked })
                  }
                />
                <span className="text-sm">デフォルト動画を使用</span>
              </label>

              {formData.useDefaultVideos === false && (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {selectedTiers.map((tier) => {
                    const tierVideos = videos.filter((v) => {
                      const isRarityVideo =
                        v.videoType === "RARITY" ||
                        (Array.isArray(v.categories) && v.categories.includes("TIER"));
                      return v.isActive && isRarityVideo;
                    });
                    const selected = ((formData.rarityVideoIds || {}) as Record<string, number[]>)[
                      tier.code
                    ] || [];
                    return (
                      <div key={tier.code} className="rounded-md border border-gray-200 p-3">
                        <div className="mb-2 text-sm font-semibold text-gray-800">{tier.label}</div>
                        {tierVideos.length === 0 ? (
                          <div className="text-xs text-red-600">利用可能な動画がありません</div>
                        ) : (
                          <div className="max-h-36 space-y-1 overflow-auto">
                            {tierVideos.map((video) => (
                              <label key={video.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selected.includes(video.id)}
                                  onChange={(e) => {
                                    const current = ((formData.rarityVideoIds || {}) as Record<
                                      string,
                                      number[]
                                    >)[tier.code] || [];
                                    const next = e.target.checked
                                      ? [...current, video.id]
                                      : current.filter((id) => id !== video.id);
                                    setFormData({
                                      ...formData,
                                      rarityVideoIds: {
                                        ...((formData.rarityVideoIds || {}) as Record<string, number[]>),
                                        [tier.code]: next,
                                      },
                                    });
                                  }}
                                />
                                <span className="truncate">{video.fileName}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedTiers.length === 0 && (
                    <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                      先に「等級設定」でこのガチャに等級を追加してください。
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card title="等級設定">
            <div className="space-y-3">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <label className="mb-2 block text-xs font-medium text-gray-700">
                  このガチャで使用する等級
                </label>
                <div className="space-y-2">
                  {availableTiersForAdd.length > 0 ? (
                    <div className="max-h-28 space-y-1 overflow-auto rounded-md border border-gray-200 bg-white p-2">
                      {availableTiersForAdd.map((tier) => (
                        <label key={tier.code} className="flex items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={tiersToAdd.includes(tier.code)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTiersToAdd((prev) => [...prev, tier.code]);
                              } else {
                                setTiersToAdd((prev) => prev.filter((code) => code !== tier.code));
                              }
                            }}
                          />
                          <span>{tier.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
                      追加できる等級はありません
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={tiersToAdd.length === 0}
                      onClick={() => addTiersToGacha(tiersToAdd)}
                    >
                      選択した等級を追加
                    </Button>
                    <span className="text-xs text-gray-500">
                      {tiersToAdd.length} 件選択中
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  ここで追加した等級だけが、このガチャの抽選対象になります。
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">重みの説明</span>
                <Tooltip
                  position="top"
                  content={
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">重みによる抽選の仕組み</p>
                      <p className="text-xs">重みは当たりやすさの比率です。</p>
                      <p className="text-xs">重みの合計を100にする必要はありません。</p>
                    </div>
                  }
                >
                  <button
                    type="button"
                    onClick={() => setShowWeightExplanation(true)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 hover:bg-blue-200"
                    aria-label="重み設定の説明を見る"
                  >
                    ?
                  </button>
                </Tooltip>
              </div>
              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                合計重み: <span className="font-semibold">{totalWeight}</span>
              </div>
              <label className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2">
                <input
                  type="checkbox"
                  checked={showHandSettings}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowHandSettings(checked);
                    if (!checked) setFormData({ ...formData, prizeHands: {} });
                  }}
                />
                <span className="text-sm">役を設定する（任意）</span>
              </label>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {getPrizeConfigs().map((config) => (
                  <div key={config.rarity} className="rounded-md border border-gray-200 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-gray-900">{getTierLabel(config.rarity)}</div>
                        <div className="text-xs font-semibold text-gray-700">
                          確率: {getWeightRate(config.weight).toFixed(2)}%
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => removeTierFromGacha(config.rarity)}
                      >
                        このガチャから外す
                      </Button>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">重み</label>
                      <input
                        type="number"
                        min={TIER_WEIGHT_MIN}
                        max={TIER_WEIGHT_MAX}
                        value={config.weight}
                        onChange={(e) =>
                          updatePrizeConfig(config.rarity, {
                            weight: Math.min(
                              TIER_WEIGHT_MAX,
                              Math.max(TIER_WEIGHT_MIN, Number(e.target.value || 0))
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {TIER_WEIGHT_MIN.toLocaleString()}〜{TIER_WEIGHT_MAX.toLocaleString()}
                      </p>
                    </div>
                    {showHandSettings && (
                      <div className="mt-2 max-h-32 space-y-1 overflow-auto rounded-md border border-gray-200 p-2">
                        {handRankOptions.map((h) => (
                          <label key={h.value} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={config.hands.includes(h.value)}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...config.hands, h.value]
                                  : config.hands.filter((x) => x !== h.value);
                                updatePrizeConfig(config.rarity, { hands: next });
                              }}
                            />
                            <span>{h.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {getPrizeConfigs().length === 0 && (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    等級が未設定です。「等級を追加」から抽選対象の等級を追加してください。
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
      <WeightExplanationModal
        isOpen={showWeightExplanation}
        onClose={() => setShowWeightExplanation(false)}
        title="重みによる抽選の仕組み"
      />
    </AdminLayout>
  );
}

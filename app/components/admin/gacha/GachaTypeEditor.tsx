"use client";

import { useEffect, useMemo, useState } from "react";
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

  const activeTiers = useMemo(
    () =>
      [...prizeTiers]
        .filter((t) => t.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [prizeTiers]
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
    const order = formData.prizeOrder || getDefaultPrizeOrder();
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
        } else {
          const initialPrizeWeights: Record<string, number> = {};
          const initialPrizeHands: Record<string, HandRank[]> = {};
          for (const tier of defaultOrder) {
            initialPrizeWeights[tier] = 0;
            initialPrizeHands[tier] = [];
          }
          setFormData({
            code: "",
            name: "",
            description: "",
            isActive: true,
            pointCost: 0,
            startAt: null,
            endAt: null,
            rarityVideoIds: {},
            prizeWeights: initialPrizeWeights,
            prizeHands: initialPrizeHands,
            prizeOrder: defaultOrder,
            resultMessageTemplateId: null,
            useDefaultVideos: true,
          });
          setShowHandSettings(false);
          setImagePreview(null);
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

    const rarityVideoIds = (formData.rarityVideoIds as Record<string, number[]>) || {};
    if (formData.useDefaultVideos === false) {
      const missing = activeTiers
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
          formData.useDefaultVideos === false &&
          formData.rarityVideoIds &&
          Object.keys(formData.rarityVideoIds as Record<string, number[]>).length > 0
            ? formData.rarityVideoIds
            : null,
        prizeWeights: formData.prizeWeights || null,
        prizeHands: showHandSettings ? formData.prizeHands || null : null,
        prizeOrder: formData.prizeOrder || null,
        tierWeights: formData.prizeWeights || null,
        tierOrder: formData.prizeOrder || null,
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
                <label className="text-sm font-medium text-gray-700">説明</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
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
                  min={0}
                  max={1000000}
                  value={formData.pointCost ?? 0}
                  onChange={(e) =>
                    setFormData({ ...formData, pointCost: Math.max(0, Number(e.target.value || 0)) })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
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
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                disabled={uploadingImage}
                className="block w-full text-sm text-gray-900"
              />
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
                  {activeTiers.map((tier) => {
                    const tierVideos = videos.filter(
                      (v) => v.isActive && v.videoType === "RARITY" && v.rarity === tier.code
                    );
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
                </div>
              )}
            </div>
          </Card>

          <Card title="等級設定">
            <div className="space-y-3">
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
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium text-gray-900">{getTierLabel(config.rarity)}</div>
                      <div className="text-xs font-semibold text-gray-700">
                        確率: {getWeightRate(config.weight).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">重み</label>
                      <input
                        type="number"
                        min={0}
                        max={1000000}
                        value={config.weight}
                        onChange={(e) =>
                          updatePrizeConfig(config.rarity, {
                            weight: Math.max(0, Number(e.target.value || 0)),
                          })
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                      />
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

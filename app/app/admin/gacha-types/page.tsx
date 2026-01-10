"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button, Select, Card, Alert, Badge, PageHeader, Input } from "@/components/admin/ui";
import VariableInfoModal from "@/components/admin/VariableInfoModal";
import { getAdminAuthToken } from "@/lib/admin-auth";
import MultiVideoPlayer from "@/components/MultiVideoPlayer";

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

const getHandName = (hand: HandRank | null | undefined): string => {
  if (!hand) return "未設定";
  const option = handRankOptions.find((opt) => opt.value === hand);
  return option ? option.label : hand;
};

const getHandNames = (hands: HandRank[] | null | undefined): string => {
  if (!hands || hands.length === 0) return "未設定";
  return hands.map((hand) => getHandName(hand)).join("、");
};

type PrizeConfig = {
  rarity: string; // "FIRST_PRIZE", "SECOND_PRIZE", etc. or "LOSER"
  weight: number;
  hands: HandRank[];
};

type GachaType = {
  id: number; // 内部ID（DB）
  code: string; // 外部参照用コード（例: "normal"）
  name: string;
  description: string | null;
  iconImageUrl: string | null;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  pointCost: number;
  firstPrizeWeight: number;
  secondPrizeWeight: number;
  thirdPrizeWeight: number;
  fourthPrizeWeight: number;
  fifthPrizeWeight: number;
  loserWeight: number;
  firstPrizeHands: HandRank[];
  secondPrizeHands: HandRank[];
  thirdPrizeHands: HandRank[];
  fourthPrizeHands: HandRank[];
  fifthPrizeHands: HandRank[];
  // 動的等級設定
  prizeWeights?: Record<string, number>;
  prizeHands?: Record<string, HandRank[]>;
  prizeOrder?: string[];
  // 正: 等級確率テーブル（APIで返す）
  tierWeights?: Array<{
    tierCode: string;
    weight: number;
    displayOrder: number;
    isActive: boolean;
  }>;
  commonVideoIds: number[];
  rarityVideoIds: Record<string, number[]> | null;
  useDefaultVideos?: boolean;
  resultMessageTemplateId?: number | null;
  createdAt: string;
  updatedAt: string;
};

type ResultMessageTemplate = {
  id: number;
  code: string;
  description: string | null;
  isActive: boolean;
  template: string;
};

type GachaVideo = {
  id: number;
  videoType: "COMMON" | "RARITY";
  rarity: string | null;
  fileName: string;
  s3Url: string;
  isActive: boolean;
};

const RARITY_LABELS: Record<string, string> = {
  FIRST_PRIZE: "1等",
  SECOND_PRIZE: "2等",
  THIRD_PRIZE: "3等",
  FOURTH_PRIZE: "4等",
  FIFTH_PRIZE: "5等",
  LOSER: "ハズレ",
};

export default function GachaTypesPage() {
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<GachaType>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [filterIsActive, setFilterIsActive] = useState<string>("");
  const [filterIsOngoing, setFilterIsOngoing] = useState<string>("");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "pointCost">(
    "createdAt"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [videos, setVideos] = useState<GachaVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState<ResultMessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [prizeTiers, setPrizeTiers] = useState<Array<{ code: string; label: string; isActive: boolean }>>([]);
  const [loadingPrizeTiers, setLoadingPrizeTiers] = useState(false);
  const [showAddPrizeModal, setShowAddPrizeModal] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    gachaTypeCode: string;
    gachaTypeName: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewVideoUrls, setPreviewVideoUrls] = useState<string[]>([]);
  const [previewRarity, setPreviewRarity] = useState<string>("FIRST_PRIZE");
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationCount, setSimulationCount] = useState<number>(1000);
  const [showVariableInfo, setShowVariableInfo] = useState(false);
  const [simulationResults, setSimulationResults] = useState<{
    results: Array<{
      rarity: string;
      count: number;
      expectedWeight: number;
      expectedRate: string;
      actualRate: string;
      difference: string;
    }>;
    simulationCount: number;
    totalWeight: number;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [saving, setSaving] = useState(false);

  // デフォルトメッセージテンプレート（未設定時の表示用）
  const DEFAULT_MESSAGE_TEMPLATE = `🎰 ガチャ結果

{rarityEmoji} {itemName}
レアリティ: {rarity}
ガチャタイプ: {gachaTypeName}

🃏 ポーカーハンド: {handName}

おめでとうございます！🎉`;

  const toDatetimeLocalValue = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  // 動的等級管理用のヘルパー関数
  const getDefaultPrizeOrder = (): string[] => {
    return [
      "FIRST_PRIZE",
      "SECOND_PRIZE",
      "THIRD_PRIZE",
      "FOURTH_PRIZE",
      "FIFTH_PRIZE",
      "LOSER",
    ];
  };

  const getPrizeConfigs = (
    gachaType: GachaType | Partial<GachaType>
  ): PrizeConfig[] => {
    const prizeOrder = gachaType.prizeOrder || getDefaultPrizeOrder();
    const prizeWeights = gachaType.prizeWeights || {};
    const prizeHands = gachaType.prizeHands || {};

    // 既存のフィールドから移行（後方互換性）
    const legacyWeights: Record<string, number> = {
      FIRST_PRIZE: gachaType.firstPrizeWeight || 0,
      SECOND_PRIZE: gachaType.secondPrizeWeight || 0,
      THIRD_PRIZE: gachaType.thirdPrizeWeight || 0,
      FOURTH_PRIZE: gachaType.fourthPrizeWeight || 0,
      FIFTH_PRIZE: gachaType.fifthPrizeWeight || 0,
      LOSER: gachaType.loserWeight || 0,
    };

    const legacyHands: Record<string, HandRank[]> = {
      FIRST_PRIZE: gachaType.firstPrizeHands || [],
      SECOND_PRIZE: gachaType.secondPrizeHands || [],
      THIRD_PRIZE: gachaType.thirdPrizeHands || [],
      FOURTH_PRIZE: gachaType.fourthPrizeHands || [],
      FIFTH_PRIZE: gachaType.fifthPrizeHands || [],
      LOSER: [],
    };

    return prizeOrder.map((rarity) => ({
      rarity,
      weight: prizeWeights[rarity] ?? legacyWeights[rarity] ?? 0,
      hands: prizeHands[rarity] ?? legacyHands[rarity] ?? [],
    }));
  };

  const updatePrizeConfig = (index: number, updates: Partial<PrizeConfig>) => {
    const currentConfigs = getPrizeConfigs(formData);
    const newConfigs = [...currentConfigs];
    newConfigs[index] = { ...newConfigs[index], ...updates };

    const prizeWeights: Record<string, number> = {};
    const prizeHands: Record<string, HandRank[]> = {};
    const prizeOrder: string[] = [];

    newConfigs.forEach((config) => {
      prizeOrder.push(config.rarity);
      prizeWeights[config.rarity] = config.weight;
      prizeHands[config.rarity] = config.hands;
    });

    setFormData({
      ...formData,
      prizeWeights,
      prizeHands,
      prizeOrder,
    });
  };

  const addPrize = (selectedTierCode?: string) => {
    const currentConfigs = getPrizeConfigs(formData);
    const existingRarities = new Set(currentConfigs.map((c) => c.rarity));

    let newRarity: string;
    if (selectedTierCode) {
      // モーダルから選択された場合
      if (existingRarities.has(selectedTierCode)) {
        setError("この等級は既に追加されています");
        return;
      }
      newRarity = selectedTierCode;
    } else {
      // ボタンクリック時はモーダルを表示
      setShowAddPrizeModal(true);
      return;
    }

    const newConfig: PrizeConfig = {
      rarity: newRarity,
      weight: 0,
      hands: [],
    };

    const newConfigs = [...currentConfigs, newConfig];

    const prizeWeights: Record<string, number> = {};
    const prizeHands: Record<string, HandRank[]> = {};
    const prizeOrder: string[] = [];

    newConfigs.forEach((config) => {
      prizeOrder.push(config.rarity);
      prizeWeights[config.rarity] = config.weight;
      prizeHands[config.rarity] = config.hands;
    });

    setFormData({
      ...formData,
      prizeWeights,
      prizeHands,
      prizeOrder,
    });
    setShowAddPrizeModal(false);
  };

  const removePrize = (index: number) => {
    const currentConfigs = getPrizeConfigs(formData);
    if (currentConfigs.length <= 1) {
      setError("最低1つの等級が必要です");
      return;
    }

    const newConfigs = currentConfigs.filter((_, i) => i !== index);

    const prizeWeights: Record<string, number> = {};
    const prizeHands: Record<string, HandRank[]> = {};
    const prizeOrder: string[] = [];

    newConfigs.forEach((config) => {
      prizeOrder.push(config.rarity);
      prizeWeights[config.rarity] = config.weight;
      prizeHands[config.rarity] = config.hands;
    });

    setFormData({
      ...formData,
      prizeWeights,
      prizeHands,
      prizeOrder,
    });
  };

  const movePrize = (index: number, direction: "up" | "down") => {
    const currentConfigs = getPrizeConfigs(formData);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === currentConfigs.length - 1)
    ) {
      return;
    }

    const newConfigs = [...currentConfigs];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newConfigs[index], newConfigs[targetIndex]] = [
      newConfigs[targetIndex],
      newConfigs[index],
    ];

    const prizeWeights: Record<string, number> = {};
    const prizeHands: Record<string, HandRank[]> = {};
    const prizeOrder: string[] = [];

    newConfigs.forEach((config) => {
      prizeOrder.push(config.rarity);
      prizeWeights[config.rarity] = config.weight;
      prizeHands[config.rarity] = config.hands;
    });

    setFormData({
      ...formData,
      prizeWeights,
      prizeHands,
      prizeOrder,
    });
  };

  useEffect(() => {
    fetchGachaTypes();
    fetchVideos();
    fetchMessageTemplates();
    fetchPrizeTiers();
  }, [filterIsActive, filterIsOngoing, sortBy, sortOrder]);

  const fetchMessageTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/result-message-templates", {
        headers: { "X-Admin-Auth": authToken || "" },
      });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setMessageTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch (e) {
      console.error("テンプレート取得エラー:", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchPrizeTiers = async () => {
    setLoadingPrizeTiers(true);
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/prize-tiers", {
        headers: { "X-Admin-Auth": authToken || "" },
      });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setPrizeTiers(Array.isArray(data.tiers) ? data.tiers.map((t: any) => ({ code: t.code, label: t.label, isActive: t.isActive })) : []);
    } catch (e) {
      console.error("等級マスタ取得エラー:", e);
    } finally {
      setLoadingPrizeTiers(false);
    }
  };

  // 等級コードから表示名を取得（PrizeTierマスタ優先、フォールバックはRARITY_LABELS）
  const getTierLabel = (tierCode: string): string => {
    const tier = prizeTiers.find((t) => t.code === tierCode && t.isActive);
    return tier ? tier.label : (RARITY_LABELS[tierCode] || tierCode);
  };

  const fetchGachaTypes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterIsActive) {
        params.append("isActive", filterIsActive);
      }
      if (filterIsOngoing) {
        params.append("isOngoing", filterIsOngoing);
      }
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/gacha-types?${params}`, {
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
        throw new Error("ガチャタイプ一覧の取得に失敗しました");
      }

      const data = await res.json();
      // rarityVideoIdsがJSON文字列の場合はパース
      const processedGachaTypes = data.gachaTypes.map(
        (
          gt: GachaType & { rarityVideoIds?: string | Record<string, number[]> }
        ) => ({
          ...gt,
          commonVideoIds: gt.commonVideoIds || [],
          rarityVideoIds: gt.rarityVideoIds
            ? typeof gt.rarityVideoIds === "string"
              ? JSON.parse(gt.rarityVideoIds)
              : gt.rarityVideoIds
            : {},
          prizeWeights: gt.prizeWeights
            ? typeof gt.prizeWeights === "string"
              ? JSON.parse(gt.prizeWeights)
              : gt.prizeWeights
            : undefined,
          prizeHands: gt.prizeHands
            ? typeof gt.prizeHands === "string"
              ? JSON.parse(gt.prizeHands)
              : gt.prizeHands
            : undefined,
          prizeOrder: gt.prizeOrder
            ? typeof gt.prizeOrder === "string"
              ? JSON.parse(gt.prizeOrder)
              : gt.prizeOrder
            : undefined,
          // tierWeights がある場合はそれを prizeWeights/prizeOrder に反映（正を優先）
          ...(Array.isArray((gt as any).tierWeights) && (gt as any).tierWeights.length > 0
            ? (() => {
                const rows = [...(gt as any).tierWeights]
                  .filter((r: any) => r && r.isActive !== false)
                  .sort(
                    (a: any, b: any) =>
                      (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
                      String(a.tierCode).localeCompare(String(b.tierCode))
                  );
                const order = rows.map((r: any) => String(r.tierCode));
                const weights: Record<string, number> = {};
                for (const r of rows) {
                  weights[String(r.tierCode)] = Number(r.weight) || 0;
                }
                return { prizeOrder: order, prizeWeights: weights };
              })()
            : {}),
        })
      );
      setGachaTypes(processedGachaTypes);
    } catch (error) {
      console.error("ガチャタイプ取得エラー:", error);
      setError("ガチャタイプ一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    setLoadingVideos(true);
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/videos", {
        headers: {
          "X-Admin-Auth": authToken || "",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error("動画一覧取得エラー:", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleEdit = (gachaType: GachaType) => {
    setEditingCode(gachaType.code);
    // 動的等級設定がない場合は、既存のフィールドから生成
    let prizeWeights = gachaType.prizeWeights;
    let prizeHands = gachaType.prizeHands;
    let prizeOrder = gachaType.prizeOrder;

    if (!prizeOrder || !prizeWeights || !prizeHands) {
      // 既存のフィールドから動的設定を生成
      prizeOrder = getDefaultPrizeOrder();
      prizeWeights = {
        FIRST_PRIZE: gachaType.firstPrizeWeight || 0,
        SECOND_PRIZE: gachaType.secondPrizeWeight || 0,
        THIRD_PRIZE: gachaType.thirdPrizeWeight || 0,
        FOURTH_PRIZE: gachaType.fourthPrizeWeight || 0,
        FIFTH_PRIZE: gachaType.fifthPrizeWeight || 0,
        LOSER: gachaType.loserWeight || 0,
      };
      prizeHands = {
        FIRST_PRIZE: gachaType.firstPrizeHands || [],
        SECOND_PRIZE: gachaType.secondPrizeHands || [],
        THIRD_PRIZE: gachaType.thirdPrizeHands || [],
        FOURTH_PRIZE: gachaType.fourthPrizeHands || [],
        FIFTH_PRIZE: gachaType.fifthPrizeHands || [],
        LOSER: [],
      };
    }

    setFormData({
      ...gachaType,
      commonVideoIds: gachaType.commonVideoIds || [],
      rarityVideoIds: gachaType.rarityVideoIds || {},
      prizeWeights,
      prizeHands,
      prizeOrder,
      resultMessageTemplateId: gachaType.resultMessageTemplateId ?? null,
    });
    setImagePreview(gachaType.iconImageUrl || null);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditingCode(null);
    setFormData({});
    setImagePreview(null);
    setError(null);
    setSuccess(null);
  };

  const handleNewGachaType = () => {
    setEditingCode("__NEW__");
    setFormData({
      code: "",
      name: "",
      description: "",
      isActive: true,
      pointCost: 0,
      startAt: null,
      endAt: null,
      commonVideoIds: [],
      rarityVideoIds: {},
      prizeWeights: {},
      prizeHands: {},
      prizeOrder: [],
      resultMessageTemplateId: null,
      useDefaultVideos: true,
    });
    setImagePreview(null);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (code: string) => {
    setError(null);
    setSuccess(null);
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/gacha-types/${code}`, {
        method: "DELETE",
        headers: { "X-Admin-Auth": authToken || "" },
      });
      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "削除に失敗しました");

      setSuccess(data.message || "ガチャタイプを削除しました");
      setConfirmDeleteModal(null);
      await fetchGachaTypes();
    } catch (error) {
      console.error("削除エラー:", error);
      setError(error instanceof Error ? error.message : "削除に失敗しました");
      setConfirmDeleteModal(null);
    }
  };

  const handlePreview = async () => {
    const commonVideoIds = formData.commonVideoIds || [];
    const rarityVideoIds =
      (formData.rarityVideoIds as Record<string, number[]>) || {};

    if (commonVideoIds.length === 0) {
      setError("共通動画を選択してください");
      return;
    }

    const selectedRarityVideoIds = rarityVideoIds[previewRarity] || [];
    if (selectedRarityVideoIds.length === 0) {
      setError(`${RARITY_LABELS[previewRarity]}の動画を選択してください`);
      return;
    }

    try {
      setError(null);
      // 選択された動画IDから動画URLを取得
      const allVideoIds = [...commonVideoIds, ...selectedRarityVideoIds];
      const selectedVideos = videos.filter((v) => allVideoIds.includes(v.id));

      // 共通動画と等級別動画を分ける（最初に見つかったものを使用）
      const commonVideo = selectedVideos.find(
        (v) => v.videoType === "COMMON" && commonVideoIds.includes(v.id)
      );
      const rarityVideo = selectedVideos.find(
        (v) => v.videoType === "RARITY" && selectedRarityVideoIds.includes(v.id)
      );

      const videoUrls: string[] = [];
      if (commonVideo) {
        videoUrls.push(commonVideo.s3Url);
      }
      if (rarityVideo) {
        videoUrls.push(rarityVideo.s3Url);
      }

      if (videoUrls.length === 0) {
        setError("動画が見つかりません");
        return;
      }

      setPreviewVideoUrls(videoUrls);
      setShowPreview(true);
    } catch (error) {
      console.error("プレビューエラー:", error);
      setError("プレビューの準備に失敗しました");
    }
  };

  const handlePreviewEnd = () => {
    setShowPreview(false);
    setPreviewVideoUrls([]);
  };

  const handleSimulate = async () => {
    if (!formData.code) {
      setError("ガチャタイプcodeが設定されていません");
      return;
    }

    try {
      setSimulating(true);
      setError(null);
      setShowSimulation(true);

      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/gacha-types/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Auth": authToken || "",
        },
        body: JSON.stringify({
          gachaTypeId: formData.code,
          count: simulationCount,
        }),
      });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "シミュレーションに失敗しました");
      }

      const data = await res.json();
      setSimulationResults(data);
    } catch (error) {
      console.error("シミュレーションエラー:", error);
      setError(
        error instanceof Error
          ? error.message
          : "シミュレーションに失敗しました"
      );
    } finally {
      setSimulating(false);
    }
  };

  // アイコン画像をアップロード
  const handleImageUpload = async (file: File) => {
    if (!formData.code) {
      setError("ガチャタイプcodeが設定されていません");
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);

      const formDataToSend = new FormData();
      formDataToSend.append("file", file);
      formDataToSend.append("gachaTypeId", formData.code);

      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/gacha-types/upload-icon", {
        method: "POST",
        headers: {
          "X-Admin-Auth": authToken || "",
        },
        body: formDataToSend,
      });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "画像のアップロードに失敗しました");
      }

      const data = await res.json();
      setFormData({ ...formData, iconImageUrl: data.imageUrl });
      setImagePreview(data.imageUrl);
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
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      setError("codeと名前は必須です");
      return;
    }

    // 動画設定のバリデーション
    const commonVideoIds = formData.commonVideoIds || [];
    const rarityVideoIds =
      (formData.rarityVideoIds as Record<string, number[]>) || {};

    // 共通動画が設定されていない場合
    if (commonVideoIds.length === 0) {
      setError("共通動画を少なくとも1つ選択してください");
      return;
    }

    // 各レアリティの動画が設定されているか確認（あたりの場合のみ）
    const requiredRarities = [
      "FIRST_PRIZE",
      "SECOND_PRIZE",
      "THIRD_PRIZE",
      "FOURTH_PRIZE",
      "FIFTH_PRIZE",
    ];
    const missingRarities: string[] = [];
    for (const rarity of requiredRarities) {
      const rarityVideos = rarityVideoIds[rarity] || [];
      if (rarityVideos.length === 0) {
        missingRarities.push(RARITY_LABELS[rarity]);
      }
    }

    if (missingRarities.length > 0) {
      setError(
        `以下のレアリティの動画が設定されていません: ${missingRarities.join(
          "、"
        )}`
      );
      return;
    }

    // 動画が設定されていない場合はガチャを無効にする
    if (
      formData.isActive &&
      (commonVideoIds.length === 0 || Object.keys(rarityVideoIds).length === 0)
    ) {
      setFormData({ ...formData, isActive: false });
      setError(
        "動画が設定されていないため、ガチャを無効にしました。動画を設定してから有効にしてください。"
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/gacha-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Auth": authToken || "",
        },
        body: JSON.stringify({
          ...formData,
          rarityVideoIds:
            formData.useDefaultVideos === false &&
            Object.keys(rarityVideoIds).length > 0
              ? rarityVideoIds
              : null,
          prizeWeights: formData.prizeWeights || null,
          prizeHands: formData.prizeHands || null,
          prizeOrder: formData.prizeOrder || null,
          // 正: 等級確率テーブルに同期するための入力
          tierWeights: formData.prizeWeights || null,
          tierOrder: formData.prizeOrder || null,
          resultMessageTemplateId: formData.resultMessageTemplateId ?? null,
          useDefaultVideos: formData.useDefaultVideos ?? true,
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
      setEditingCode(null);
      setFormData({});
      await fetchGachaTypes();
    } catch (error) {
      console.error("保存エラー:", error);
      setError(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalWeight = (gachaType: GachaType): number => {
    return (
      gachaType.firstPrizeWeight +
      gachaType.secondPrizeWeight +
      gachaType.thirdPrizeWeight +
      gachaType.fourthPrizeWeight +
      gachaType.fifthPrizeWeight +
      gachaType.loserWeight
    );
  };

  const calculatePercentage = (weight: number, total: number): number => {
    if (total === 0) return 0;
    return (weight / total) * 100;
  };

  return (
    <AdminLayout>
      <div>
        <PageHeader
          title="ガチャ設定"
          description="ガチャタイプの設定と管理を行います"
          actions={
            <Button variant="success" onClick={handleNewGachaType} leftIcon={<span>+</span>}>
              新規ガチャ追加
            </Button>
          }
        />

        {/* フィルターとソート */}
        <Card className="mb-6" padding="md">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              value={filterIsActive}
              onChange={(e) => setFilterIsActive(e.target.value)}
              options={[
                { value: "", label: "すべての状態" },
                { value: "true", label: "有効" },
                { value: "false", label: "無効" },
              ]}
              fullWidth
            />
            <Select
              value={filterIsOngoing}
              onChange={(e) => setFilterIsOngoing(e.target.value)}
              options={[
                { value: "", label: "すべて" },
                { value: "true", label: "開催中" },
                { value: "false", label: "開催中以外" },
              ]}
              fullWidth
            />
            <Select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "createdAt" | "name" | "pointCost")
              }
              options={[
                { value: "createdAt", label: "作成日時" },
                { value: "name", label: "名前" },
                { value: "pointCost", label: "ポイントコスト" },
              ]}
              fullWidth
            />
            <Button
              variant="ghost"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              fullWidth
              title={sortOrder === "asc" ? "昇順" : "降順"}
              rightIcon={
                <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
              }
            >
              ソート: {sortOrder === "asc" ? "昇順" : "降順"}
            </Button>
          </div>
        </Card>

        {error && (
          <Alert variant="error" className="mb-6" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-6" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 新規作成フォーム - 編集フォームと同じ構造を使用 */}
            {editingCode === "__NEW__" && (
              <Card
                title="新規ガチャタイプ"
                scrollable
                maxHeight="calc(100vh - 300px)"
                actions={
                  <div className="flex gap-2">
                    <Button
                      variant="success"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? "保存中..." : "保存"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      キャンセル
                    </Button>
                  </div>
                }
              >
                {/* 新規作成時の編集フォーム - 編集時と同じ構造 */}
                {(() => {
                  const isEditing = true;
                  const displayData = formData;
                  return (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          ガチャの識別名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={displayData.code || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, code: e.target.value })
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                          placeholder="例: normal, premium"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          このガチャをシステム内で区別するための名前です。半角英数字とハイフン（-）、アンダースコア（_）のみ使用できます（例: normal-gacha）。一度設定すると後から変更できません。
                        </p>
                      </div>

                      {/* 以下、編集フォームと同じ構造をコピー */}
                      {(() => {
                        // 編集フォームと同じ内容を新規作成時にも表示
                        const editFormContent = (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                名前
                              </label>
                              <input
                                type="text"
                                value={displayData.name || ""}
                                onChange={(e) =>
                                  setFormData({ ...formData, name: e.target.value })
                                }
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                説明
                              </label>
                              <textarea
                                value={displayData.description || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    description: e.target.value,
                                  })
                                }
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                                rows={2}
                              />
                            </div>

                            {/* アイコン画像アップロード */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                アイコン画像
                              </label>
                              <div className="mt-2 space-y-2">
                                {imagePreview && (
                                  <div className="relative inline-block">
                                    <img
                                      src={imagePreview}
                                      alt="アイコン画像プレビュー"
                                      className="h-24 w-24 rounded object-cover border border-gray-300"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          iconImageUrl: null,
                                        });
                                        setImagePreview(null);
                                      }}
                                      className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                                      type="button"
                                    >
                                      <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                                <div>
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleImageUpload(file);
                                      }
                                    }}
                                    disabled={uploadingImage}
                                    className="block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                                  />
                                  {uploadingImage && (
                                    <p className="mt-1 text-sm text-gray-500">
                                      アップロード中...
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={displayData.isActive ?? true}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      isActive: e.target.checked,
                                    })
                                  }
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                  有効
                                </span>
                              </label>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  開始日時（任意）
                                </label>
                                <input
                                  type="datetime-local"
                                  value={toDatetimeLocalValue(displayData.startAt)}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      startAt: e.target.value
                                        ? new Date(e.target.value).toISOString()
                                        : null,
                                    })
                                  }
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                  未設定の場合は開始日時の制限なし
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  終了日時（任意）
                                </label>
                                <input
                                  type="datetime-local"
                                  value={toDatetimeLocalValue(displayData.endAt)}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      endAt: e.target.value
                                        ? new Date(e.target.value).toISOString()
                                        : null,
                                    })
                                  }
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                  未設定の場合は終了日時の制限なし
                                </p>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                ポイントコスト
                              </label>
                              <input
                                type="number"
                                value={displayData.pointCost ?? 0}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    pointCost: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                                min="0"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                ガチャ実行に必要なポイント数（0の場合は無料）
                              </p>
                            </div>
                          </>
                        );
                        return editFormContent;
                      })()}
                    </div>
                  );
                })()}
              </Card>
            )}
            {gachaTypes.map((gachaType) => {
              const isEditing = editingCode === gachaType.code;
              const totalWeight = calculateTotalWeight(gachaType);
              const displayData = isEditing ? formData : gachaType;

              return (
                <Card
                  key={gachaType.id}
                  title={gachaType.name}
                  scrollable={isEditing}
                  maxHeight={isEditing ? "calc(100vh - 300px)" : undefined}
                  actions={
                    !isEditing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={gachaType.isActive ? "success" : "gray"}>
                          {gachaType.isActive ? "有効" : "無効"}
                        </Badge>
                        <Button variant="primary" size="sm" onClick={() => handleEdit(gachaType)}>
                          編集
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setConfirmDeleteModal({
                              isOpen: true,
                              gachaTypeCode: gachaType.code,
                              gachaTypeName: gachaType.name,
                            });
                          }}
                        >
                          削除
                        </Button>
                      </div>
                    ) : undefined
                  }
                >

                  {gachaType.description && (
                    <p className="mb-4 text-sm text-gray-600">
                      {gachaType.description}
                    </p>
                  )}

                  {/* 動画設定の表示 */}
                  {!isEditing && (
                    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-2 text-sm font-medium text-gray-700">
                        動画設定
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div>
                          共通動画:{" "}
                          {gachaType.commonVideoIds &&
                          gachaType.commonVideoIds.length > 0
                            ? `${gachaType.commonVideoIds.length}個設定済み`
                            : "未設定"}
                        </div>
                        <div>
                          等級別動画:{" "}
                          {gachaType.rarityVideoIds &&
                          Object.keys(gachaType.rarityVideoIds).length > 0
                            ? `${
                                Object.keys(gachaType.rarityVideoIds).length
                              }レアリティ設定済み`
                            : "未設定"}
                        </div>
                        {(!gachaType.commonVideoIds ||
                          gachaType.commonVideoIds.length === 0 ||
                          !gachaType.rarityVideoIds ||
                          Object.keys(gachaType.rarityVideoIds).length ===
                            0) && (
                          <div className="mt-2 text-xs text-red-600">
                            ⚠️
                            動画が設定されていないため、ガチャを有効にできません
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mb-4 grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2">
                    {gachaType.startAt && (
                      <div>
                        <span className="font-medium">開始日時:</span>{" "}
                        {new Date(gachaType.startAt).toLocaleString("ja-JP")}
                      </div>
                    )}
                    {gachaType.endAt && (
                      <div>
                        <span className="font-medium">終了日時:</span>{" "}
                        {new Date(gachaType.endAt).toLocaleString("ja-JP")}
                      </div>
                    )}
                    {!gachaType.startAt && !gachaType.endAt && (
                      <div className="text-gray-400">期間制限なし</div>
                    )}
                    <div>
                      <span className="font-medium">ポイントコスト:</span>{" "}
                      {gachaType.pointCost > 0
                        ? `${gachaType.pointCost.toLocaleString()}ポイント`
                        : "無料"}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          名前
                        </label>
                        <input
                          type="text"
                          value={displayData.name || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          説明
                        </label>
                        <textarea
                          value={displayData.description || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                          rows={2}
                        />
                      </div>

                      {/* アイコン画像アップロード */}
                      {isEditing && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            アイコン画像
                          </label>
                          <div className="mt-2 space-y-2">
                            {imagePreview && (
                              <div className="relative inline-block">
                                <img
                                  src={imagePreview}
                                  alt="アイコン画像プレビュー"
                                  className="h-24 w-24 rounded object-cover border border-gray-300"
                                  onError={(e) => {
                                    // 画像読み込みエラー時は非表示
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      iconImageUrl: null,
                                    });
                                    setImagePreview(null);
                                  }}
                                  className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                                  type="button"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            )}
                            <div>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleImageUpload(file);
                                  }
                                }}
                                disabled={uploadingImage}
                                className="block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                              />
                              {uploadingImage && (
                                <p className="mt-1 text-sm text-gray-500">
                                  アップロード中...
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={displayData.isActive ?? true}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                isActive: e.target.checked,
                              })
                            }
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            有効
                          </span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            開始日時（任意）
                          </label>
                          <input
                            type="datetime-local"
                            value={
                              toDatetimeLocalValue(displayData.startAt)
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                startAt: e.target.value
                                  ? new Date(e.target.value).toISOString()
                                  : null,
                              })
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            未設定の場合は開始日時の制限なし
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            終了日時（任意）
                          </label>
                          <input
                            type="datetime-local"
                            value={
                              toDatetimeLocalValue(displayData.endAt)
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                endAt: e.target.value
                                  ? new Date(e.target.value).toISOString()
                                  : null,
                              })
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            未設定の場合は終了日時の制限なし
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          ポイントコスト
                        </label>
                        <input
                          type="number"
                          value={displayData.pointCost ?? 0}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pointCost: parseInt(e.target.value) || 0,
                            })
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                          min="0"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          ガチャ実行に必要なポイント数（0の場合は無料）
                        </p>
                      </div>

                      {/* 結果送信メッセージテンプレート */}
                      <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <label className="block text-sm font-medium text-gray-700">
                          LINE結果送信メッセージテンプレート
                        </label>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600">
                              テンプレート
                            </label>
                            <select
                              value={formData.resultMessageTemplateId ?? ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  resultMessageTemplateId: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                })
                              }
                              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                              disabled={loadingTemplates}
                            >
                              <option value="">
                                （未設定: デフォルトを使用）
                              </option>
                              {messageTemplates
                                .filter((t) => t.isActive)
                                .map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.code}
                                    {t.description ? `（${t.description}）` : ""}
                                  </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-600">
                              編集/追加は「結果メッセージテンプレート」画面で行います。
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600">
                              プレビュー（参考）
                            </label>
                            <textarea
                              readOnly
                              value={
                                messageTemplates.find(
                                  (t) => t.id === formData.resultMessageTemplateId
                                )?.template || DEFAULT_MESSAGE_TEMPLATE
                              }
                              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 font-mono"
                              rows={8}
                            />
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">使用可能な変数:</p>
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
                          <ul className="list-disc list-inside space-y-0.5 ml-2">
                            <li>
                              <code className="bg-white px-1 rounded">
                                {"{itemName}"}
                              </code>{" "}
                              - アイテム名
                            </li>
                            <li>
                              <code className="bg-white px-1 rounded">
                                {"{rarity}"}
                              </code>{" "}
                              - 等級ラベル（1等、2等など）
                            </li>
                            <li>
                              <code className="bg-white px-1 rounded">
                                {"{rarityEmoji}"}
                              </code>{" "}
                              - 等級の絵文字
                            </li>
                            <li>
                              <code className="bg-white px-1 rounded">
                                {"{gachaTypeName}"}
                              </code>{" "}
                              - ガチャタイプ名
                            </li>
                            <li>
                              <code className="bg-white px-1 rounded">
                                {"{handName}"}
                              </code>{" "}
                              -
                              ポーカーハンド名（役が設定されている場合のみ表示）
                            </li>
                          </ul>
                          <p className="mt-2 text-xs text-gray-500">
                            注: 手札とコミュニティカードの変数は使用されません。
                          </p>
                          <p className="mt-2 text-gray-500">
                            上記がデフォルトメッセージです。カスタマイズする場合は編集してください。
                          </p>
                        </div>
                      </div>

                      {/* ガチャ動画設定 */}
                      <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-800">
                            ガチャ動画設定
                          </h3>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData.useDefaultVideos ?? true}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  useDefaultVideos: e.target.checked,
                                })
                              }
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              デフォルト動画を使用
                            </span>
                          </label>
                        </div>
                        <p className="text-sm text-gray-600">
                          {formData.useDefaultVideos !== false
                            ? "デフォルト動画を使用します。個別設定する場合は「デフォルト動画を使用」のチェックを外してください。"
                            : "共通動画と各レアリティの当たり判定動画を設定してください。設定されていない場合はガチャを有効にできません。"}
                        </p>

                        {/* 共通動画選択 */}
                        {formData.useDefaultVideos === false && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              共通動画（前半部分）
                              <span className="text-red-500">*</span>
                            </label>
                            <p className="mb-2 text-xs text-gray-500">
                              複数選択可能。ランダムで1つが再生されます。
                            </p>
                            {loadingVideos ? (
                              <div className="text-sm text-gray-500">
                                読み込み中...
                              </div>
                            ) : (
                              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-300 bg-white p-2">
                                {videos
                                  .filter(
                                    (v) =>
                                      v.videoType === "COMMON" && v.isActive
                                  )
                                  .map((video) => (
                                    <label
                                      key={video.id}
                                      className="flex items-center gap-2 rounded p-2 hover:bg-gray-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={(
                                          formData.commonVideoIds || []
                                        ).includes(video.id)}
                                        onChange={(e) => {
                                          const currentIds =
                                            formData.commonVideoIds || [];
                                          const newIds = e.target.checked
                                            ? [...currentIds, video.id]
                                            : currentIds.filter(
                                                (id) => id !== video.id
                                              );
                                          setFormData({
                                            ...formData,
                                            commonVideoIds: newIds,
                                          });
                                        }}
                                        className="rounded border-gray-300"
                                      />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {video.fileName}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {video.videoType === "COMMON"
                                            ? "共通"
                                            : "等級別"}
                                        </div>
                                      </div>
                                    </label>
                                  ))}
                                {videos.filter(
                                  (v) => v.videoType === "COMMON" && v.isActive
                                ).length === 0 && (
                                  <div className="py-4 text-center text-sm text-gray-500">
                                    共通動画が登録されていません
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 等級別動画選択 */}
                        {formData.useDefaultVideos === false && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              等級別動画（後半部分・当たり判定）
                              <span className="text-red-500">*</span>
                            </label>
                            <p className="mb-2 text-xs text-gray-500">
                              各レアリティごとに複数選択可能。ランダムで1つが再生されます。
                            </p>
                            {[
                              "FIRST_PRIZE",
                              "SECOND_PRIZE",
                              "THIRD_PRIZE",
                              "FOURTH_PRIZE",
                              "FIFTH_PRIZE",
                              "LOSER",
                            ].map((rarity) => (
                              <div key={rarity} className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  {RARITY_LABELS[rarity]}
                                </label>
                                {loadingVideos ? (
                                  <div className="text-sm text-gray-500">
                                    読み込み中...
                                  </div>
                                ) : (
                                  <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border border-gray-300 bg-white p-2">
                                    {videos
                                      .filter(
                                        (v) =>
                                          v.videoType === "RARITY" &&
                                          v.rarity === rarity &&
                                          v.isActive
                                      )
                                      .map((video) => (
                                        <label
                                          key={video.id}
                                          className="flex items-center gap-2 rounded p-2 hover:bg-gray-50"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={
                                              ((formData.rarityVideoIds as Record<
                                                string,
                                                number[]
                                              >) || {})[rarity]?.includes(
                                                video.id
                                              ) || false
                                            }
                                            onChange={(e) => {
                                              const currentRarityIds =
                                                ((formData.rarityVideoIds as Record<
                                                  string,
                                                  number[]
                                                >) || {})[rarity] || [];
                                              const newRarityIds = e.target
                                                .checked
                                                ? [
                                                    ...currentRarityIds,
                                                    video.id,
                                                  ]
                                                : currentRarityIds.filter(
                                                    (id) => id !== video.id
                                                  );
                                              setFormData({
                                                ...formData,
                                                rarityVideoIds: {
                                                  ...((formData.rarityVideoIds as Record<
                                                    string,
                                                    number[]
                                                  >) || {}),
                                                  [rarity]: newRarityIds,
                                                },
                                              });
                                            }}
                                            className="rounded border-gray-300"
                                          />
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">
                                              {video.fileName}
                                            </div>
                                          </div>
                                        </label>
                                      ))}
                                    {videos.filter(
                                      (v) =>
                                        v.videoType === "RARITY" &&
                                        v.rarity === rarity &&
                                        v.isActive
                                    ).length === 0 && (
                                      <div className="py-2 text-center text-xs text-gray-500">
                                        {RARITY_LABELS[rarity]}
                                        の動画が登録されていません
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* プレビューボタン */}
                        {formData.useDefaultVideos === false && (
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={handlePreview}
                              disabled={
                                !formData.commonVideoIds ||
                                formData.commonVideoIds.length === 0 ||
                                !formData.rarityVideoIds ||
                                Object.keys(
                                  formData.rarityVideoIds as Record<
                                    string,
                                    number[]
                                  >
                                ).length === 0
                              }
                              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              プレビュー
                            </button>
                            <select
                              value={previewRarity}
                              onChange={(e) => setPreviewRarity(e.target.value)}
                              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                            >
                              {[
                                "FIRST_PRIZE",
                                "SECOND_PRIZE",
                                "THIRD_PRIZE",
                                "FOURTH_PRIZE",
                                "FIFTH_PRIZE",
                              ].map((rarity) => (
                                <option key={rarity} value={rarity}>
                                  {RARITY_LABELS[rarity]}でプレビュー
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* 動的等級設定 */}
                      <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-800">
                            等級設定
                          </h3>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSimulate}
                              disabled={simulating}
                              className="rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              {simulating
                                ? "シミュレーション中..."
                                : "シミュレーション"}
                            </button>
                            <button
                              type="button"
                              onClick={addPrize}
                              className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                            >
                              + 等級を追加
                            </button>
                          </div>
                        </div>

                        {/* シミュレーション設定 */}
                        {showSimulation && (
                          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-purple-800">
                                シミュレーション設定
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSimulation(false);
                                  setSimulationResults(null);
                                }}
                                className="text-sm text-purple-600 hover:text-purple-800"
                              >
                                閉じる
                              </button>
                            </div>
                            <div className="mb-3 flex items-center gap-2">
                              <label className="text-sm text-purple-700">
                                実行回数:
                              </label>
                              <input
                                type="number"
                                value={simulationCount}
                                onChange={(e) =>
                                  setSimulationCount(
                                    Math.min(
                                      Math.max(
                                        parseInt(e.target.value) || 1000,
                                        1
                                      ),
                                      100000
                                    )
                                  )
                                }
                                className="w-32 rounded-md border border-purple-300 px-3 py-1 text-sm text-gray-900"
                                min="1"
                                max="100000"
                              />
                              <span className="text-xs text-purple-600">
                                (1〜100,000回)
                              </span>
                            </div>
                            {simulationResults && (
                              <div className="mt-4 rounded-lg border border-purple-200 bg-white p-4">
                                <h5 className="mb-3 text-sm font-semibold text-purple-800">
                                  シミュレーション結果 (
                                  {simulationResults.simulationCount}回)
                                </h5>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-purple-100">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-purple-800">
                                          等級
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-purple-800">
                                          出現回数
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-purple-800">
                                          設定重み
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-purple-800">
                                          期待確率
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-purple-800">
                                          実際確率
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-purple-800">
                                          差分
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-purple-100">
                                      {simulationResults.results.map(
                                        (result, index: number) => (
                                          <tr
                                            key={index}
                                            className="hover:bg-purple-50"
                                          >
                                            <td className="px-3 py-2 text-gray-900">
                                              {getTierLabel(result.rarity)}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-900">
                                              {result.count.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-600">
                                              {result.expectedWeight}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-600">
                                              {result.expectedRate}%
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                                              {result.actualRate}%
                                            </td>
                                            <td
                                              className={`px-3 py-2 text-right ${
                                                Math.abs(
                                                  parseFloat(result.difference)
                                                ) < 1
                                                  ? "text-green-600"
                                                  : "text-red-600"
                                              }`}
                                            >
                                              {parseFloat(result.difference) > 0
                                                ? "+"
                                                : ""}
                                              {result.difference}%
                                            </td>
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {getPrizeConfigs(displayData).map((config, index) => {
                          const otherWeights = getPrizeConfigs(displayData)
                            .filter((_, i) => i !== index)
                            .reduce((sum, c) => sum + (c.weight || 0), 0);

                          return (
                            <div
                              key={`${config.rarity}-${index}`}
                              className="rounded-lg border border-gray-300 bg-white p-4"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    {getTierLabel(config.rarity)}
                                    の重み
                                  </label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => movePrize(index, "up")}
                                    disabled={index === 0}
                                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="上に移動"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => movePrize(index, "down")}
                                    disabled={
                                      index ===
                                      getPrizeConfigs(displayData).length - 1
                                    }
                                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="下に移動"
                                  >
                                    ↓
                                  </button>
                                  {getPrizeConfigs(displayData).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removePrize(index)}
                                      className="rounded-md bg-red-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600"
                                    >
                                      削除
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <input
                                  type="number"
                                  value={config.weight || 0}
                                  onChange={(e) =>
                                    updatePrizeConfig(index, {
                                      weight: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                                  min="0"
                                />
                                <p className="text-xs text-gray-500">
                                  他の重みの合計:{" "}
                                  {otherWeights.toLocaleString()}
                                </p>
                                <label className="block text-sm font-medium text-gray-700">
                                  {getTierLabel(config.rarity)}
                                  に対応する役（任意・複数選択可）
                                </label>
                                <p className="mb-2 text-xs text-gray-500">
                                  役を設定しない場合は、結果送信時に役の情報は送信されません。
                                </p>
                                <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                                  {handRankOptions.map((option) => (
                                    <label
                                      key={option.value}
                                      className="flex items-center gap-2 py-1"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={config.hands.includes(
                                          option.value
                                        )}
                                        onChange={(e) => {
                                          const currentHands =
                                            config.hands || [];
                                          const newHands = e.target.checked
                                            ? [...currentHands, option.value]
                                            : currentHands.filter(
                                                (h) => h !== option.value
                                              );
                                          updatePrizeConfig(index, {
                                            hands: newHands,
                                          });
                                        }}
                                        className="rounded border-gray-300"
                                      />
                                      <span className="text-sm text-gray-700">
                                        {option.label}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 既存の固定表示（非表示、後方互換性のため残す） */}
                      <div className="space-y-6 hidden">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              1等の重み（旧形式）
                            </label>
                            <input
                              type="number"
                              value={displayData.firstPrizeWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  firstPrizeWeight:
                                    parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                              min="0"
                            />
                            <p className="text-xs text-gray-500">
                              他の重みの合計:{" "}
                              {(
                                (displayData.secondPrizeWeight || 0) +
                                (displayData.thirdPrizeWeight || 0) +
                                (displayData.fourthPrizeWeight || 0) +
                                (displayData.fifthPrizeWeight || 0) +
                                (displayData.loserWeight || 0)
                              ).toLocaleString()}
                            </p>
                            <label className="block text-sm font-medium text-gray-700">
                              1等に対応する役（複数選択可）
                            </label>
                            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                              {handRankOptions.map((option) => (
                                <label
                                  key={option.value}
                                  className="flex items-center gap-2 py-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(
                                      displayData.firstPrizeHands || []
                                    ).includes(option.value)}
                                    onChange={(e) => {
                                      const currentHands =
                                        displayData.firstPrizeHands || [];
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          firstPrizeHands: [
                                            ...currentHands,
                                            option.value,
                                          ],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          firstPrizeHands: currentHands.filter(
                                            (h) => h !== option.value
                                          ),
                                        });
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {option.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              2等の重み
                            </label>
                            <input
                              type="number"
                              value={displayData.secondPrizeWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  secondPrizeWeight:
                                    parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                              min="0"
                            />
                            <p className="text-xs text-gray-500">
                              他の重みの合計:{" "}
                              {(
                                (displayData.firstPrizeWeight || 0) +
                                (displayData.thirdPrizeWeight || 0) +
                                (displayData.fourthPrizeWeight || 0) +
                                (displayData.fifthPrizeWeight || 0) +
                                (displayData.loserWeight || 0)
                              ).toLocaleString()}
                            </p>
                            <label className="block text-sm font-medium text-gray-700">
                              2等に対応する役（複数選択可）
                            </label>
                            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                              {handRankOptions.map((option) => (
                                <label
                                  key={option.value}
                                  className="flex items-center gap-2 py-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(
                                      displayData.secondPrizeHands || []
                                    ).includes(option.value)}
                                    onChange={(e) => {
                                      const currentHands =
                                        displayData.secondPrizeHands || [];
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          secondPrizeHands: [
                                            ...currentHands,
                                            option.value,
                                          ],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          secondPrizeHands: currentHands.filter(
                                            (h) => h !== option.value
                                          ),
                                        });
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {option.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              3等の重み
                            </label>
                            <input
                              type="number"
                              value={displayData.thirdPrizeWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  thirdPrizeWeight:
                                    parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                              min="0"
                            />
                            <p className="text-xs text-gray-500">
                              他の重みの合計:{" "}
                              {(
                                (displayData.firstPrizeWeight || 0) +
                                (displayData.secondPrizeWeight || 0) +
                                (displayData.fourthPrizeWeight || 0) +
                                (displayData.fifthPrizeWeight || 0) +
                                (displayData.loserWeight || 0)
                              ).toLocaleString()}
                            </p>
                            <label className="block text-sm font-medium text-gray-700">
                              3等に対応する役（複数選択可）
                            </label>
                            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                              {handRankOptions.map((option) => (
                                <label
                                  key={option.value}
                                  className="flex items-center gap-2 py-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(
                                      displayData.thirdPrizeHands || []
                                    ).includes(option.value)}
                                    onChange={(e) => {
                                      const currentHands =
                                        displayData.thirdPrizeHands || [];
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          thirdPrizeHands: [
                                            ...currentHands,
                                            option.value,
                                          ],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          thirdPrizeHands: currentHands.filter(
                                            (h) => h !== option.value
                                          ),
                                        });
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {option.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              4等の重み
                            </label>
                            <input
                              type="number"
                              value={displayData.fourthPrizeWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  fourthPrizeWeight:
                                    parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                              min="0"
                            />
                            <p className="text-xs text-gray-500">
                              他の重みの合計:{" "}
                              {(
                                (displayData.firstPrizeWeight || 0) +
                                (displayData.secondPrizeWeight || 0) +
                                (displayData.thirdPrizeWeight || 0) +
                                (displayData.fifthPrizeWeight || 0) +
                                (displayData.loserWeight || 0)
                              ).toLocaleString()}
                            </p>
                            <label className="block text-sm font-medium text-gray-700">
                              4等に対応する役（複数選択可）
                            </label>
                            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                              {handRankOptions.map((option) => (
                                <label
                                  key={option.value}
                                  className="flex items-center gap-2 py-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(
                                      displayData.fourthPrizeHands || []
                                    ).includes(option.value)}
                                    onChange={(e) => {
                                      const currentHands =
                                        displayData.fourthPrizeHands || [];
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          fourthPrizeHands: [
                                            ...currentHands,
                                            option.value,
                                          ],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          fourthPrizeHands: currentHands.filter(
                                            (h) => h !== option.value
                                          ),
                                        });
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {option.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              5等の重み
                            </label>
                            <input
                              type="number"
                              value={displayData.fifthPrizeWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  fifthPrizeWeight:
                                    parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                              min="0"
                            />
                            <p className="text-xs text-gray-500">
                              他の重みの合計:{" "}
                              {(
                                (displayData.firstPrizeWeight || 0) +
                                (displayData.secondPrizeWeight || 0) +
                                (displayData.thirdPrizeWeight || 0) +
                                (displayData.fourthPrizeWeight || 0) +
                                (displayData.loserWeight || 0)
                              ).toLocaleString()}
                            </p>
                            <label className="block text-sm font-medium text-gray-700">
                              5等に対応する役（複数選択可）
                            </label>
                            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2">
                              {handRankOptions.map((option) => (
                                <label
                                  key={option.value}
                                  className="flex items-center gap-2 py-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(
                                      displayData.fifthPrizeHands || []
                                    ).includes(option.value)}
                                    onChange={(e) => {
                                      const currentHands =
                                        displayData.fifthPrizeHands || [];
                                      if (e.target.checked) {
                                        setFormData({
                                          ...formData,
                                          fifthPrizeHands: [
                                            ...currentHands,
                                            option.value,
                                          ],
                                        });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          fifthPrizeHands: currentHands.filter(
                                            (h) => h !== option.value
                                          ),
                                        });
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {option.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              ハズレの重み
                            </label>
                            <input
                              type="number"
                              value={displayData.loserWeight || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  loserWeight: parseInt(e.target.value) || 0,
                                })
                              }
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                              min="0"
                            />
                            <p className="text-xs text-gray-500">
                              他の重みの合計:{" "}
                              {(
                                (displayData.firstPrizeWeight || 0) +
                                (displayData.secondPrizeWeight || 0) +
                                (displayData.thirdPrizeWeight || 0) +
                                (displayData.fourthPrizeWeight || 0) +
                                (displayData.fifthPrizeWeight || 0)
                              ).toLocaleString()}
                            </p>
                            <div className="rounded-md bg-gray-50 p-3">
                              <p className="text-xs text-gray-600">
                                💡
                                ハズレは、上位の当たり（1等〜5等）に設定されていない役すべてが対象になります。
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="primary" onClick={handleSave} isLoading={saving} disabled={saving}>
                          保存
                        </Button>
                        <Button variant="ghost" onClick={handleCancel}>
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4 text-sm text-gray-600">
                        重みの合計: {totalWeight}
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-md bg-gray-50 p-3 lg:p-4">
                          <div className="text-xs font-medium text-gray-700 lg:text-sm">
                            1等
                          </div>
                          <div className="mt-1 text-base font-semibold text-gray-800 lg:text-lg">
                            {gachaType.firstPrizeWeight} (
                            {calculatePercentage(
                              gachaType.firstPrizeWeight,
                              totalWeight
                            ).toFixed(1)}
                            %)
                          </div>
                          <div className="mt-2 text-xs text-gray-600 lg:text-sm">
                            役:{" "}
                            <span className="font-medium">
                              {gachaType.firstPrizeHands &&
                              gachaType.firstPrizeHands.length > 0
                                ? getHandNames(gachaType.firstPrizeHands)
                                : "未設定"}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-md bg-gray-50 p-3 lg:p-4">
                          <div className="text-xs font-medium text-gray-700 lg:text-sm">
                            2等
                          </div>
                          <div className="mt-1 text-base font-semibold text-gray-800 lg:text-lg">
                            {gachaType.secondPrizeWeight} (
                            {calculatePercentage(
                              gachaType.secondPrizeWeight,
                              totalWeight
                            ).toFixed(1)}
                            %)
                          </div>
                          <div className="mt-2 text-xs text-gray-600 lg:text-sm">
                            役:{" "}
                            <span className="font-medium">
                              {gachaType.secondPrizeHands &&
                              gachaType.secondPrizeHands.length > 0
                                ? getHandNames(gachaType.secondPrizeHands)
                                : "未設定"}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-md bg-gray-50 p-3 lg:p-4">
                          <div className="text-xs font-medium text-gray-700 lg:text-sm">
                            3等
                          </div>
                          <div className="mt-1 text-base font-semibold text-gray-800 lg:text-lg">
                            {gachaType.thirdPrizeWeight} (
                            {calculatePercentage(
                              gachaType.thirdPrizeWeight,
                              totalWeight
                            ).toFixed(1)}
                            %)
                          </div>
                          <div className="mt-2 text-xs text-gray-600 lg:text-sm">
                            役:{" "}
                            <span className="font-medium">
                              {gachaType.thirdPrizeHands &&
                              gachaType.thirdPrizeHands.length > 0
                                ? getHandNames(gachaType.thirdPrizeHands)
                                : "未設定"}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-md bg-gray-50 p-3 lg:p-4">
                          <div className="text-xs font-medium text-gray-700 lg:text-sm">
                            4等
                          </div>
                          <div className="mt-1 text-base font-semibold text-gray-800 lg:text-lg">
                            {gachaType.fourthPrizeWeight} (
                            {calculatePercentage(
                              gachaType.fourthPrizeWeight,
                              totalWeight
                            ).toFixed(1)}
                            %)
                          </div>
                          <div className="mt-2 text-xs text-gray-600 lg:text-sm">
                            役:{" "}
                            <span className="font-medium">
                              {gachaType.fourthPrizeHands &&
                              gachaType.fourthPrizeHands.length > 0
                                ? getHandNames(gachaType.fourthPrizeHands)
                                : "未設定"}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-md bg-gray-50 p-3 lg:p-4">
                          <div className="text-xs font-medium text-gray-700 lg:text-sm">
                            5等
                          </div>
                          <div className="mt-1 text-base font-semibold text-gray-800 lg:text-lg">
                            {gachaType.fifthPrizeWeight} (
                            {calculatePercentage(
                              gachaType.fifthPrizeWeight,
                              totalWeight
                            ).toFixed(1)}
                            %)
                          </div>
                          <div className="mt-2 text-xs text-gray-600 lg:text-sm">
                            役:{" "}
                            <span className="font-medium">
                              {gachaType.fifthPrizeHands &&
                              gachaType.fifthPrizeHands.length > 0
                                ? getHandNames(gachaType.fifthPrizeHands)
                                : "未設定"}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-md bg-gray-50 p-3 lg:p-4">
                          <div className="text-xs font-medium text-gray-700 lg:text-sm">
                            ハズレ
                          </div>
                          <div className="mt-1 text-base font-semibold text-gray-800 lg:text-lg">
                            {gachaType.loserWeight} (
                            {calculatePercentage(
                              gachaType.loserWeight,
                              totalWeight
                            ).toFixed(1)}
                            %)
                          </div>
                          <div className="mt-2 text-xs text-gray-600 lg:text-sm">
                            役:{" "}
                            <span className="font-medium">
                              {(() => {
                                // 上位の当たりに設定されている役を取得
                                const assignedHands = new Set([
                                  ...(gachaType.firstPrizeHands || []),
                                  ...(gachaType.secondPrizeHands || []),
                                  ...(gachaType.thirdPrizeHands || []),
                                  ...(gachaType.fourthPrizeHands || []),
                                  ...(gachaType.fifthPrizeHands || []),
                                ]);
                                // すべての役から、設定されている役を除外
                                const loserHands = handRankOptions
                                  .map((opt) => opt.value)
                                  .filter((hand) => !assignedHands.has(hand));
                                return loserHands.length > 0
                                  ? getHandNames(loserHands)
                                  : "なし（すべての役が当たりに設定されています）";
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 変数情報モーダル */}
      <VariableInfoModal
        isOpen={showVariableInfo}
        onClose={() => setShowVariableInfo(false)}
      />

      {/* 削除確認モーダル */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 backdrop-blur-sm transition-opacity"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
            onClick={() => setConfirmDeleteModal(null)}
          />
          {/* モーダル */}
          <div 
            className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-red-600">ガチャタイプを削除</h3>
            <p className="mb-4 text-sm text-gray-700">
              「{confirmDeleteModal.gachaTypeName}」を削除しますか？
              <br />
              <span className="text-xs text-gray-500">
                使用中の場合は削除できず、無効化されます。
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDeleteModal(null)}>
                キャンセル
              </Button>
              <Button variant="danger" onClick={() => handleDelete(confirmDeleteModal.gachaTypeCode)}>
                削除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 等級追加モーダル */}
      {showAddPrizeModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 backdrop-blur-sm transition-opacity"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
            onClick={() => setShowAddPrizeModal(false)}
          />
          {/* モーダル */}
          <div 
            className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-800">等級を追加</h3>
            <p className="mb-4 text-sm text-gray-600">
              追加する等級を選択してください
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {prizeTiers
                .filter((t) => t.isActive)
                .filter((t) => {
                  const currentConfigs = getPrizeConfigs(formData);
                  const existingRarities = new Set(currentConfigs.map((c) => c.rarity));
                  return !existingRarities.has(t.code);
                })
                .map((tier) => (
                  <button
                    key={tier.code}
                    type="button"
                    onClick={() => addPrize(tier.code)}
                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <div className="font-medium">{tier.label}</div>
                    <div className="text-xs text-gray-500">システム識別名: {tier.code}</div>
                  </button>
                ))}
            </div>
            {prizeTiers.filter((t) => t.isActive).filter((t) => {
              const currentConfigs = getPrizeConfigs(formData);
              const existingRarities = new Set(currentConfigs.map((c) => c.rarity));
              return !existingRarities.has(t.code);
            }).length === 0 && (
              <p className="mt-4 text-sm text-gray-500">
                追加できる等級がありません。すべての等級が追加済みです。
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAddPrizeModal(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* プレビューモーダル（実際のガチャ実行時と同じ表示） */}
      {showPreview && previewVideoUrls.length > 0 && (
        <div className="fixed inset-0 z-[60]">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
            onClick={handlePreviewEnd}
          />
          {/* 動画コンテナ */}
          <div 
            className="relative z-10 h-full w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {previewVideoUrls.length > 1 ? (
              <MultiVideoPlayer
                videoUrls={previewVideoUrls}
                onEnd={handlePreviewEnd}
              />
            ) : (
              <div className="relative flex h-full w-full items-center justify-center">
                <video
                  className="h-full w-full object-contain"
                  controls={false}
                  autoPlay
                  muted={false}
                  playsInline
                  onClick={handlePreviewEnd}
                  onEnded={handlePreviewEnd}
                >
                  <source src={previewVideoUrls[0]} type="video/mp4" />
                  お使いのブラウザは動画再生に対応していません。
                </video>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

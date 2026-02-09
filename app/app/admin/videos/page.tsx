"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmModal from "@/components/admin/ConfirmModal";

type GachaVideo = {
  id: number;
  videoType: "COMMON" | "RARITY";
  rarity: string | null;
  s3Url: string;
  s3Key?: string;
  fileName: string;
  fileSize: number;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  categories?: string[];
};

type PrizeTier = {
  code: string;
  label: string;
  isActive: boolean;
  displayOrder: number;
};

export default function VideosPage() {
  const [videos, setVideos] = useState<GachaVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedVideoType, setSelectedVideoType] = useState<
    "COMMON" | "RARITY"
  >("RARITY"); // 共通動画は使用しないため、デフォルトをRARITYに変更
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [prizeTiers, setPrizeTiers] = useState<PrizeTier[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    videoId: number | null;
    usageInfo?: {
      inDefaultSettings: boolean;
      inGachaTypes: Array<{ id: string; name: string }>;
    };
  }>({
    isOpen: false,
    videoId: null,
  });
  const [toggleConfirm, setToggleConfirm] = useState<{
    isOpen: boolean;
    videoId: number | null;
    currentStatus: boolean;
  }>({ isOpen: false, videoId: null, currentStatus: true });
  const [saveDefaultsConfirm, setSaveDefaultsConfirm] = useState(false);
  const [showDefaultSettings, setShowDefaultSettings] = useState(false);
  const [defaultSettings, setDefaultSettings] = useState<{
    id: number | null;
    // commonVideoAssetIds: number[]; // 共通動画は使用しないためコメントアウト
    tierVideoAssetIds: Record<string, number[]> | null;
  } | null>(null);
  const [savedDefaultSettings, setSavedDefaultSettings] = useState<{
    id: number | null;
    // commonVideoAssetIds: number[]; // 共通動画は使用しないためコメントアウト
    tierVideoAssetIds: Record<string, number[]> | null;
  } | null>(null);
  const [loadingDefaultSettings, setLoadingDefaultSettings] = useState(false);
  const [savingDefaultSettings, setSavingDefaultSettings] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);

  // 動画一覧を取得
  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/videos", {
        headers: {

        },
      });

      if (!res.ok) {
        throw new Error("動画一覧の取得に失敗しました");
      }

      const data = await res.json();
      setVideos(data.videos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchPrizeTiers();
  }, []);

  const fetchPrizeTiers = async () => {
    try {
      const res = await fetch("/api/prize-tiers");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tiers)) {
          console.log("[一括設定] 等級マスタ取得:", data.tiers);
          setPrizeTiers(data.tiers);
        } else {
          console.warn("[一括設定] 等級マスタのデータ形式が不正:", data);
        }
      } else {
        console.error("[一括設定] 等級マスタ取得失敗:", res.status);
      }
    } catch (error) {
      console.error("等級マスタ取得エラー:", error);
    }
  };

  // 動画をアップロード
  const handleUpload = async () => {
    if (!uploadFile) {
      setError("ファイルを選択してください");
      return;
    }

    try {
      setUploading(true);
      setError(null);


      // ステップ1: Presigned URLを取得
      const presignedRes = await fetch("/api/admin/videos/presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify({
          fileName: uploadFile.name,
          videoType: selectedVideoType,
          rarity: null, // 等級はガチャ設定側で選択
          contentType: uploadFile.type,
          fileSize: uploadFile.size,
        }),
      });

      if (!presignedRes.ok) {
        const errorData = await presignedRes
          .json()
          .catch(() => ({ error: "Presigned URLの取得に失敗しました" }));
        throw new Error(errorData.error || "Presigned URLの取得に失敗しました");
      }

      const { presignedUrl, s3Key } = await presignedRes.json();

      // ステップ2: 直接S3にアップロード
      let uploadRes: Response;
      try {
        uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": uploadFile.type,
          },
          body: uploadFile,
        });
      } catch (fetchError) {
        console.error("S3アップロードエラー（fetch）:", fetchError);
        const errorMessage =
          fetchError instanceof Error
            ? fetchError.message
            : "S3へのアップロードに失敗しました";
        throw new Error(`S3へのアップロードに失敗しました: ${errorMessage}`);
      }

      if (!uploadRes.ok) {
        const errorText = await uploadRes
          .text()
          .catch(() => uploadRes.statusText);
        console.error("S3アップロードエラー:", {
          status: uploadRes.status,
          statusText: uploadRes.statusText,
          errorText,
          presignedUrl: presignedUrl.substring(0, 100) + "...", // URLの最初の100文字のみログ
        });
        throw new Error(
          `S3へのアップロードに失敗しました: ${uploadRes.status} ${uploadRes.statusText} - ${errorText}`
        );
      }

      // ステップ3: DBに登録
      const registerRes = await fetch("/api/admin/videos/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify({
          s3Key,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          videoType: selectedVideoType,
          rarity: null, // 等級はガチャ設定側で選択
          description: description || null,
        }),
      });

      if (!registerRes.ok) {
        const errorData = await registerRes
          .json()
          .catch(() => ({ error: "動画の登録に失敗しました" }));
        throw new Error(errorData.error || "動画の登録に失敗しました");
      }

      // 成功
      setShowUploadForm(false);
      setUploadFile(null);
      setDescription("");
      await fetchVideos();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "アップロードに失敗しました"
      );
    } finally {
      setUploading(false);
    }
  };

  // 動画の有効/無効を切り替え
  const toggleVideoActive = async (videoId: number, nextStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/videos/${videoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify({
          isActive: nextStatus,
        }),
      });

      if (!res.ok) {
        throw new Error("更新に失敗しました");
      }

      await fetchVideos();
      setSuccess(
        `動画の状態を「${nextStatus ? "有効" : "無効"}」に変更しました`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  const openToggleConfirm = (videoId: number, currentStatus: boolean) => {
    setToggleConfirm({ isOpen: true, videoId, currentStatus });
  };

  const confirmToggle = async () => {
    if (!toggleConfirm.videoId) {
      setToggleConfirm({ isOpen: false, videoId: null, currentStatus: true });
      return;
    }
    const videoId = toggleConfirm.videoId;
    const nextStatus = !toggleConfirm.currentStatus;
    setToggleConfirm({ isOpen: false, videoId: null, currentStatus: true });
    await toggleVideoActive(videoId, nextStatus);
  };

  // 動画削除の確認モーダルを開く（使用状況を確認）
  const handleDeleteClick = async (videoId: number) => {
    try {
      // 使用状況を取得
      const res = await fetch(`/api/admin/videos/${videoId}`, {
        method: "GET",
        headers: {

        },
      });

      let usageInfo: {
        inDefaultSettings: boolean;
        inGachaTypes: Array<{ id: string; name: string }>;
      } = {
        inDefaultSettings: false,
        inGachaTypes: [],
      };

      if (res.ok) {
        const data = await res.json();
        usageInfo = data.usageInfo || usageInfo;
      }

      setDeleteConfirm({ isOpen: true, videoId, usageInfo });
    } catch (error) {
      console.error("使用状況の取得エラー:", error);
      setDeleteConfirm({ isOpen: true, videoId });
    }
  };

  // 動画を削除
  const handleDelete = async () => {
    if (!deleteConfirm.videoId) return;

    try {
      const res = await fetch(`/api/admin/videos/${deleteConfirm.videoId}`, {
        method: "DELETE",
        headers: {

        },
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "削除に失敗しました" }));
        throw new Error(errorData.error || "削除に失敗しました");
      }

      const data = await res.json();
      const usageInfo = data.usageInfo || {
        inDefaultSettings: false,
        inGachaTypes: [],
      };

      // 使用状況に基づいて警告メッセージを生成
      let warningMessage = "";
      if (usageInfo.inDefaultSettings || usageInfo.inGachaTypes.length > 0) {
        const warnings: string[] = [];
        if (usageInfo.inDefaultSettings) {
          warnings.push("デフォルト設定");
        }
        if (usageInfo.inGachaTypes.length > 0) {
          warnings.push(
            `${
              usageInfo.inGachaTypes.length
            }個のガチャタイプ（${usageInfo.inGachaTypes
              .map((gt: { id: string; name: string }) => gt.name)
              .join("、")}）`
          );
        }
        warningMessage = `この動画は以下の設定で使用されていましたが、自動的に削除されました：\n${warnings.join(
          "、"
        )}`;
      }

      setDeleteConfirm({ isOpen: false, videoId: null });
      await fetchVideos();

      setSuccess(
        warningMessage
          ? `動画を削除しました。\n\n${warningMessage}`
          : "動画を削除しました。"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
      setDeleteConfirm({ isOpen: false, videoId: null });
    }
  };

  // デフォルト設定を取得
  const fetchDefaultSettings = async () => {
    try {
      setLoadingDefaultSettings(true);
      setError(null);
      const res = await fetch("/api/admin/videos/default-settings", {
        headers: {

        },
      });

      if (!res.ok) {
        let errorMessage = "デフォルト設定の取得に失敗しました";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            errorMessage = data.error || errorMessage;
          } else {
            const text = await res.text();
            errorMessage = text || errorMessage;
          }
        } catch {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("無効なレスポンス形式です");
      }
      const data = await res.json();
      const nextSettings = {
        id: data.settings.id,
        // commonVideoAssetIds: data.settings.commonVideoAssetIds || [], // 共通動画は使用しないためコメントアウト
        tierVideoAssetIds: data.settings.tierVideoAssetIds
          ? typeof data.settings.tierVideoAssetIds === "string"
            ? JSON.parse(data.settings.tierVideoAssetIds)
            : data.settings.tierVideoAssetIds
          : null,
      };
      setDefaultSettings(nextSettings);
      setSavedDefaultSettings(nextSettings);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "デフォルト設定の取得に失敗しました"
      );
    } finally {
      setLoadingDefaultSettings(false);
    }
  };

  // デフォルト設定を保存
  const saveDefaultSettings = async () => {
    if (!defaultSettings) return;

    try {
      setSavingDefaultSettings(true);
      setError(null);

      const res = await fetch("/api/admin/videos/default-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify({
          // commonVideoAssetIds: defaultSettings.commonVideoAssetIds, // 共通動画は使用しないためコメントアウト
          tierVideoAssetIds: defaultSettings.tierVideoAssetIds,
        }),
      });

      if (!res.ok) {
        let errorMessage = "保存に失敗しました";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            errorMessage = data.error || errorMessage;
          } else {
            const text = await res.text();
            errorMessage = text || errorMessage;
          }
        } catch {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log("[一括設定保存] 成功:", data);
      const nextSettings = {
        id: data.settings.id,
        // commonVideoAssetIds: data.settings.commonVideoAssetIds || [], // 共通動画は使用しないためコメントアウト
        tierVideoAssetIds: data.settings.tierVideoAssetIds
          ? typeof data.settings.tierVideoAssetIds === "string"
            ? JSON.parse(data.settings.tierVideoAssetIds)
            : data.settings.tierVideoAssetIds
          : null,
      };
      setDefaultSettings(nextSettings);
      setSavedDefaultSettings(nextSettings);
      setShowDefaultSettings(false);
      // 成功メッセージを表示（エラー表示をクリア）
      setError(null);
      setSuccess("一括設定を保存しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSavingDefaultSettings(false);
    }
  };

  const buildDefaultSettingsChanges = () => {
    if (!defaultSettings || !savedDefaultSettings) return [];
    const before = savedDefaultSettings;
    const after = defaultSettings;
    const changes: Array<{ label: string; from: string; to: string }> = [];

    // 等級別動画の変更を詳細に比較
    const beforeTiers = before.tierVideoAssetIds || {};
    const afterTiers = after.tierVideoAssetIds || {};
    
    // すべての等級コードを取得（変更前と変更後の両方）
    const allTierCodes = new Set([
      ...Object.keys(beforeTiers),
      ...Object.keys(afterTiers),
    ]);

    // 等級マスタから等級名を取得するためのマップ
    const tierMap = new Map(
      prizeTiers.map((tier) => [tier.code, tier.label])
    );

    for (const tierCode of allTierCodes) {
      const beforeIds = beforeTiers[tierCode] || [];
      const afterIds = afterTiers[tierCode] || [];
      
      // 動画IDの配列をソートして比較
      const beforeIdsSorted = [...beforeIds].sort((a, b) => a - b);
      const afterIdsSorted = [...afterIds].sort((a, b) => a - b);
      
      // 配列が異なる場合のみ変更として記録
      if (
        beforeIdsSorted.length !== afterIdsSorted.length ||
        beforeIdsSorted.some((id, index) => id !== afterIdsSorted[index])
      ) {
        // 動画名を取得
        const beforeVideoNames = beforeIdsSorted
          .map((id) => {
            const video = videos.find((v) => v.id === id);
            return video ? video.fileName : `ID:${id}`;
          })
          .join(", ");
        const afterVideoNames = afterIdsSorted
          .map((id) => {
            const video = videos.find((v) => v.id === id);
            return video ? video.fileName : `ID:${id}`;
          })
          .join(", ");

        const tierLabel = tierMap.get(tierCode) || tierCode;
        changes.push({
          label: `等級別動画（${tierLabel}）`,
          from: beforeVideoNames || "なし",
          to: afterVideoNames || "なし",
        });
      }
    }

    // 等級が追加または削除された場合
    const beforeTierCodes = new Set(Object.keys(beforeTiers));
    const afterTierCodes = new Set(Object.keys(afterTiers));
    
    // 削除された等級
    for (const tierCode of beforeTierCodes) {
      if (!afterTierCodes.has(tierCode)) {
        const tierLabel = tierMap.get(tierCode) || tierCode;
        const beforeVideoNames = (beforeTiers[tierCode] || [])
          .map((id) => {
            const video = videos.find((v) => v.id === id);
            return video ? video.fileName : `ID:${id}`;
          })
          .join(", ");
        changes.push({
          label: `等級別動画（${tierLabel}）`,
          from: beforeVideoNames || "なし",
          to: "削除",
        });
      }
    }
    
    // 追加された等級
    for (const tierCode of afterTierCodes) {
      if (!beforeTierCodes.has(tierCode)) {
        const tierLabel = tierMap.get(tierCode) || tierCode;
        const afterVideoNames = (afterTiers[tierCode] || [])
          .map((id) => {
            const video = videos.find((v) => v.id === id);
            return video ? video.fileName : `ID:${id}`;
          })
          .join(", ");
        changes.push({
          label: `等級別動画（${tierLabel}）`,
          from: "なし",
          to: afterVideoNames || "なし",
        });
      }
    }

    if (changes.length === 0) {
      changes.push({ label: "変更", from: "変更なし", to: "変更なし" });
    }
    return changes;
  };

  // 動画をタイプ別にグループ化
  // 注意: 新しいスキーマでは、等級別動画の等級割当は GachaType/DefaultGachaVideoSettings で管理されるため、
  // 動画管理画面では等級別にグループ化しない（すべての等級別動画を1つのセクションに表示）
  const groupedVideos = {
    // COMMON: videos.filter((v) => v.videoType === "COMMON"), // 共通動画は使用しないためコメントアウト
    RARITY: videos.filter((v) => v.videoType === "RARITY"),
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-end">
          <div className="flex gap-2">
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="rounded-lg bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600"
            >
              {showThumbnails ? "サムネイルを非表示" : "サムネイルを表示"}
            </button>
            <button
              onClick={() => {
                setShowDefaultSettings(!showDefaultSettings);
                if (!showDefaultSettings && !defaultSettings) {
                  fetchDefaultSettings();
                }
              }}
              className="rounded-lg bg-purple-500 px-4 py-2 text-white transition-colors hover:bg-purple-600"
            >
              {showDefaultSettings ? "一括設定を閉じる" : "一括設定"}
            </button>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            >
              {showUploadForm ? "キャンセル" : "+ 動画をアップロード"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 whitespace-pre-wrap">
            {success}
          </div>
        )}

        {/* 一括設定フォーム */}
        {showDefaultSettings && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              一括設定（グローバルデフォルト）
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              ここで設定した動画は、個別設定がないすべてのガチャタイプで使用されます。
            </p>
            {loadingDefaultSettings ? (
              <div className="py-8 text-center text-black">
                読み込み中...
              </div>
            ) : defaultSettings ? (
              <div className="space-y-4">
                {/* 共通動画セクション（共通動画は使用しないためコメントアウト） */}
                {/* <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    共通動画（複数選択可能）
                  </label>
                  <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border border-gray-300 p-3">
                    {videos
                      .filter((v) => v.videoType === "COMMON" && v.isActive)
                      .map((video) => (
                        <label
                          key={video.id}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={defaultSettings.commonVideoAssetIds.includes(
                              video.id
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDefaultSettings({
                                  ...defaultSettings,
                                  commonVideoAssetIds: [
                                    ...defaultSettings.commonVideoAssetIds,
                                    video.id,
                                  ],
                                });
                              } else {
                                setDefaultSettings({
                                  ...defaultSettings,
                                  commonVideoAssetIds:
                                    defaultSettings.commonVideoAssetIds.filter(
                                      (id) => id !== video.id
                                    ),
                                });
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">
                            {video.fileName}
                          </span>
                        </label>
                      ))}
                    {videos.filter(
                      (v) => v.videoType === "COMMON" && v.isActive
                    ).length === 0 && (
                      <p className="text-sm text-black">
                        共通動画が登録されていません
                      </p>
                    )}
                  </div>
                </div> */}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    等級別動画（各等級ごとに複数選択可能）
                  </label>
                  {prizeTiers.length === 0 ? (
                    <div className="rounded-md border border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                      等級マスタが登録されていません。等級マスタ管理画面で等級を登録してください。
                    </div>
                  ) : (
                  <div className="space-y-3">
                    {prizeTiers
                      .filter((t) => t.isActive !== false)
                      .sort((a, b) => {
                        const orderDiff = (a.displayOrder || 0) - (b.displayOrder || 0);
                        return orderDiff !== 0 ? orderDiff : a.code.localeCompare(b.code);
                      })
                      .map((tier) => (
                        <div key={tier.code}>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            {tier.label}
                          </label>
                        <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-gray-300 p-3">
                          {videos
                            .filter(
                              (v) => v.videoType === "RARITY" && v.isActive
                            )
                            .map((video) => (
                              <label
                                key={video.id}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    defaultSettings.tierVideoAssetIds?.[
                                      tier.code
                                    ]?.includes(video.id) || false
                                  }
                                  onChange={(e) => {
                                    const currentIds =
                                      defaultSettings.tierVideoAssetIds?.[
                                        tier.code
                                      ] || [];
                                    const newRarityVideoIds = {
                                      ...(defaultSettings.tierVideoAssetIds ||
                                        {}),
                                      [tier.code]: e.target.checked
                                        ? [...currentIds, video.id]
                                        : currentIds.filter(
                                            (id) => id !== video.id
                                          ),
                                    };
                                    setDefaultSettings({
                                      ...defaultSettings,
                                      tierVideoAssetIds: newRarityVideoIds,
                                    });
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">
                                  {video.fileName}
                                </span>
                              </label>
                            ))}
                          {videos.filter(
                            (v) => v.videoType === "RARITY" && v.isActive
                          ).length === 0 && (
                            <p className="text-sm text-black">
                              等級別動画が登録されていません
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSaveDefaultsConfirm(true)}
                    disabled={savingDefaultSettings}
                    className="rounded-lg bg-purple-500 px-6 py-2 text-white transition-colors hover:bg-purple-600 disabled:bg-gray-400"
                  >
                    {savingDefaultSettings ? "保存中..." : "保存"}
                  </button>
                  <button
                    onClick={() => setShowDefaultSettings(false)}
                    className="rounded-lg bg-gray-200 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-300"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-black">
                設定を読み込めませんでした
              </div>
            )}
          </div>
        )}

        {/* アップロードフォーム */}
        {showUploadForm && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              動画をアップロード
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  動画タイプ
                </label>
                <select
                  value={selectedVideoType}
                  onChange={(e) => {
                    setSelectedVideoType(e.target.value as "COMMON" | "RARITY");
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {/* <option value="COMMON">
                    共通動画（あたりかハズレの判定動画まで）
                  </option> */}{/* 共通動画は使用しないためコメントアウト */}
                  <option value="RARITY">等級別動画（あたりの等級別）</option>
                </select>
                <p className="mt-1 text-xs text-black">
                  {selectedVideoType === "RARITY" &&
                    "等級はガチャ設定画面で選択してください"}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  動画ファイル
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {uploadFile && (
                  <p className="mt-1 text-sm text-black">
                    選択: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  説明（任意）
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="動画の説明を入力してください"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile}
                  className="rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {uploading ? "アップロード中..." : "アップロード"}
                </button>
                <button
                  onClick={() => {
                    setShowUploadForm(false);
                    setUploadFile(null);
                    setDescription("");
                  }}
                  className="rounded-lg bg-gray-200 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-300"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-black">読み込み中...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 共通動画（共通動画は使用しないためコメントアウト） */}
            {/* <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-800">
                共通動画（あたりかハズレの判定動画まで）
              </h2>
              {groupedVideos.COMMON.length > 0 ? (
                <div className="space-y-4">
                  {groupedVideos.COMMON.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          {showThumbnails && (
                            <video
                              src={video.s3Url}
                              className="h-20 w-32 rounded object-cover"
                              controls={false}
                              muted
                            />
                          )}
                          <div>
                            <div className="font-medium text-black">
                              {video.fileName}
                            </div>
                            {video.description && (
                              <div className="text-sm text-black">
                                {video.description}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-gray-400">
                              {formatFileSize(video.fileSize)} •{" "}
                              {new Date(video.createdAt).toLocaleDateString(
                                "ja-JP"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            openToggleConfirm(video.id, video.isActive)
                          }
                          className={`rounded px-3 py-1 text-sm ${
                            video.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {video.isActive ? "有効" : "無効"}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(video.id)}
                          className="rounded bg-red-100 px-3 py-1 text-sm text-red-800 hover:bg-red-200"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-black">
                  共通動画が登録されていません
                </div>
              )}
            </div> */}

            {/* 等級別動画 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-2 text-xl font-semibold text-gray-800">
                等級別動画（あたりの等級別）
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                等級の割り当ては、各ガチャタイプの設定画面または一括設定で管理されます。
              </p>
              {groupedVideos.RARITY.length > 0 ? (
                <div className="space-y-4">
                  {groupedVideos.RARITY.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          {showThumbnails && (
                            <video
                              src={video.s3Url}
                              className="h-20 w-32 rounded object-cover"
                              controls={false}
                              muted
                            />
                          )}
                          <div>
                            <div className="font-medium text-black">
                              {video.fileName}
                            </div>
                            {video.description && (
                              <div className="text-sm text-black">
                                {video.description}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-gray-400">
                              {formatFileSize(video.fileSize)} •{" "}
                              {new Date(video.createdAt).toLocaleDateString(
                                "ja-JP"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            openToggleConfirm(video.id, video.isActive)
                          }
                          className={`rounded px-3 py-1 text-sm ${
                            video.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {video.isActive ? "有効" : "無効"}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(video.id)}
                          className="rounded bg-red-100 px-3 py-1 text-sm text-red-800 hover:bg-red-200"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-black">
                  等級別動画が登録されていません
                </div>
              )}
            </div>
          </div>
        )}

        {/* 削除確認モーダル */}
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          title="動画の削除"
          message={
            deleteConfirm.usageInfo &&
            (deleteConfirm.usageInfo.inDefaultSettings ||
              deleteConfirm.usageInfo.inGachaTypes.length > 0)
              ? `この動画を削除しますか？\n\n警告：この動画は以下の設定で使用されています：\n${
                  deleteConfirm.usageInfo.inDefaultSettings
                    ? "・デフォルト設定\n"
                    : ""
                }${
                  deleteConfirm.usageInfo.inGachaTypes.length > 0
                    ? `・${
                        deleteConfirm.usageInfo.inGachaTypes.length
                      }個のガチャタイプ（${deleteConfirm.usageInfo.inGachaTypes
                        .map((gt: { id: string; name: string }) => gt.name)
                        .join("、")}）\n`
                    : ""
                }\n削除すると、これらの設定からも自動的に削除されます。\nこの操作は取り消せません。`
              : "この動画を削除しますか？この操作は取り消せません。"
          }
          confirmText="削除"
          cancelText="キャンセル"
          changes={[
            {
              label: "対象動画",
              from: "登録済み",
              to: `削除（ID: ${deleteConfirm.videoId ?? "-"}）`,
            },
          ]}
          variant={
            deleteConfirm.usageInfo &&
            (deleteConfirm.usageInfo.inDefaultSettings ||
              deleteConfirm.usageInfo.inGachaTypes.length > 0)
              ? "warning"
              : "danger"
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, videoId: null })}
        />

        <ConfirmModal
          isOpen={toggleConfirm.isOpen}
          title="動画の状態変更"
          message={
            toggleConfirm.currentStatus
              ? "この動画を無効にしますか？（ガチャ演出で使用されなくなります）"
              : "この動画を有効にしますか？"
          }
          confirmText={toggleConfirm.currentStatus ? "無効化" : "有効化"}
          cancelText="キャンセル"
          variant={toggleConfirm.currentStatus ? "warning" : "info"}
          changes={[
            {
              label: "状態",
              from: toggleConfirm.currentStatus ? "有効" : "無効",
              to: toggleConfirm.currentStatus ? "無効" : "有効",
            },
            {
              label: "対象動画ID",
              from: "-",
              to: String(toggleConfirm.videoId ?? "-"),
            },
          ]}
          onConfirm={confirmToggle}
          onCancel={() =>
            setToggleConfirm({
              isOpen: false,
              videoId: null,
              currentStatus: true,
            })
          }
        />

        <ConfirmModal
          isOpen={saveDefaultsConfirm}
          title="一括設定の保存"
          message="以下の内容に変更して保存します。よろしいですか？"
          confirmText="保存"
          cancelText="キャンセル"
          variant="info"
          changes={buildDefaultSettingsChanges()}
          onConfirm={async () => {
            setSaveDefaultsConfirm(false);
            await saveDefaultSettings();
          }}
          onCancel={() => setSaveDefaultsConfirm(false)}
        />
      </div>
    </AdminLayout>
  );
}

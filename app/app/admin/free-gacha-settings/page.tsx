"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { getAdminAuthToken } from "@/lib/admin-auth";
import { Button, Input, Select, Card, Alert } from "@/components/admin/ui";
import ConfirmModal from "@/components/admin/ConfirmModal";

type FreeGachaSettings = {
  id: number;
  isEnabled: boolean;
  grantOnReferralComplete: boolean;
  referrerGachaTypeId: number | null;
  refereeGachaTypeId: number | null;
  expirationDays: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type GachaType = {
  id: number;
  code: string;
  name: string;
};

export default function FreeGachaSettingsPage() {
  const [settings, setSettings] = useState<FreeGachaSettings | null>(null);
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    isEnabled: false,
    grantOnReferralComplete: false,
    referrerGachaTypeCode: null as string | null,
    refereeGachaTypeCode: null as string | null,
    expirationDays: null as number | null,
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    changes?: Array<{ field: string; from: string; to: string }>;
  }>({ isOpen: false, message: "" });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/free-gacha-settings", {
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
        throw new Error("設定の取得に失敗しました");
      }

      const data = await res.json();
      setSettings(data.settings);
      setGachaTypes(data.gachaTypes || []);

      // フォームデータを初期化
      const referrerGachaType = data.gachaTypes?.find(
        (gt: GachaType) => gt.id === data.settings.referrerGachaTypeId
      );
      const refereeGachaType = data.gachaTypes?.find(
        (gt: GachaType) => gt.id === data.settings.refereeGachaTypeId
      );

      setFormData({
        isEnabled: data.settings.isEnabled ?? false,
        grantOnReferralComplete: data.settings.grantOnReferralComplete ?? false,
        referrerGachaTypeCode: referrerGachaType?.code || null,
        refereeGachaTypeCode: refereeGachaType?.code || null,
        expirationDays: data.settings.expirationDays,
      });
    } catch (err: any) {
      console.error("設定取得エラー:", err);
      setError(err.message || "設定の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!settings) return;

    const changes: Array<{ field: string; from: string; to: string }> = [];

    // 変更内容を記録
    if (settings.isEnabled !== formData.isEnabled) {
      changes.push({
        field: "無料ガチャ機能",
        from: settings.isEnabled ? "有効" : "無効",
        to: formData.isEnabled ? "有効" : "無効",
      });
    }
    if (settings.grantOnReferralComplete !== formData.grantOnReferralComplete) {
      changes.push({
        field: "紹介成立時のガチャ付与",
        from: settings.grantOnReferralComplete ? "有効" : "無効",
        to: formData.grantOnReferralComplete ? "有効" : "無効",
      });
    }

    const referrerGachaType = gachaTypes.find(
      (gt) => gt.code === formData.referrerGachaTypeCode
    );
    const oldReferrerGachaType = gachaTypes.find(
      (gt) => gt.id === settings.referrerGachaTypeId
    );
    if (oldReferrerGachaType?.code !== formData.referrerGachaTypeCode) {
      changes.push({
        field: "紹介者用ガチャタイプ",
        from: oldReferrerGachaType?.name || "未設定",
        to: referrerGachaType?.name || "未設定",
      });
    }

    const refereeGachaType = gachaTypes.find(
      (gt) => gt.code === formData.refereeGachaTypeCode
    );
    const oldRefereeGachaType = gachaTypes.find(
      (gt) => gt.id === settings.refereeGachaTypeId
    );
    if (oldRefereeGachaType?.code !== formData.refereeGachaTypeCode) {
      changes.push({
        field: "被紹介者用ガチャタイプ",
        from: oldRefereeGachaType?.name || "未設定",
        to: refereeGachaType?.name || "未設定",
      });
    }

    if (settings.expirationDays !== formData.expirationDays) {
      changes.push({
        field: "有効期限（日数）",
        from: settings.expirationDays?.toString() || "無期限",
        to: formData.expirationDays?.toString() || "無期限",
      });
    }

    if (changes.length === 0) {
      setError("変更がありません");
      return;
    }

    setConfirmModal({
      isOpen: true,
      message: "以下の変更を保存しますか？",
      changes,
    });
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/free-gacha-settings", {
        method: "PUT",
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
        throw new Error(errorData.error || "設定の保存に失敗しました");
      }

      setSuccess("設定を保存しました");
      setConfirmModal({ isOpen: false, message: "" });
      await fetchSettings();
    } catch (err: any) {
      console.error("設定保存エラー:", err);
      setError(err.message || "設定の保存に失敗しました");
      setConfirmModal({ isOpen: false, message: "" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            無料ガチャ設定
          </h1>
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

        <Card title="無料ガチャ設定" className="mb-6">
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, isEnabled: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">
                  無料ガチャ機能を有効にする
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                無効にすると、紹介システムで無料ガチャは付与されません
              </p>
            </div>

            {formData.isEnabled && (
              <>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.grantOnReferralComplete}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          grantOnReferralComplete: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      紹介成立時に無料ガチャを付与する
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    被紹介者が友だち追加（初回登録）した時点で無料ガチャを付与します
                  </p>
                </div>

                {formData.grantOnReferralComplete && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        紹介者に付与するガチャタイプ
                      </label>
                      <Select
                        value={formData.referrerGachaTypeCode || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            referrerGachaTypeCode:
                              e.target.value || null,
                          })
                        }
                        options={[
                          { value: "", label: "未設定（付与しない）" },
                          ...gachaTypes.map((gt) => ({
                            value: gt.code,
                            label: gt.name,
                          })),
                        ]}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        紹介者が獲得できる無料ガチャの種類
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        被紹介者に付与するガチャタイプ
                      </label>
                      <Select
                        value={formData.refereeGachaTypeCode || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            refereeGachaTypeCode: e.target.value || null,
                          })
                        }
                        options={[
                          { value: "", label: "未設定（付与しない）" },
                          ...gachaTypes.map((gt) => ({
                            value: gt.code,
                            label: gt.name,
                          })),
                        ]}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        被紹介者が獲得できる無料ガチャの種類
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        無料ガチャの有効期限（日数）
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.expirationDays || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            expirationDays:
                              e.target.value === ""
                                ? null
                                : parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="例: 30（30日後まで有効）"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        未入力または0の場合は無期限（有効期限なし）
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                leftIcon={saving ? "⏳" : "💾"}
              >
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        changes={confirmModal.changes}
        onConfirm={handleConfirmSave}
        onCancel={() => setConfirmModal({ isOpen: false, message: "" })}
        variant="primary"
      />
    </AdminLayout>
  );
}




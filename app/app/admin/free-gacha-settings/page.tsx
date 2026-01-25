"use client";

import { useState, useEffect } from "react";
import { getAdminAuthToken } from "@/lib/admin-auth";
import { Button, Input, Select, Card, Alert } from "@/components/admin/ui";
import ConfirmModal from "@/components/admin/ConfirmModal";

type FreeGachaSettings = {
  id: number;
  isActive: boolean;
  grantOnReferralComplete: boolean;
  referrerGachaTypeId: number | null;
  refereeGachaTypeId: number | null;
  expirationDays: number | null;
  referrerPoints: number;
  refereePoints: number;
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
    isActive: false,
    grantOnReferralComplete: false,
    referrerGachaTypeCode: null as string | null,
    refereeGachaTypeCode: null as string | null,
    expirationDays: null as number | null,
    referrerPoints: 100,
    refereePoints: 100,
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    changes?: Array<{ label: string; from: string; to: string }>;
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
        isActive: data.settings.isActive ?? false,
        grantOnReferralComplete: data.settings.grantOnReferralComplete ?? false,
        referrerGachaTypeCode: referrerGachaType?.code || null,
        refereeGachaTypeCode: refereeGachaType?.code || null,
        expirationDays: data.settings.expirationDays,
        referrerPoints: data.settings.referrerPoints ?? 100,
        refereePoints: data.settings.refereePoints ?? 100,
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

    const changes: Array<{ label: string; from: string; to: string }> = [];

    if (settings.referrerPoints !== formData.referrerPoints) {
      changes.push({
        label: "紹介者へのポイント報酬",
        from: settings.referrerPoints.toLocaleString(),
        to: formData.referrerPoints.toLocaleString(),
      });
    }
    if (settings.refereePoints !== formData.refereePoints) {
      changes.push({
        label: "被紹介者へのポイント報酬",
        from: settings.refereePoints.toLocaleString(),
        to: formData.refereePoints.toLocaleString(),
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
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && (
        <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          variant="success"
          className="mb-4"
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* 動作説明カード */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <span>ℹ️</span>
            これを設定した場合
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <span className="font-semibold">1.</span>
              <div>
                <strong>紹介成立時（被紹介者が友だち追加/初回登録時）</strong>
                に、以下のポイントが自動付与されます：
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  <li>
                    <strong>紹介者</strong>：
                    {formData.referrerPoints > 0
                      ? `${formData.referrerPoints}ポイント`
                      : "付与なし"}
                  </li>
                  <li>
                    <strong>被紹介者</strong>：
                    {formData.refereePoints > 0
                      ? `${formData.refereePoints}ポイント`
                      : "付与なし"}
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold">2.</span>
              <div>
                <strong>注意事項</strong>：
                <ul className="mt-1 ml-4 list-disc space-y-1 text-orange-700">
                  <li>
                    無料ガチャ機能は未実装のため、この画面ではポイント特典のみ設定します
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <div className="space-y-6">
          {/* 紹介報酬ポイント設定 */}
          <div className="border-t pt-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              紹介報酬ポイント設定
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              紹介成立時に、紹介者と被紹介者に付与するポイントを設定できます。
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  紹介者へのポイント報酬
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.referrerPoints}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      referrerPoints: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="例: 100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  紹介者が獲得できるポイント数（0の場合は付与しない）
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  被紹介者へのポイント報酬
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.refereePoints}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      refereePoints: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="例: 100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  被紹介者が獲得できるポイント数（0の場合は付与しない）
                </p>
              </div>
            </div>
          </div>

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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="設定の保存"
        message={confirmModal.message}
        changes={confirmModal.changes}
        onConfirm={handleConfirmSave}
        onCancel={() => setConfirmModal({ isOpen: false, message: "" })}
        variant="info"
      />
    </div>
  );
}

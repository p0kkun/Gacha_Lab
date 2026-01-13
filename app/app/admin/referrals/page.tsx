"use client";

import { useState, useEffect } from "react";
import { getAdminAuthToken } from "@/lib/admin-auth";
import { Card, Button, Input, Select, Badge, Alert, Table, PageHeader } from "@/components/admin/ui";

type ReferralUser = {
  id: number;
  userId: string;
  toUserId: string;
  completedAt: Date;
  additionalRewardGranted: boolean;
  additionalRewardGrantedAt: Date | null;
  user: {
    userId: string;
    displayName: string | null;
    pictureUrl: string | null;
  };
  toUser: {
    userId: string;
    displayName: string | null;
    pictureUrl: string | null;
  };
  referral: {
    id: number;
    referralLinkId: string;
    referralLink: string;
    status: string;
  };
  freeGachaHistories: Array<{
    id: number;
    userId: string;
    grantType: string;
    isUsed: boolean;
    expiresAt: Date | null;
    gachaType: {
      id: number;
      code: string;
      name: string;
    };
  }>;
  refereeActivity: {
    gachaCount: number;
    totalSpent: number;
    lastActiveAt: Date | null;
  } | null;
};

type ReferralHistory = {
  id: number;
  referralId: number;
  referralLinkId: string;
  ipAddress: string | null;
  deviceInfo: string | null;
  status: string;
  isFraudDetected: boolean;
  fraudReason: string | null;
  referredAt: Date;
  referral: {
    id: number;
    userId: string;
    referralLinkId: string;
    referralLink: string;
    status: string;
    user: {
      userId: string;
      displayName: string | null;
      pictureUrl: string | null;
    };
  };
  pendingReferee?: {
    userId: string;
    displayName: string | null;
    pictureUrl: string | null;
    lastAccessedAt: Date | null;
  } | null;
};

type ReferralHistoryItem = {
  type: "completed" | "history";
  referralUser: ReferralUser | null;
  referralHistory: ReferralHistory | null;
  pendingReferee: {
    userId: string;
    displayName: string | null;
    pictureUrl: string | null;
    lastAccessedAt: Date | null;
  } | null;
};

export default function ReferralsPage() {
  const [histories, setHistories] = useState<ReferralHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    referrerId: "",
    refereeId: "",
    status: "",
  });

  useEffect(() => {
    fetchHistories();
  }, [page, filters]);

  const fetchHistories = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "50");
      if (filters.referrerId) {
        params.append("referrerId", filters.referrerId);
      }
      if (filters.refereeId) {
        params.append("refereeId", filters.refereeId);
      }
      if (filters.status) {
        params.append("status", filters.status);
      }

      const authToken = getAdminAuthToken();
      const res = await fetch(`/api/admin/referrals?${params}`, {
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
        throw new Error("紹介履歴の取得に失敗しました");
      }

      const data = await res.json();
      setHistories(data.histories);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      console.error("紹介履歴取得エラー:", err);
      setError(err.message || "紹介履歴の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "danger" | "gray"> = {
      PENDING: "warning",
      COMPLETED: "success",
      INVALID: "gray",
      FRAUD: "danger",
    };
    return <Badge variant={variants[status] || "gray"}>{status}</Badge>;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "待機中",
      COMPLETED: "成立",
      INVALID: "無効",
      FRAUD: "不正",
    };
    return labels[status] || status;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1); // フィルタ変更時は1ページ目に戻す
  };

  return (
    <div className="w-full">
        {error && (
          <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card title="フィルタ" className="mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                紹介者ユーザーID
              </label>
              <Input
                type="text"
                value={filters.referrerId}
                onChange={(e) => handleFilterChange("referrerId", e.target.value)}
                placeholder="U1234567890..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                被紹介者ユーザーID
              </label>
              <Input
                type="text"
                value={filters.refereeId}
                onChange={(e) => handleFilterChange("refereeId", e.target.value)}
                placeholder="U1234567890..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                options={[
                  { value: "", label: "すべて" },
                  { value: "PENDING", label: "待機中" },
                  { value: "COMPLETED", label: "成立" },
                  { value: "INVALID", label: "無効" },
                  { value: "FRAUD", label: "不正" },
                ]}
              />
            </div>
          </div>
        </Card>

        <Card title="紹介履歴" scrollable maxHeight="calc(100vh - 400px)">
          {loading ? (
            <div className="py-8 text-center text-gray-500">読み込み中...</div>
          ) : histories.length === 0 ? (
            <div className="py-8 text-center text-gray-500">履歴がありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      タイプ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      紹介者
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      被紹介者
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      無料ガチャ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      被紹介者行動
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      日時
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      備考
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {histories.map((item, index) => {
                    if (item.type === "completed" && item.referralUser) {
                      const ru = item.referralUser;
                      return (
                        <tr key={`completed-${ru.id}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            <Badge variant="success">成立</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              {ru.user.pictureUrl && (
                                <img
                                  src={ru.user.pictureUrl}
                                  alt={ru.user.displayName || ""}
                                  className="w-8 h-8 rounded-full"
                                />
                              )}
                              <div>
                                <div className="font-medium text-gray-900">
                                  {ru.user.displayName || "（不明）"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {ru.userId.substring(0, 10)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              {ru.toUser.pictureUrl && (
                                <img
                                  src={ru.toUser.pictureUrl}
                                  alt={ru.toUser.displayName || ""}
                                  className="w-8 h-8 rounded-full"
                                />
                              )}
                              <div>
                                <div className="font-medium text-gray-900">
                                  {ru.toUser.displayName || "（不明）"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {ru.toUserId.substring(0, 10)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getStatusBadge(ru.referral.status)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {ru.freeGachaHistories.length > 0 ? (
                              <div className="space-y-1">
                                {ru.freeGachaHistories.map((fg) => (
                                  <div
                                    key={fg.id}
                                    className="text-xs border rounded px-2 py-1"
                                  >
                                    <div className="font-medium">
                                      {fg.gachaType.name}
                                    </div>
                                    <div className="text-gray-500">
                                      {fg.grantType === "REFERRER" ? "紹介者" : "被紹介者"}
                                      {fg.isUsed ? (
                                        <Badge variant="success" className="ml-1">
                                          使用済
                                        </Badge>
                                      ) : (
                                        <Badge variant="warning" className="ml-1">
                                          未使用
                                        </Badge>
                                      )}
                                    </div>
                                    {fg.expiresAt && (
                                      <div className="text-gray-400">
                                        期限: {formatDate(fg.expiresAt)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">未付与</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {ru.refereeActivity ? (
                              <div className="text-xs">
                                <div>ガチャ: {ru.refereeActivity.gachaCount}回</div>
                                <div>消費額: {ru.refereeActivity.totalSpent}円</div>
                                {ru.refereeActivity.lastActiveAt && (
                                  <div className="text-gray-400">
                                    最終: {formatDate(ru.refereeActivity.lastActiveAt)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <div>成立: {formatDate(ru.completedAt)}</div>
                            {ru.additionalRewardGranted && ru.additionalRewardGrantedAt && (
                              <div className="text-xs text-green-600">
                                追加報酬: {formatDate(ru.additionalRewardGrantedAt)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {ru.additionalRewardGranted && (
                              <div className="text-xs text-green-600">
                                追加報酬付与済み
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    } else if (item.type === "history" && item.referralHistory) {
                      const rh = item.referralHistory;
                      return (
                        <tr key={`history-${rh.id}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            <Badge variant="warning">アクセス履歴</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              {rh.referral.user.pictureUrl && (
                                <img
                                  src={rh.referral.user.pictureUrl}
                                  alt={rh.referral.user.displayName || ""}
                                  className="w-8 h-8 rounded-full"
                                />
                              )}
                              <div>
                                <div className="font-medium text-gray-900">
                                  {rh.referral.user.displayName || "（不明）"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {rh.referral.userId.substring(0, 10)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {rh.pendingReferee ? (
                              <div className="flex items-center gap-2">
                                {rh.pendingReferee.pictureUrl && (
                                  <img
                                    src={rh.pendingReferee.pictureUrl}
                                    alt={rh.pendingReferee.displayName || ""}
                                    className="w-8 h-8 rounded-full"
                                  />
                                )}
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {rh.pendingReferee.displayName || "（不明）"}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {rh.pendingReferee.userId.substring(0, 10)}...
                                  </div>
                                  <div className="text-xs text-orange-600 font-medium">
                                    🔗 リンクアクセス済み（LINE未追加）
                                  </div>
                                  {rh.pendingReferee.lastAccessedAt && (
                                    <div className="text-xs text-gray-400">
                                      アクセス: {formatDate(rh.pendingReferee.lastAccessedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">未登録</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getStatusBadge(rh.status)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="text-gray-400">-</span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="text-gray-400">-</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <div>アクセス: {formatDate(rh.referredAt)}</div>
                            {rh.ipAddress && (
                              <div className="text-xs text-gray-400">
                                IP: {rh.ipAddress}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {rh.isFraudDetected && (
                              <div className="text-xs text-red-600">
                                <div className="font-medium">不正検知</div>
                                {rh.fraudReason && (
                                  <div className="text-gray-500">{rh.fraudReason}</div>
                                )}
                              </div>
                            )}
                            {rh.deviceInfo && (
                              <div className="text-xs text-gray-400">
                                デバイス: {rh.deviceInfo.substring(0, 30)}...
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <div className="text-sm text-gray-700">
                ページ {page} / {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  前へ
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </Card>
    </div>
  );
}

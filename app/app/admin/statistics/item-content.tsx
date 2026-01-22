"use client";

import { useState, useEffect } from "react";
import { getAdminAuthToken } from "@/lib/admin-auth";

type ItemUsageStat = {
  itemId: number;
  itemName: string;
  rarity: string;
  isActive: boolean;
  ownershipCount: number;
  ownershipRate: number;
  usageCount: number;
  usageRate: number;
};

type PrizeTier = {
  code: string;
  label: string;
};

export default function ItemStatisticsContent() {
  const [itemStats, setItemStats] = useState<ItemUsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prizeTiers, setPrizeTiers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchItemStatistics();
    fetchPrizeTiers();
  }, []);

  const fetchPrizeTiers = async () => {
    try {
      const res = await fetch("/api/prize-tiers");
      if (res.ok) {
        const data = await res.json();
        const tierMap: Record<string, string> = {};
        if (Array.isArray(data.tiers)) {
          data.tiers.forEach((tier: PrizeTier) => {
            tierMap[tier.code] = tier.label;
          });
        }
        setPrizeTiers(tierMap);
      }
    } catch (error) {
      console.error("等級マスタ取得エラー:", error);
    }
  };

  const getTierLabel = (tierCode: string): string => {
    return prizeTiers[tierCode] || tierCode;
  };

  const fetchItemStatistics = async () => {
    setLoading(true);
    try {
      const authToken = getAdminAuthToken();
      const res = await fetch("/api/admin/statistics?includeItems=true", {
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
        throw new Error("アイテム統計情報の取得に失敗しました");
      }

      const data = await res.json();
      setItemStats(data.itemUsageStats || []);
    } catch (error) {
      console.error("アイテム統計情報取得エラー:", error);
      setError("アイテム統計情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-12">
          <div className="text-black">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="p-6">
          <div className="rounded-lg bg-red-50 p-4 text-red-800">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {itemStats.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <div className="text-black">アイテム統計データがありません</div>
        </div>
      ) : (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            アイテム使用状況
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    アイテム名
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    レアリティ
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    所持数
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    所持率
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    使用数
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    使用率
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    状態
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemStats.map((item) => (
                  <tr
                    key={item.itemId}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm text-black">
                      {item.itemName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        {getTierLabel(item.rarity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-black">
                      {item.ownershipCount.toLocaleString()}人
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {item.ownershipRate.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-black">
                      {item.usageCount.toLocaleString()}回
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {item.usageRate.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {item.isActive ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          有効
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                          無効
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

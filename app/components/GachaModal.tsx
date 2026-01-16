"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import GachaMenu from "./GachaMenu";
import GachaContent from "./GachaContent";
import PointDisplay from "./PointDisplay";
import PointIcon from "./PointIcon";

export type GachaType = {
  id: string;
  name: string;
  description: string;
  iconImageUrl?: string | null;
  pointCost?: number;
};

export default function GachaModal({
  isOpen,
  onClose,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}) {
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [selectedGacha, setSelectedGacha] = useState<GachaType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pointBalances, setPointBalances] = useState<{
    paid: number;
    free: number;
    total: number;
    paidExpiresAt: string | null;
    freeExpiresAt: string | null;
    lastUpdated: string | null;
  } | null>(null);

  // ガチャタイプ一覧とポイント残高を取得
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          // ガチャタイプ一覧を取得
          const typesRes = await fetch("/api/gacha/types");
          if (typesRes.ok) {
            const typesData = await typesRes.json();
            setGachaTypes(typesData.gachaTypes || []);
            if (typesData.gachaTypes && typesData.gachaTypes.length > 0) {
              setSelectedGacha(typesData.gachaTypes[0]);
            }
          }

          // ポイント残高を取得
          const pointsRes = await fetch(`/api/points/balance?userId=${userId}`);
          if (pointsRes.ok) {
            const pointsData = await pointsRes.json();
            setPointBalances({
              paid: pointsData.paid || 0,
              free: pointsData.free || 0,
              total: pointsData.total || 0,
              paidExpiresAt: pointsData.paidExpiresAt,
              freeExpiresAt: pointsData.freeExpiresAt,
              lastUpdated: pointsData.lastUpdated,
            });
          }
        } catch (error) {
          console.error("データ取得エラー:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm">
        <div className="text-center text-gray-900">
          <div className="mb-4 text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!selectedGacha || gachaTypes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm">
        <div className="text-center text-gray-900">
          <div className="mb-4 text-lg">利用可能なガチャがありません</div>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  const handleGachaSelect = (gacha: GachaType) => {
    setSelectedGacha(gacha);
    setIsMenuOpen(false); // 選択したらメニューを閉じる
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-white bg-opacity-70 backdrop-blur-sm">
      {/* 全画面オーバーレイ */}
      <div className="flex h-full w-full flex-col">
        {/* 上部: ポイント表示とメニューボタン */}
        {pointBalances && (
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              {/* ポイント表示 - クリック可能（デザイン改善） */}
              <Link
                href="/points"
                className="group flex flex-1 items-center gap-3 rounded-xl border-2 border-yellow-400/30 bg-gradient-to-r from-yellow-50 to-yellow-100/50 px-4 py-2.5 transition-all hover:border-yellow-400/60 hover:from-yellow-100 hover:to-yellow-200/50 hover:shadow-md active:scale-95"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <PointIcon size={20} className="h-5 w-5" active={true} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <PointIcon
                        size={14}
                        className="h-3.5 w-3.5"
                        active={true}
                      />
                      <span className="text-lg font-bold text-yellow-800 truncate">
                        {pointBalances.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-medium text-yellow-600 flex items-center gap-0.5">
                        <PointIcon size={10} className="h-2.5 w-2.5" />
                        有償: {pointBalances.paid.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-medium text-green-600 flex items-center gap-0.5">
                        <PointIcon size={10} className="h-2.5 w-2.5" />
                        無償: {pointBalances.free.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 text-yellow-600 opacity-60 transition-opacity group-hover:opacity-100">
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
              </Link>
              {/* ガチャ選択ボタン */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-lg active:scale-95"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                <span className="hidden sm:inline">ガチャ選択</span>
              </button>
            </div>
          </div>
        )}

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-hidden">
          <GachaContent
            selectedGacha={selectedGacha}
            userId={userId}
            onClose={onClose}
            onPointsUpdated={async (newPoints) => {
              // ポイント残高を再取得
              try {
                const res = await fetch(`/api/points/balance?userId=${userId}`);
                if (res.ok) {
                  const data = await res.json();
                  setPointBalances({
                    paid: data.paid || 0,
                    free: data.free || 0,
                    total: data.total || 0,
                    paidExpiresAt: data.paidExpiresAt,
                    freeExpiresAt: data.freeExpiresAt,
                    lastUpdated: data.lastUpdated,
                  });
                }
              } catch (error) {
                console.error("ポイント残高取得エラー:", error);
              }
            }}
          />
        </div>
      </div>

      {/* ガチャ選択メニュー（オーバーレイ） */}
      <>
        {/* 半透明背景（フェードイン） */}
        <div
          className={`fixed inset-0 z-[60] bg-white backdrop-blur-sm transition-opacity duration-300 ease-out ${
            isMenuOpen ? "opacity-70" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* メニューパネル（スライドイン） */}
        <div
          className={`fixed inset-y-0 left-0 z-[70] w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <GachaMenu
            gachaTypes={gachaTypes}
            selectedGacha={selectedGacha}
            onSelect={handleGachaSelect}
            onClose={() => setIsMenuOpen(false)}
          />
        </div>
      </>
    </div>
  );
}

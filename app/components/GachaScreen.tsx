"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GachaMenu from "./GachaMenu";
import GachaContent from "./GachaContent";
import PointIcon from "./PointIcon";
import { formatExpiryText } from "@/lib/point-utils";
import { GachaType } from "./GachaModal";
import { useErrorModal } from "./ErrorModalProvider";

export default function GachaScreen({
  userId,
  defaultGachaCode,
}: {
  userId: string;
  defaultGachaCode?: string;
}) {
  const [gachaTypes, setGachaTypes] = useState<GachaType[]>([]);
  const [selectedGacha, setSelectedGacha] = useState<GachaType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [redirectToMypage, setRedirectToMypage] = useState(false);
  const [invalidRequestedGacha, setInvalidRequestedGacha] = useState(false);
  const [pointBalances, setPointBalances] = useState<{
    paid: number;
    free: number;
    total: number;
    paidExpiresAt: string | null;
    freeExpiresAt: string | null;
    lastUpdated: string | null;
  } | null>(null);
  const router = useRouter();
  const { showError } = useErrorModal();
  const errorShownRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // ガチャタイプ一覧を取得
        const typesRes = await fetch("/api/gacha/types");
        if (typesRes.ok) {
          const typesData = await typesRes.json();
          const availableTypes: GachaType[] = typesData.gachaTypes || [];
          setGachaTypes(availableTypes);
          if (availableTypes.length > 0) {
            if (defaultGachaCode) {
              const defaultGacha = availableTypes.find(
                (g: GachaType) =>
                  g.id === defaultGachaCode || g.code === defaultGachaCode
              );
              if (defaultGacha) {
                setSelectedGacha(defaultGacha);
                setInvalidRequestedGacha(false);
              } else {
                setSelectedGacha(null);
                setInvalidRequestedGacha(true);
                setRedirectToMypage(false);
              }
            } else {
              setSelectedGacha(availableTypes[0]);
            }
          } else {
            setSelectedGacha(null);
            setRedirectToMypage(true);
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

    if (userId) {
      fetchData();
    }
  }, [userId, defaultGachaCode]);

  useEffect(() => {
    if (!invalidRequestedGacha || errorShownRef.current) return;
    errorShownRef.current = true;
    showError("このガチャは現在開催しておりません。", {
      title: "ガチャを開始できません",
      confirmLabel: "OK",
      redirectTo: null,
      onConfirm: () => {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      },
    });
  }, [invalidRequestedGacha, showError]);

  useEffect(() => {
    if (!redirectToMypage || errorShownRef.current) return;
    errorShownRef.current = true;
    showError("利用可能なガチャがありません。", {
      title: "ガチャを開始できません",
      redirectTo: "/?action=mypage",
      confirmLabel: "マイページへ",
    });
  }, [redirectToMypage, showError]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "rgba(233, 218, 203, 0.95)" }}
      >
        <div className="text-center" style={{ color: "#4a3a2a" }}>
          <div className="mb-4 text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (invalidRequestedGacha) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "rgba(233, 218, 203, 0.95)" }}
      />
    );
  }

  if (!selectedGacha || gachaTypes.length === 0) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "rgba(233, 218, 203, 0.95)" }}
      >
        <div className="text-center" style={{ color: "#4a3a2a" }}>
          <div className="mb-4 text-lg">利用可能なガチャがありません</div>
          <Link
            href="/?action=mypage"
            className="rounded-lg px-4 py-2 text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#8b6f47" }}
          >
            マイページに戻る
          </Link>
        </div>
      </div>
    );
  }

  const handleGachaSelect = (gacha: GachaType) => {
    setSelectedGacha(gacha);
    setIsMenuOpen(false); // 選択したらメニューを閉じる
  };

  return (
    <div
      className="flex min-h-screen flex-col overflow-hidden"
      style={{ backgroundColor: "rgba(233, 218, 203, 0.95)", touchAction: "none" }}
    >
      {/* 上部: ポイント表示とメニューボタン */}
      {pointBalances && (
        <div
          className="border-b px-6 py-3 shadow-sm"
          style={{ backgroundColor: "#e9dacb", borderColor: "#b89f7a" }}
        >
          <div className="flex items-center justify-between gap-4">
            {/* ポイント表示 - クリック可能（デザイン改善） */}
            <Link
              href="/points"
              className="group flex flex-1 items-center gap-3 rounded-xl border-2 px-4 py-2.5 transition-all hover:shadow-md active:scale-95"
              style={{
                borderColor: "#b89f7a",
                backgroundColor: "rgba(255, 255, 255, 0.5)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
                e.currentTarget.style.borderColor = "#c8af8a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
                e.currentTarget.style.borderColor = "#b89f7a";
              }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <PointIcon size={20} className="h-5 w-5" active={true} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <PointIcon size={14} className="h-3.5 w-3.5" active={true} />
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
                  {pointBalances.total > 0 &&
                    (pointBalances.paidExpiresAt || pointBalances.freeExpiresAt) && (
                    <div className="mt-1 text-[9px] text-yellow-600/80">
                      有効期限:{" "}
                      {formatExpiryText(
                        pointBalances.paidExpiresAt || pointBalances.freeExpiresAt
                      )}
                    </div>
                  )}
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
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
              style={{
                background: "linear-gradient(to right, #b89f7a, #a68f6a)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(to right, #c8af8a, #b89f7a)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(to right, #b89f7a, #a68f6a)";
              }}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
          onClose={() => {}}
          onPointsUpdated={async () => {
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

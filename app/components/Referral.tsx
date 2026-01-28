"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import BottomNavigation from "./BottomNavigation";
import { useErrorModal } from "./ErrorModalProvider";

type ReferralHistory = {
  id: number;
  refereeId: string | null;
  referee: {
    userId: string;
    displayName: string | null;
    pictureUrl: string | null;
    createdAt: Date;
  } | null;
  completedAt: Date | null;
  refereeTotalSpent: number;
  refereeGachaCount: number;
  refereeLastActiveAt: Date | null;
  additionalRewardGranted: boolean;
};

export default function Referral({ userId }: { userId: string }) {
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referralHistory, setReferralHistory] = useState<ReferralHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showError } = useErrorModal();

  useEffect(() => {
    fetchReferralData();
  }, [userId]);

  const loadCurrentReferralLink = async () => {
    const currentRes = await fetch(`/api/referral/current?userId=${userId}`);
    if (!currentRes.ok) return;

    const currentData = await currentRes.json();
    if (currentData?.referralLink) {
      setReferralLink(currentData.referralLink);
      setExpiresAt(currentData.expiresAt || null);
      const qrCode = await QRCode.toDataURL(currentData.referralLink, {
        width: 300,
        margin: 2,
      });
      setQrCodeUrl(qrCode);
      return;
    }

    setReferralLink(null);
    setQrCodeUrl(null);
    setExpiresAt(null);
  };

  const fetchReferralData = async () => {
    try {
      await loadCurrentReferralLink();

      // 紹介履歴を取得
      const historyRes = await fetch(`/api/referral/history?userId=${userId}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setReferralCount(historyData.count);
        setReferralHistory(historyData.history);
      }
    } catch (error) {
      console.error("紹介履歴取得エラー:", error);
    }
  };

  const requestReferralLink = async (showLoading: boolean) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch("/api/referral/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        throw new Error("紹介リンクの生成に失敗しました");
      }

      const data = await res.json();
      setReferralLink(data.referralLink);
      setExpiresAt(data.expiresAt || null);

      // QRコードを生成
      const qrCode = await QRCode.toDataURL(data.referralLink, {
        width: 300,
        margin: 2,
      });
      setQrCodeUrl(qrCode);
    } catch (err: any) {
      console.error("紹介リンク生成エラー:", err);
      setError(err.message || "紹介リンクの生成に失敗しました");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleGenerateLink = async () => {
    await requestReferralLink(true);
  };

  const handleReloadLink = async () => {
    setLoading(true);
    try {
      await loadCurrentReferralLink();
    } finally {
      setLoading(false);
    }
  };

  const formatExpiryDateTime = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleCopyLink = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      alert("紹介リンクをコピーしました！");
    } catch (error) {
      console.error("コピーエラー:", error);
      showError("コピーに失敗しました", { redirectTo: null, confirmLabel: "OK" });
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "友だち紹介",
          text: "ガチャアプリに友だちを招待しよう！",
          url: referralLink,
        });
      } catch (error) {
        console.error("シェアエラー:", error);
      }
    } else {
      // シェアAPIが使えない場合はコピー
      handleCopyLink();
    }
  };

  const isExpired =
    expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

  return (
    <>
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#e9dacb' }}>
        <div className="mx-auto max-w-md">
          {/* ヒーローセクション */}
          <div className="relative overflow-hidden px-4 pt-8 pb-6">
            {/* 背景装飾 */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-10 left-10 text-6xl">🂡</div>
              <div className="absolute top-20 right-10 text-5xl">🂮</div>
              <div className="absolute bottom-10 left-20 text-4xl">🃏</div>
              <div className="absolute bottom-20 right-20 text-5xl">🃎</div>
            </div>
            
            <div className="relative z-10 text-center" style={{ color: '#4a3a2a' }}>
              <h1 className="mb-2 text-3xl font-bold drop-shadow-md">友だち紹介</h1>
              <p className="text-sm" style={{ color: '#6b5a4a' }}>友だちを招待して報酬を獲得しよう！</p>
            </div>
          </div>

          <div className="px-4 py-4">
            {error && (
              <div className="mb-6 rounded-xl backdrop-blur-sm border p-4 text-sm shadow-md" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.5)', color: '#4a3a2a' }}>
                {error}
              </div>
            )}

            {/* 紹介リンク生成 */}
            <div className="mb-6 rounded-xl backdrop-blur-sm p-6 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
              <h3 className="mb-4 text-lg font-bold drop-shadow-md" style={{ color: '#4a3a2a' }}>
                紹介リンクを生成
              </h3>

              <div className="mb-4 rounded-lg backdrop-blur-sm border p-4 text-sm" style={{ backgroundColor: 'rgba(184, 159, 122, 0.2)', borderColor: 'rgba(184, 159, 122, 0.3)', color: '#5a4a3a' }}>
                <p className="mb-2 font-semibold">📌 使い方</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>紹介リンクを生成してQRコードまたはリンクを共有</li>
                  <li>友だちがリンクを開いてアプリにアクセス</li>
                  <li>友だちが公式LINEアカウントを友だち追加すると紹介成立！</li>
                  <li>紹介リンクの有効期限は生成から1週間です</li>
                </ol>
              </div>

              {!referralLink ? (
                <button
                  onClick={handleGenerateLink}
                  disabled={loading}
                  className="w-full rounded-xl px-6 py-4 text-sm font-bold shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    color: "#4a3a2a",
                    border: "1px solid #b89f7a",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.85)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
                    }
                  }}
                >
                  {loading ? "生成中..." : "紹介リンクを生成"}
                </button>
              ) : isExpired ? (
                <div className="space-y-4">
                  <div
                    className="rounded-lg border px-4 py-3 text-sm text-center"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.12)",
                      borderColor: "rgba(239, 68, 68, 0.35)",
                      color: "#7f1d1d",
                    }}
                  >
                    有効期限が切れています。再生成してください。
                  </div>
                  {expiresAt && (
                    <div className="text-center text-xs" style={{ color: "#6b5a4a" }}>
                      期限: {formatExpiryDateTime(expiresAt)}
                    </div>
                  )}
                  <button
                    onClick={handleGenerateLink}
                    disabled={loading}
                    className="w-full rounded-xl px-6 py-4 text-sm font-bold shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.7)",
                      color: "#4a3a2a",
                      border: "1px solid #b89f7a",
                    }}
                  >
                    {loading ? "再生成中..." : "再生成する"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* QRコード表示 */}
                  {qrCodeUrl && (
                    <div className="flex justify-center">
                      <div className="rounded-xl bg-white p-4 shadow-xl">
                        <img
                          src={qrCodeUrl}
                          alt="紹介QRコード"
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                  {expiresAt && (
                    <div className="text-center text-xs" style={{ color: "#6b5a4a" }}>
                      有効期限: {formatExpiryDateTime(expiresAt)}
                    </div>
                  )}

                  {/* 紹介リンク表示 */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold" style={{ color: "#4a3a2a" }}>
                      紹介リンク
                    </label>
                    {expiresAt && (
                      <div className="mb-2 text-xs" style={{ color: "#6b5a4a" }}>
                        有効期限: {formatExpiryDateTime(expiresAt)}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={referralLink}
                        readOnly
                        className="flex-1 rounded-xl border-2 border-yellow-400/30 bg-white/95 px-4 py-3 text-sm text-gray-900 shadow-md"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="rounded-xl px-4 py-3 text-sm font-semibold transition-all active:scale-95"
                        style={{ backgroundColor: "rgba(255, 255, 255, 0.7)", color: "#4a3a2a", border: "1px solid #b89f7a" }}
                      >
                        コピー
                      </button>
                    </div>
                  </div>

                  {/* シェアボタン */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleShare}
                      className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all hover:shadow-xl active:scale-95"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.7)", color: "#4a3a2a", border: "1px solid #b89f7a" }}
                    >
                      シェア
                    </button>
                    <button
                      onClick={() => {
                        setReferralLink(null);
                        setQrCodeUrl(null);
                        setExpiresAt(null);
                      }}
                      disabled={true}
                      className="rounded-xl px-4 py-3 text-sm font-semibold transition-all active:scale-95"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.4)", color: "#8b7a6a", border: "1px solid #c8b8a6" }}
                    >
                      再生成
                    </button>
                    <button
                      onClick={handleReloadLink}
                      disabled={loading}
                      className="rounded-xl px-4 py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.7)", color: "#4a3a2a", border: "1px solid #b89f7a" }}
                    >
                      リロード
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 紹介実績 */}
            <div className="mb-6 rounded-xl backdrop-blur-sm p-6 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
              <h3 className="mb-4 text-lg font-bold drop-shadow-md" style={{ color: '#4a3a2a' }}>
                紹介実績
              </h3>

              <div className="mb-6 rounded-lg border-2 p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(184, 159, 122, 0.2)', borderColor: '#b89f7a' }}>
                <div className="mb-1 text-sm" style={{ color: '#6b5a4a' }}>紹介人数</div>
                <div className="text-4xl font-bold drop-shadow-md" style={{ color: '#4a3a2a' }}>
                  {referralCount}人
                </div>
              </div>

              {/* 紹介履歴 */}
              {referralHistory.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold" style={{ color: '#4a3a2a' }}>紹介履歴</h4>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {referralHistory.map((history) => (
                      <div
                        key={history.id}
                        className="rounded-xl border-2 border-yellow-400/30 bg-gradient-to-r from-white/95 to-white/90 p-4 shadow-md"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {history.referee?.pictureUrl && (
                              <img
                                src={history.referee.pictureUrl}
                                alt={history.referee.displayName || ""}
                                className="h-12 w-12 flex-shrink-0 rounded-full border-2 shadow-sm"
                                style={{ borderColor: '#b89f7a' }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="mb-1 font-semibold truncate" style={{ color: '#4a3a2a' }}>
                                {history.referee?.displayName || "（表示名なし）"}
                              </div>
                              <div className="text-xs" style={{ color: '#6b5a4a' }}>
                                {history.completedAt ? (
                                  <>
                                    成立日: {new Date(history.completedAt).toLocaleDateString("ja-JP")}
                                  </>
                                ) : (
                                  "成立日: -"
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm flex-shrink-0">
                            <div className="text-gray-700 font-medium">
                              課金: ¥{history.refereeTotalSpent.toLocaleString()}
                            </div>
                            <div className="text-gray-600">
                              ガチャ: {history.refereeGachaCount}回
                            </div>
                            {history.additionalRewardGranted && (
                              <div className="mt-1 text-xs text-green-600 font-semibold">
                                ✓ 追加報酬付与済み
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center" style={{ color: '#6b5a4a' }}>
                  まだ紹介履歴がありません
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <BottomNavigation currentPage="referral" />
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import liff from '@line/liff';

type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};
import QRCode from 'qrcode';

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
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referralHistory, setReferralHistory] = useState<ReferralHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferralData();
  }, [userId]);

  const fetchReferralData = async () => {
    try {
      // 紹介履歴を取得
      const historyRes = await fetch(`/api/referral/history?userId=${userId}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setReferralCount(historyData.count);
        setReferralHistory(historyData.history);
      }
    } catch (error) {
      console.error('紹介履歴取得エラー:', error);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/referral/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        throw new Error('紹介リンクの生成に失敗しました');
      }

      const data = await res.json();
      setReferralLink(data.referralLink);

      // QRコードを生成
      const qrCode = await QRCode.toDataURL(data.referralLink, {
        width: 300,
        margin: 2,
      });
      setQrCodeUrl(qrCode);
    } catch (err: any) {
      console.error('紹介リンク生成エラー:', err);
      setError(err.message || '紹介リンクの生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      alert('紹介リンクをコピーしました！');
    } catch (error) {
      console.error('コピーエラー:', error);
      alert('コピーに失敗しました');
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '友だち紹介',
          text: 'ガチャアプリに友だちを招待しよう！',
          url: referralLink,
        });
      } catch (error) {
        console.error('シェアエラー:', error);
      }
    } else {
      // シェアAPIが使えない場合はコピー
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">友だち紹介</h2>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* 紹介リンク生成 */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">
          紹介リンクを生成
        </h3>

        <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          <p className="font-medium">📌 使い方</p>
          <p className="mt-1">
            1. 紹介リンクを生成してQRコードまたはリンクを共有<br />
            2. 友だちがリンクを開いてアプリにアクセス<br />
            3. 友だちが公式LINEアカウントを友だち追加すると紹介成立！
          </p>
        </div>

        {!referralLink ? (
          <button
            onClick={handleGenerateLink}
            disabled={loading}
            className="w-full rounded-md bg-blue-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '生成中...' : '紹介リンクを生成'}
          </button>
        ) : (
          <div className="space-y-4">
            {/* QRコード表示 */}
            {qrCodeUrl && (
              <div className="flex justify-center">
                <img src={qrCodeUrl} alt="紹介QRコード" className="rounded-lg" />
              </div>
            )}

            {/* 紹介リンク表示 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                紹介リンク
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
                <button
                  onClick={handleCopyLink}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  コピー
                </button>
              </div>
            </div>

            {/* シェアボタン */}
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex-1 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
              >
                シェア
              </button>
              <button
                onClick={() => {
                  setReferralLink(null);
                  setQrCodeUrl(null);
                }}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
              >
                再生成
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 紹介実績 */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">
          紹介実績
        </h3>

        <div className="mb-4 rounded-md bg-blue-50 p-4">
          <div className="text-sm text-gray-600">紹介人数</div>
          <div className="text-2xl font-bold text-blue-600">{referralCount}人</div>
        </div>

        {/* 紹介履歴 */}
        {referralHistory.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">紹介履歴</h4>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {referralHistory.map((history) => (
                <div
                  key={history.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 p-3"
                >
                  <div className="flex items-center gap-3">
                    {history.referee?.pictureUrl && (
                      <img
                        src={history.referee.pictureUrl}
                        alt={history.referee.displayName || ''}
                        className="h-10 w-10 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {history.referee?.displayName || '（表示名なし）'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {history.completedAt
                          ? new Date(history.completedAt).toLocaleDateString('ja-JP')
                          : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-600">
                      課金: ¥{history.refereeTotalSpent.toLocaleString()}
                    </div>
                    <div className="text-gray-600">
                      ガチャ: {history.refereeGachaCount}回
                    </div>
                    {history.additionalRewardGranted && (
                      <div className="mt-1 text-xs text-green-600">
                        ✓ 追加報酬付与済み
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            まだ紹介履歴がありません
          </div>
        )}
      </div>
    </div>
  );
}


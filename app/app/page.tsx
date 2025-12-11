'use client';

import { useEffect, useState } from 'react';
import { initLiff, getProfile, isLoggedIn, login, type LiffProfile } from '@/lib/liff';
import GachaModal from '@/components/GachaModal';

export default function Home() {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGachaModalOpen, setIsGachaModalOpen] = useState(false);
  const [points, setPoints] = useState<number | null>(null);

  // URLパラメータからactionを取得してガチャモーダルを開く
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'gacha' && profile) {
        setIsGachaModalOpen(true);
      }
    }
  }, [profile]);

  useEffect(() => {
    const initialize = async () => {
      try {
        // LIFF IDは環境変数から取得（後で設定）
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';
        
        if (!liffId) {
          setError('LIFF IDが設定されていません');
          setLoading(false);
          return;
        }

        await initLiff(liffId);

        if (!isLoggedIn()) {
          login();
          return;
        }

        const userProfile = await getProfile();
        setProfile(userProfile);

        // ユーザー登録
        try {
          await fetch('/api/users/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userProfile.userId,
              displayName: userProfile.displayName,
              pictureUrl: userProfile.pictureUrl,
            }),
          });
        } catch (error) {
          console.error('ユーザー登録エラー:', error);
        }

        // ポイント残高を取得
        try {
          const res = await fetch(`/api/points/balance?userId=${userProfile.userId}`);
          if (res.ok) {
            const data = await res.json();
            setPoints(data.points);
          }
        } catch (error) {
          console.error('ポイント残高取得エラー:', error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-red-500">
          <div className="mb-4 text-lg">エラー: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-gray-100">
        {/* トーク画面風のUI（簡易版） */}
        <main className="flex-1 p-4">
          <div className="mx-auto max-w-md">
            <h1 className="mb-4 text-center text-2xl font-bold text-gray-800">
              Gacha Lab
            </h1>
            
            {profile && (
              <div className="mb-4 rounded-lg bg-white p-4 shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {profile.pictureUrl && (
                      <img
                        src={profile.pictureUrl}
                        alt={profile.displayName}
                        className="h-12 w-12 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-semibold">{profile.displayName}</div>
                      <div className="text-xs text-gray-500">ID: {profile.userId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">ポイント</div>
                    <div className="text-xl font-bold text-blue-600">
                      {points !== null ? points.toLocaleString() : '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-white p-4 shadow">
              <p className="mb-4 text-center text-gray-600">
                ガチャボタンを押してガチャを引こう！
              </p>
            </div>
          </div>
        </main>

        {/* 下部メニューバー（ガチャボタン） */}
        <div className="border-t bg-white p-4">
          <div className="mx-auto max-w-md">
            <button
              onClick={() => setIsGachaModalOpen(true)}
              className="w-full rounded-lg bg-blue-500 px-6 py-3 text-lg font-bold text-white transition-colors hover:bg-blue-600"
            >
              ガチャ
            </button>
          </div>
        </div>
      </div>

      {/* 全画面ガチャモーダル */}
      {profile && (
        <GachaModal
          isOpen={isGachaModalOpen}
          onClose={() => {
            setIsGachaModalOpen(false);
            // URLパラメータをクリア
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('action');
              window.history.replaceState({}, '', url.toString());
            }
          }}
          userId={profile.userId}
        />
      )}
    </>
  );
}

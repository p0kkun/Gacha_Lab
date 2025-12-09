'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { initLiff, getProfile, isLoggedIn, login, type LiffProfile } from '@/lib/liff';
import GachaModal from '@/components/GachaModal';

function SearchParamsHandler({
  onActionChange,
}: {
  onActionChange: (action: string | null) => void;
}) {
  const searchParams = useSearchParams();

  // URLパラメータからアクションを取得して処理
  useEffect(() => {
    const action = searchParams.get('action');
    onActionChange(action);
  }, [searchParams, onActionChange]);

  return null;
}

export default function AppPage() {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGachaModalOpen, setIsGachaModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState<'home' | 'mypage' | 'history' | 'referral'>('home');

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // URLパラメータからアクションを処理
  const handleActionChange = (action: string | null) => {
    if (action) {
      switch (action) {
        case 'gacha':
          setIsGachaModalOpen(true);
          setActivePage('home');
          break;
        case 'mypage':
          setActivePage('mypage');
          break;
        case 'history':
          setActivePage('history');
          break;
        case 'referral':
          setActivePage('referral');
          break;
        default:
          setActivePage('home');
      }
    }
  };

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
      <Suspense fallback={null}>
        <SearchParamsHandler onActionChange={handleActionChange} />
      </Suspense>
      <div className="flex h-screen flex-col bg-gray-100">
        {/* メインコンテンツ領域 */}
        <main className={`overflow-y-auto p-4 ${isMenuOpen ? 'flex-[2]' : 'flex-1'}`}>
          <div className="mx-auto max-w-md">
            {/* アクティブページに応じたコンテンツを表示 */}
            {activePage === 'home' && (
              <>
                <h1 className="mb-4 text-center text-2xl font-bold text-gray-800">
                  Gacha Lab
                </h1>
                
                {profile && (
                  <div className="mb-4 rounded-lg bg-white p-4 shadow">
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
                  </div>
                )}

                <div className="rounded-lg bg-white p-4 shadow">
                  <p className="mb-4 text-center text-gray-600">
                    ガチャボタンを押してガチャを引こう！
                  </p>
                </div>
              </>
            )}

            {activePage === 'mypage' && (
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-gray-800">マイページ</h1>
                {profile && (
                  <div className="rounded-lg bg-white p-4 shadow">
                    <div className="flex items-center gap-3">
                      {profile.pictureUrl && (
                        <img
                          src={profile.pictureUrl}
                          alt={profile.displayName}
                          className="h-16 w-16 rounded-full"
                        />
                      )}
                      <div>
                        <div className="text-lg font-semibold">{profile.displayName}</div>
                        <div className="text-sm text-gray-500">ID: {profile.userId}</div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-lg bg-white p-4 shadow">
                  <h2 className="mb-2 font-semibold">獲得アイテム</h2>
                  <p className="text-sm text-gray-600">（今後実装予定）</p>
                </div>
              </div>
            )}

            {activePage === 'history' && (
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-gray-800">抽選履歴</h1>
                <div className="rounded-lg bg-white p-4 shadow">
                  <p className="text-sm text-gray-600">（今後実装予定）</p>
                </div>
              </div>
            )}

            {activePage === 'referral' && (
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-gray-800">友達を招待</h1>
                <div className="rounded-lg bg-white p-4 shadow">
                  <p className="text-sm text-gray-600">（今後実装予定）</p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* 閉じる機構（メニューが開いている時、メニュー領域の上に表示） */}
        {isMenuOpen && (
          <div className="border-t bg-gray-100 p-2">
            <button
              onClick={() => setIsMenuOpen(false)}
              className="w-full rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-400"
            >
              メニューを閉じる
            </button>
          </div>
        )}

        {/* 下部メニュー領域（開閉式、1/3の高さ） */}
        {isMenuOpen && (
          <div className="flex-[1] border-t bg-gray-50">
            <div className="flex h-full flex-col px-4 py-2">
              {/* 上4個のボタン */}
              <div className="mb-2 flex flex-1 gap-2">
                <button
                  onClick={() => {}}
                  className="flex-1 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  メニュー1
                </button>
                <button
                  onClick={() => setIsGachaModalOpen(true)}
                  className="flex-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                >
                  ガチャ
                </button>
                <button
                  onClick={() => {}}
                  className="flex-1 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  メニュー3
                </button>
                <button
                  onClick={() => {}}
                  className="flex-1 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  メニュー4
                </button>
              </div>

              {/* 下4個のボタン */}
              <div className="flex flex-1 gap-2">
                <button
                  onClick={() => {}}
                  className="flex-1 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  メニュー5
                </button>
                <button
                  onClick={() => {}}
                  className="flex-1 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  メニュー6
                </button>
                <button
                  onClick={() => {}}
                  className="flex-1 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  メニュー7
                </button>
                <button
                  onClick={() => {}}
                  className="flex-1 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  メニュー8
                </button>
              </div>
            </div>
          </div>
        )}

        {/* メニュー開閉ボタン（常に表示） */}
        {!isMenuOpen && (
          <div className="border-t bg-white p-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="w-full rounded-lg bg-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-400"
            >
              メニューを開く
            </button>
          </div>
        )}
      </div>

      {/* 全画面ガチャモーダル */}
      {profile && (
        <GachaModal
          isOpen={isGachaModalOpen}
          onClose={() => setIsGachaModalOpen(false)}
          userId={profile.userId}
        />
      )}
    </>
  );
}


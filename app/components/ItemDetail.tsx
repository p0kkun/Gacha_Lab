'use client';

import { useState } from 'react';

type UserItem = {
  id: number;
  item: {
    id: number;
    name: string;
    rarity: string;
    usageType: string;
    imageUrl: string | null;
  };
  createdAt: string;
  usedAt: string | null;
};

type ItemDetailProps = {
  userItem: UserItem;
  userId: string;
  onBack: () => void;
  onUse: () => void;
};

export default function ItemDetail({
  userItem,
  userId,
  onBack,
  onUse,
}: ItemDetailProps) {
  const [isUsing, setIsUsing] = useState(false);
  const [showUsageScreen, setShowUsageScreen] = useState(false);

  const getRarityLabel = (rarity: string): string => {
    const labels: Record<string, string> = {
      FIRST_PRIZE: '1等',
      SECOND_PRIZE: '2等',
      THIRD_PRIZE: '3等',
      FOURTH_PRIZE: '4等',
      FIFTH_PRIZE: '5等',
      LOSER: 'ハズレ',
    };
    return labels[rarity] || rarity;
  };

  const getItemDescription = (name: string, rarity: string): string => {
    // アイテム名から説明文を生成
    if (name.includes('1000円')) {
      return '1000円オフクーポン券';
    } else if (name.includes('3000円')) {
      return '3000円オフクーポン券';
    } else if (name.includes('5000円')) {
      return '5000円オフクーポン券';
    } else if (name.includes('MAIN EVENT') || name.includes('INVITATION')) {
      return '無料クーポン券';
    }
    return name;
  };

  const handleUse = async () => {
    if (isUsing) return;

    setIsUsing(true);
    try {
      // アイテム使用APIを呼び出し
      const res = await fetch(
        `/api/users/${userId}/items/${userItem.id}/use`,
        {
          method: 'POST',
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'アイテムの使用に失敗しました');
        return;
      }

      setShowUsageScreen(true);
      onUse(); // 親コンポーネントに通知
    } catch (error) {
      console.error('アイテム使用エラー:', error);
      alert('アイテムの使用に失敗しました');
    } finally {
      setIsUsing(false);
    }
  };

  // アイテム使用画面を表示
  if (showUsageScreen) {
    const expirationDate = new Date(userItem.createdAt);
    expirationDate.setMonth(expirationDate.getMonth() + 3); // 3ヶ月後を有効期限とする
    const isImage = userItem.item.usageType === 'IMAGE';

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-md">
          {/* ヘッダー */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <button
              onClick={() => {
                setShowUsageScreen(false);
                onBack();
              }}
              className="mb-4 text-blue-600 hover:text-blue-800"
            >
              ← 戻る
            </button>
            <h1 className="text-2xl font-bold text-gray-800">アイテム使用</h1>
          </div>

          {/* アイテム情報 */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 text-center">
              <div className="mb-2 text-lg font-bold text-gray-800">
                {userItem.item.name}
              </div>
              <div className="text-sm text-gray-600">
                {getItemDescription(userItem.item.name, userItem.item.rarity)}
              </div>
            </div>

            {/* IMAGEタイプ: 画像を表示、SHOW_TO_STAFFタイプ: 見せて使用画面 */}
            {isImage ? (
              <>
                {userItem.item.imageUrl ? (
                  <>
                    <div className="mb-6 flex justify-center">
                      <div className="rounded-lg bg-white p-4 shadow-lg">
                        <img
                          src={userItem.item.imageUrl}
                          alt="アイテム画像"
                          className="h-64 w-64 object-contain"
                        />
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-600">
                      使用期限: {expirationDate.toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}まで
                    </div>
                  </>
                ) : (
                  <div className="mb-6 rounded-lg bg-yellow-50 p-6 text-center">
                    <div className="mb-2 text-lg font-semibold text-yellow-800">
                      画像が設定されていません
                    </div>
                    <div className="text-sm text-yellow-600">
                      管理画面で画像を設定してください
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-6 rounded-lg bg-blue-50 p-6 text-center">
                  <div className="mb-4 text-4xl">📱</div>
                  <div className="mb-2 text-lg font-semibold text-gray-800">
                    店員にこの画面を見せてください
                  </div>
                  <div className="text-sm text-gray-600">
                    店員が使用済みボタンを押して使用完了となります
                  </div>
                </div>
                <div className="mb-4 rounded-lg bg-gray-100 p-4">
                  <div className="mb-2 text-sm font-semibold text-gray-700">
                    アイテム情報
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>アイテム名: {userItem.item.name}</div>
                    <div>獲得日: {new Date(userItem.createdAt).toLocaleDateString('ja-JP')}</div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-600">
                  使用期限: {expirationDate.toLocaleString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}まで
                </div>
              </>
            )}
          </div>

          {/* メニューリンク */}
          <div className="mt-6 space-y-2 rounded-lg bg-white p-4 shadow">
            <a
              href="?action=gacha"
              className="block rounded-md bg-blue-500 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-600"
            >
              ガチャを引く
            </a>
            <a
              href="/points"
              className="block rounded-md bg-green-500 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-green-600"
            >
              ポイント購入
            </a>
          </div>
        </div>
      </div>
    );
  }

  // アイテム詳細画面
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md">
        {/* ヘッダー */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <button
            onClick={onBack}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← 戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-800">アイテム詳細</h1>
        </div>

        {/* アイテム情報 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
              {getRarityLabel(userItem.item.rarity)}
            </span>
            <span className="text-sm text-gray-500">
              獲得日: {new Date(userItem.createdAt).toLocaleDateString('ja-JP')}
            </span>
          </div>

          <div className="mb-4">
            <h2 className="mb-2 text-xl font-bold text-gray-800">
              {userItem.item.name}
            </h2>
            <p className="text-gray-600">
              {getItemDescription(userItem.item.name, userItem.item.rarity)}
            </p>
          </div>

          {/* 使用ボタン */}
          {userItem.usedAt ? (
            <div className="mt-4">
              <button
                disabled
                className="w-full rounded-md bg-gray-300 px-4 py-3 font-semibold text-gray-600"
              >
                使用済み
              </button>
              <p className="mt-2 text-center text-sm text-gray-500">
                使用日: {new Date(userItem.usedAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <button
                onClick={handleUse}
                disabled={isUsing}
                className="w-full rounded-md bg-blue-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-600"
              >
                {isUsing ? '処理中...' : '使用する'}
              </button>
            </div>
          )}
        </div>

        {/* メニューリンク */}
        <div className="mt-6 space-y-2 rounded-lg bg-white p-4 shadow">
          <a
            href="?action=gacha"
            className="block rounded-md bg-blue-500 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-600"
          >
            ガチャを引く
          </a>
          <a
            href="/points"
            className="block rounded-md bg-green-500 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-green-600"
          >
            ポイント購入
          </a>
        </div>
      </div>
    </div>
  );
}


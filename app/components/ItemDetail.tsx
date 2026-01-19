'use client';

import React, { useState, useEffect } from 'react';
import ConfirmModal from '@/components/admin/ConfirmModal';

type UserItem = {
  id: number;
  item: {
    id: number;
    name: string;
    description: string | null;
    rarity: string;
    usageType: string;
    imageUrl: string | null;
    useStartAt: string | null;
    useEndAt: string | null;
  };
  createdAt: string;
  usedAt: string | null;
};

type PrizeTier = {
  code: string;
  label: string;
  displayOrder: number;
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [prizeTiers, setPrizeTiers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPrizeTiers();
  }, []);

  const fetchPrizeTiers = async () => {
    try {
      const res = await fetch('/api/prize-tiers');
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
      console.error('等級マスタ取得エラー:', error);
    }
  };

  const getRarityLabel = (rarity: string): string => {
    return prizeTiers[rarity] || rarity;
  };

  // MarkdownリンクをHTMLに変換
  const renderDescription = (text: string | null): React.ReactElement => {
    if (!text) {
      // 説明文がない場合はアイテム名から生成（後方互換性）
      const fallback = getItemDescription(userItem.item.name, userItem.item.rarity);
      return <p className="text-white/90">{fallback}</p>;
    }

    // Markdownリンク [テキスト](URL) を検出して変換
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // リンク前のテキスト
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // リンク要素
      parts.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-300 underline hover:text-yellow-200"
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    // 残りのテキスト
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <p className="text-white/90">{parts.length > 0 ? parts : text}</p>;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getItemDescription = (name: string, _rarity: string): string => {
    // アイテム名から説明文を生成（後方互換性）
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

  const handleUseClick = () => {
    // 確認モーダルを表示
    setShowConfirmModal(true);
  };

  const handleUseConfirm = async () => {
    if (isUsing) return;

    setShowConfirmModal(false);
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

  // アイテムの状態を判定
  const getItemStatus = (): 'available' | 'used' | 'expired' | 'notStarted' => {
    if (userItem.usedAt) {
      return 'used';
    }

    const now = new Date();
    const useStartAt = userItem.item.useStartAt ? new Date(userItem.item.useStartAt) : null;
    const useEndAt = userItem.item.useEndAt ? new Date(userItem.item.useEndAt) : null;

    if (useStartAt && now < useStartAt) {
      return 'notStarted';
    }
    if (useEndAt && now > useEndAt) {
      return 'expired';
    }

    return 'available';
  };

  const itemStatus = getItemStatus();

  // アイテム使用画面を表示
  if (showUsageScreen) {
    const expirationDate = userItem.item.useEndAt
      ? new Date(userItem.item.useEndAt)
      : (() => {
          const d = new Date(userItem.createdAt);
          d.setMonth(d.getMonth() + 3); // デフォルトは3ヶ月後
          return d;
        })();
    const isImage = userItem.item.usageType === 'IMAGE';

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 pb-20">
        <div className="mx-auto max-w-md">
          {/* 戻るボタン */}
          <div className="px-4 pt-4">
            <button
              onClick={() => {
                setShowUsageScreen(false);
                onBack();
              }}
              className="text-white/80 hover:text-white transition-colors"
            >
              ← 戻る
            </button>
          </div>

          {/* ヒーローセクション */}
          <div className="relative overflow-hidden px-4 pt-4 pb-6">
            {/* 背景装飾 */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 text-6xl">🂡</div>
              <div className="absolute top-20 right-10 text-5xl">🂮</div>
              <div className="absolute bottom-10 left-20 text-4xl">🃏</div>
              <div className="absolute bottom-20 right-20 text-5xl">🃎</div>
            </div>
            
            <div className="relative z-10 text-center text-white">
              <h1 className="mb-2 text-3xl font-bold drop-shadow-lg">アイテム使用</h1>
              <p className="text-sm text-green-200">使用中のアイテム</p>
            </div>
          </div>

          <div className="px-4 py-4">
            {/* アイテム情報 */}
            <div className="mb-6 rounded-xl bg-white/10 backdrop-blur-sm p-6 shadow-md">
            <div className="mb-4 text-center">
              <div className="mb-2 text-lg font-bold text-white">
                {userItem.item.name}
              </div>
              <div className="text-sm text-white/90">
                {userItem.item.description ? (
                  <div className="text-white/90">{renderDescription(userItem.item.description)}</div>
                ) : (
                  <div className="text-white/90">{getItemDescription(userItem.item.name, userItem.item.rarity)}</div>
                )}
              </div>
            </div>

            {/* IMAGEタイプ: 画像を表示、SHOW_TO_STAFFタイプ: 見せて使用画面 */}
            {isImage ? (
              <>
                {userItem.item.imageUrl ? (
                  <>
                    <div className="mb-6 flex justify-center">
                      <div className="rounded-xl bg-white/20 backdrop-blur-sm p-4 shadow-lg">
                        <img
                          src={userItem.item.imageUrl}
                          alt="アイテム画像"
                          className="h-64 w-64 object-contain"
                          onError={(e) => {
                            // 画像読み込み失敗時の処理
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const placeholder = target.parentElement?.querySelector('.image-placeholder') as HTMLElement;
                            if (placeholder) {
                              placeholder.style.display = 'flex';
                            }
                          }}
                        />
                        {/* 画像読み込み失敗時のプレースホルダー */}
                        <div className="image-placeholder hidden h-64 w-64 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500/30 to-yellow-600/30 border-2 border-yellow-400/50">
                          <div className="mb-2 text-6xl">🎫</div>
                          <div className="text-sm font-semibold text-yellow-200">COUPON</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm text-white/90">
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
                  <>
                    {/* 画像がない場合: 必須情報を優先表示 */}
                    <div className="mb-6 space-y-4">
                      {/* プレースホルダー（ガチャ用デフォルト画像風） */}
                      <div className="flex justify-center">
                        <div className="relative h-64 w-64 rounded-xl bg-gradient-to-br from-yellow-500/30 via-yellow-400/20 to-yellow-600/30 border-2 border-yellow-400/50 shadow-lg overflow-hidden">
                          {/* 背景装飾 */}
                          <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-4 left-4 text-4xl">🂡</div>
                            <div className="absolute bottom-4 right-4 text-4xl">🂮</div>
                          </div>
                          {/* 中央コンテンツ */}
                          <div className="relative flex h-full w-full flex-col items-center justify-center p-4">
                            <div className="mb-3 text-6xl">🎫</div>
                            <div className="mb-1 text-lg font-bold text-yellow-200">COUPON</div>
                            <div className="text-xs text-yellow-100/80">特典</div>
                          </div>
                        </div>
                      </div>

                      {/* 必須情報セクション */}
                      <div className="space-y-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4">
                        {/* クーポン名 */}
                        <div>
                          <div className="mb-1 text-xs font-semibold text-white/70">クーポン名</div>
                          <div className="text-lg font-bold text-white">{userItem.item.name}</div>
                        </div>

                        {/* 割引内容（説明文から抽出） */}
                        {userItem.item.description && (
                          <div>
                            <div className="mb-1 text-xs font-semibold text-white/70">割引内容</div>
                            <div className="text-sm text-white/90">{userItem.item.description}</div>
                          </div>
                        )}

                        {/* 有効期限 */}
                        <div>
                          <div className="mb-1 text-xs font-semibold text-white/70">有効期限</div>
                          <div className="text-sm text-white/90">
                            {userItem.item.useStartAt ? (
                              <>
                                {new Date(userItem.item.useStartAt).toLocaleString('ja-JP', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })} 〜
                              </>
                            ) : null}
                            {expirationDate.toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        {/* 提示方法 */}
                        <div>
                          <div className="mb-1 text-xs font-semibold text-white/70">提示方法</div>
                          <div className="text-sm text-white/90">
                            {userItem.item.usageType === 'IMAGE' ? '画像を提示' : '店員に画面を見せる'}
                          </div>
                        </div>

                        {/* 識別子（クーポンID） */}
                        <div>
                          <div className="mb-1 text-xs font-semibold text-white/70">クーポンID</div>
                          <div className="rounded-lg bg-white/20 px-3 py-2 text-center font-mono text-sm font-bold text-yellow-200">
                            {String(userItem.id).padStart(8, '0')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="mb-6 rounded-xl bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 p-6 text-center">
                  <div className="mb-4 text-4xl">📱</div>
                  <div className="mb-2 text-lg font-semibold text-white">
                    店員にこの画面を見せてください
                  </div>
                  <div className="text-sm text-white/90">
                    店員が使用済みボタンを押して使用完了となります
                  </div>
                </div>
                <div className="mb-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4">
                  <div className="mb-2 text-sm font-semibold text-white">
                    アイテム情報
                  </div>
                  <div className="text-sm text-white/90">
                    <div>アイテム名: {userItem.item.name}</div>
                    <div>獲得日: {new Date(userItem.createdAt).toLocaleDateString('ja-JP')}</div>
                  </div>
                </div>
                <div className="text-center text-sm text-white/90">
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
          </div>
        </div>
      </div>
    );
  }

  // アイテム詳細画面
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 pb-20">
      <div className="mx-auto max-w-md">
        {/* 戻るボタン */}
        <div className="px-4 pt-4">
          <button
            onClick={onBack}
            className="text-white/80 hover:text-white transition-colors"
          >
            ← 戻る
          </button>
        </div>

        {/* ヒーローセクション */}
        <div className="relative overflow-hidden px-4 pt-4 pb-6">
          {/* 背景装飾 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 text-6xl">🂡</div>
            <div className="absolute top-20 right-10 text-5xl">🂮</div>
            <div className="absolute bottom-10 left-20 text-4xl">🃏</div>
            <div className="absolute bottom-20 right-20 text-5xl">🃎</div>
          </div>
          
          <div className="relative z-10 text-center text-white">
            <h1 className="mb-2 text-3xl font-bold drop-shadow-lg">アイテム詳細</h1>
            <p className="text-sm text-green-200">獲得したアイテムの詳細</p>
          </div>
        </div>

        <div className="px-4 py-4">
          {/* アイテム情報 */}
          <div className="mb-6 rounded-xl bg-white/10 backdrop-blur-sm p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 px-3 py-1 text-sm font-semibold text-white shadow-sm">
              {getRarityLabel(userItem.item.rarity)}
            </span>
            <span className="text-sm text-white/80">
              獲得日: {new Date(userItem.createdAt).toLocaleDateString('ja-JP')}
            </span>
          </div>

          <div className="mb-4">
            <h2 className="mb-2 text-xl font-bold text-white">
              {userItem.item.name}
            </h2>
            <div className="text-white/90">{renderDescription(userItem.item.description)}</div>
          </div>

          {/* 使用開始前・使用期限切れの警告 */}
          {itemStatus === 'notStarted' && userItem.item.useStartAt && (
            <div className="mb-4 rounded-xl bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 p-4">
              <div className="text-sm font-semibold text-yellow-200">使用開始前</div>
              <div className="mt-1 text-xs text-yellow-100">
                使用開始日時: {new Date(userItem.item.useStartAt).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          )}

          {itemStatus === 'expired' && userItem.item.useEndAt && (
            <div className="mb-4 rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-400/30 p-4">
              <div className="text-sm font-semibold text-red-200">使用期限切れ</div>
              <div className="mt-1 text-xs text-red-100">
                使用期限: {new Date(userItem.item.useEndAt).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          )}

          {/* 使用期限の表示（使用可能な場合のみ） */}
          {itemStatus === 'available' && (
            <div className="mb-4 rounded-xl bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 p-4">
              <div className="text-xs text-blue-100">
                {userItem.item.useEndAt ? (
                  <>
                    使用期限: {new Date(userItem.item.useEndAt).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                ) : (
                  <span className="text-white/70">期限なし</span>
                )}
              </div>
            </div>
          )}

          {/* 使用ボタン */}
          {itemStatus === 'used' ? (
            <div className="mt-4">
              <button
                disabled
                className="w-full rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-3 font-semibold text-white/70"
              >
                使用済み
              </button>
              <p className="mt-2 text-center text-sm text-white/80">
                使用日: {new Date(userItem.usedAt!).toLocaleDateString('ja-JP')}
              </p>
            </div>
          ) : itemStatus === 'notStarted' || itemStatus === 'expired' ? (
            <div className="mt-4">
              <button
                disabled
                className={`w-full rounded-xl px-4 py-3 font-semibold ${
                  itemStatus === 'notStarted'
                    ? 'bg-yellow-500/30 border border-yellow-400/30 text-yellow-200'
                    : 'bg-red-500/30 border border-red-400/30 text-red-200'
                }`}
              >
                {itemStatus === 'notStarted' ? '使用開始前' : '使用期限切れ'}
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <button
                onClick={handleUseClick}
                disabled={isUsing}
                className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:from-yellow-600 hover:to-yellow-700 hover:shadow-xl disabled:bg-white/20 disabled:text-white/50"
              >
                {isUsing ? '処理中...' : '使用する'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* 確認モーダル */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="アイテムを使用しますか？"
        message={
          <div>
            <p className="mb-2">このアイテムを使用しますか？</p>
            <p className="text-sm text-gray-600">
              使用すると使用済みになり、再度使用できません。
            </p>
          </div>
        }
        confirmText="使用する"
        cancelText="キャンセル"
        variant="warning"
        onConfirm={handleUseConfirm}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}


'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/admin/ConfirmModal';
import { useErrorModal } from '@/components/ErrorModalProvider';
import { CardBackIcon, PhoneIcon } from '@/components/icons/AppIcons';
import BottomNavigation from '@/components/BottomNavigation';
import LegalFooterLinks from '@/components/LegalFooterLinks';

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
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [pendingExitHref, setPendingExitHref] = useState<string | null>(null);
  const [pendingExitAction, setPendingExitAction] = useState<'back' | 'nav' | null>(null);
  const [prizeTiers, setPrizeTiers] = useState<Record<string, string>>({});
  const { showError } = useErrorModal();
  const router = useRouter();
  const useButtonRef = useRef<HTMLButtonElement | null>(null);

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
  const renderDescription = (
    text: string | null,
    className: string = "text-[#5a4a3a]"
  ): React.ReactElement => {
    if (!text) {
      // 説明文がない場合はアイテム名から生成（後方互換性）
      const fallback = getItemDescription(userItem.item.name, userItem.item.rarity);
      return <p className={className}>{fallback}</p>;
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

    return <p className={className}>{parts.length > 0 ? parts : text}</p>;
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

  const handleUseClick = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // LIFF/Safari だと focus/hover が残って「押下済み」っぽく見えることがあるので外す
    e?.currentTarget.blur();
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
        const errorMessage = error.error || 'アイテムの使用に失敗しました';
        
        // 使用期限切れの判定
        if (
          errorMessage.includes('使用期限') ||
          errorMessage.includes('使用期間') ||
          errorMessage.includes('期限が切れ') ||
          errorMessage.includes('期間が終了')
        ) {
          showError('アイテム使用期間が終了しました。', {
            redirectTo: null,
            confirmLabel: 'OK',
            onConfirm: () => {
              window.location.reload();
            },
          });
        } else {
          // その他の使用処理失敗
          showError('使用処理に失敗しました。\nお手数ですが、時間をおいて再度お試しください。', {
            redirectTo: null,
            confirmLabel: '閉じる',
          });
        }
        return;
      }

      setShowUsageScreen(true);
      onUse(); // 親コンポーネントに通知
    } catch (error) {
      console.error('アイテム使用エラー:', error);
      showError('使用処理に失敗しました。\nお手数ですが、時間をおいて再度お試しください。', {
        redirectTo: null,
        confirmLabel: '閉じる',
      });
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

  const requestExitConfirmation = (action: 'back' | 'nav', href?: string) => {
    setPendingExitAction(action);
    setPendingExitHref(href ?? null);
    setShowExitConfirmModal(true);
  };

  const handleExitConfirm = () => {
    setShowExitConfirmModal(false);
    if (pendingExitAction === 'back') {
      setShowUsageScreen(false);
      onBack();
      return;
    }
    if (pendingExitHref) {
      router.push(pendingExitHref);
    }
  };

  const handleExitCancel = () => {
    setShowExitConfirmModal(false);
    setPendingExitAction(null);
    setPendingExitHref(null);
  };

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
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#e9dacb' }}>
         <div className="mx-auto max-w-md">
           {/* 戻るボタン */}
           <div className="px-4 pt-4">
            <button
              onClick={() => requestExitConfirmation('back')}
              className="transition-colors hover:opacity-80"
              style={{ color: '#6b5a4a' }}
            >
              ← 戻る
            </button>
          </div>

          {/* ヒーローセクション */}
          <div className="relative overflow-hidden px-4 pt-4 pb-6">
            {/* 背景装飾 */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-10 left-10">
                <CardBackIcon className="h-14 w-14" />
              </div>
              <div className="absolute top-20 right-10">
                <CardBackIcon className="h-12 w-12" />
              </div>
              <div className="absolute bottom-10 left-20">
                <CardBackIcon className="h-10 w-10" />
              </div>
              <div className="absolute bottom-20 right-20">
                <CardBackIcon className="h-12 w-12" />
              </div>
            </div>
            
            <div className="relative z-10 text-center" style={{ color: '#4a3a2a' }}>
              <h1 className="mb-2 text-3xl font-bold drop-shadow-md">アイテム使用</h1>
              <p className="text-sm" style={{ color: '#6b5a4a' }}>使用中のアイテム</p>
            </div>
          </div>

          <div className="px-4 py-4">
            {/* アイテム情報 */}
            <div className="mb-6 rounded-xl backdrop-blur-sm p-6 shadow-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
            <div className="mb-4 text-center">
              <div className="mb-2 text-lg font-bold" style={{ color: '#4a3a2a' }}>
                {userItem.item.name}
              </div>
              <div className="text-sm" style={{ color: '#5a4a3a' }}>
                {userItem.item.description ? (
                  <div>{renderDescription(userItem.item.description, "text-[#5a4a3a]")}</div>
                ) : (
                  <div style={{ color: '#5a4a3a' }}>{getItemDescription(userItem.item.name, userItem.item.rarity)}</div>
                )}
              </div>
            </div>

            {/* IMAGEタイプ: 画像を表示、SHOW_TO_STAFFタイプ: 見せて使用画面 */}
            {isImage ? (
              <>
                {userItem.item.imageUrl ? (
                  <>
                    <div className="mb-6 flex justify-center">
                      <div className="rounded-xl backdrop-blur-sm p-4 shadow-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
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
                        <div className="image-placeholder hidden h-64 w-64 flex-col items-center justify-center rounded-lg bg-gray-200 border-2 border-gray-300">
                          <div className="text-2xl font-bold text-gray-500">NOIMAGE</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm" style={{ color: "#5a4a3a" }}>
                      {userItem.item.useStartAt && userItem.item.useEndAt ? (
                        <>
                          有効期限: {new Date(userItem.item.useStartAt).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })} から {new Date(userItem.item.useEndAt).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })} まで
                        </>
                      ) : (
                        <>
                          使用期限: {expirationDate.toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}まで
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* 画像がない場合: 必須情報のみ表示 */}
                    <div className="space-y-3 rounded-xl p-4" style={{ backgroundColor: "rgba(255, 255, 255, 0.5)" }}>
                      {/* 有効期限 */}
                      <div>
                        <div className="mb-1 text-xs font-semibold" style={{ color: "#6b5a4a" }}>
                          有効期限
                        </div>
                        <div className="text-sm" style={{ color: "#5a4a3a" }}>
                          {userItem.item.useStartAt && userItem.item.useEndAt ? (
                            <>
                              {new Date(userItem.item.useStartAt).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })} から {new Date(userItem.item.useEndAt).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })} まで
                            </>
                          ) : userItem.item.useStartAt ? (
                            <>
                              {new Date(userItem.item.useStartAt).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })} から {expirationDate.toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })} まで
                            </>
                          ) : (
                            <>
                              {expirationDate.toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}まで
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="mb-6 rounded-xl backdrop-blur-sm border p-6 text-center" style={{ backgroundColor: 'rgba(184, 159, 122, 0.2)', borderColor: '#b89f7a' }}>
                  <div className="mb-4 flex justify-center">
                    <PhoneIcon className="h-10 w-10" />
                  </div>
                  <div className="mb-2 text-lg font-semibold" style={{ color: '#4a3a2a' }}>
                    店員にこの画面を見せてください
                  </div>
                  <div className="text-sm" style={{ color: '#5a4a3a' }}>
                    店員が使用済みボタンを押して使用完了となります
                  </div>
                </div>
                <div className="mb-4 rounded-xl backdrop-blur-sm border p-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', borderColor: '#b89f7a' }}>
                  <div className="mb-2 text-sm font-semibold" style={{ color: '#4a3a2a' }}>
                    アイテム情報
                  </div>
                  <div className="text-sm" style={{ color: '#5a4a3a' }}>
                    <div>獲得日: {new Date(userItem.createdAt).toLocaleDateString('ja-JP')}</div>
                  </div>
                </div>
                <div className="text-center text-sm" style={{ color: '#5a4a3a' }}>
                  {userItem.item.useStartAt && userItem.item.useEndAt ? (
                    <>
                      有効期限: {new Date(userItem.item.useStartAt).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })} から {new Date(userItem.item.useEndAt).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })} まで
                    </>
                  ) : (
                    <>
                      使用期限: {expirationDate.toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}まで
                    </>
                  )}
                </div>
              </>
            )}
            </div>
          </div>
        </div>
        <div className="px-4 pb-4" style={{ backgroundColor: '#e9dacb' }}>
           <div
             className="rounded-xl px-3 py-2 text-xs shadow"
             style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
           >
             <LegalFooterLinks
               className="flex flex-wrap justify-center gap-3"
               linkClassName="text-[#8b6f47] hover:underline"
               onLinkClick={(href) => {
                 requestExitConfirmation('nav', href);
                 return false;
               }}
             />
           </div>
         </div>
        <BottomNavigation
          currentPage="items"
          onNavigate={(href) => {
            requestExitConfirmation('nav', href);
            return false;
          }}
        />
        <ConfirmModal
          isOpen={showExitConfirmModal}
          title="この画面を離れますか？"
          message={
            <div>
              <p className="mb-2">この画面を離れると、戻ることはできません。</p>
              <p className="text-sm text-gray-600">よろしいですか？</p>
            </div>
          }
          confirmText="移動する"
          cancelText="キャンセル"
          variant="warning"
          onConfirm={handleExitConfirm}
          onCancel={handleExitCancel}
        />
      </div>
    );
  }

  // アイテム詳細画面
  return (
    <>
      <div className="min-h-screen pb-20" style={{ backgroundColor: "#e9dacb" }}>
        <div className="mx-auto max-w-md">
        {/* 戻るボタン */}
        <div className="px-4 pt-4">
          <button
            onClick={onBack}
            className="transition-colors hover:opacity-80"
            style={{ color: "#6b5a4a" }}
          >
            ← 戻る
          </button>
        </div>

        {/* ヒーローセクション */}
        <div className="relative overflow-hidden px-4 pt-4 pb-6">
          {/* 背景装飾 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10">
              <CardBackIcon className="h-14 w-14" />
            </div>
            <div className="absolute top-20 right-10">
              <CardBackIcon className="h-12 w-12" />
            </div>
            <div className="absolute bottom-10 left-20">
              <CardBackIcon className="h-10 w-10" />
            </div>
            <div className="absolute bottom-20 right-20">
              <CardBackIcon className="h-12 w-12" />
            </div>
          </div>
          
          <div className="relative z-10 text-center" style={{ color: "#4a3a2a" }}>
            <h1 className="mb-2 text-3xl font-bold drop-shadow-lg">アイテム詳細</h1>
            <p className="text-sm" style={{ color: "#6b5a4a" }}>獲得したアイテムの詳細</p>
          </div>
        </div>

        <div className="px-4 py-4">
          {/* アイテム情報 */}
          <div className="mb-6 rounded-xl backdrop-blur-sm p-6 shadow-md" style={{ backgroundColor: "rgba(255, 255, 255, 0.6)" }}>
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <span
              className="inline-flex rounded-full px-3 py-1 text-sm font-semibold shadow-sm"
              style={{
                background: "linear-gradient(to right, #f5d48a, #e7c675)",
                color: "#4a3a2a",
              }}
            >
              {getRarityLabel(userItem.item.rarity)}
            </span>
            <span className="text-sm" style={{ color: "#6b5a4a" }}>
              獲得日: {new Date(userItem.createdAt).toLocaleDateString('ja-JP')}
            </span>
          </div>

          <div className="mb-4">
            <h2 className="mb-2 text-xl font-bold" style={{ color: "#4a3a2a" }}>
              {userItem.item.name}
            </h2>
            <div>{renderDescription(userItem.item.description, "text-[#5a4a3a]")}</div>
          </div>

          {/* 使用開始前・使用期限切れの警告 */}
          {itemStatus === 'notStarted' && userItem.item.useStartAt && (
            <div className="mb-4 rounded-xl backdrop-blur-sm border p-4" style={{ backgroundColor: "rgba(234, 179, 8, 0.15)", borderColor: "rgba(234, 179, 8, 0.3)" }}>
              <div className="text-sm font-semibold" style={{ color: "#6b5a4a" }}>使用開始前</div>
              <div className="mt-1 text-xs" style={{ color: "#5a4a3a" }}>
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
            <div className="mb-4 rounded-xl backdrop-blur-sm border p-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div className="text-sm font-semibold" style={{ color: '#4a3a2a' }}>使用期限切れ</div>
              <div className="mt-1 text-xs" style={{ color: '#5a4a3a' }}>
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
            <div className="mb-4 rounded-xl backdrop-blur-sm border p-4" style={{ backgroundColor: "rgba(59, 130, 246, 0.12)", borderColor: "rgba(59, 130, 246, 0.25)" }}>
              <div className="text-xs" style={{ color: "#5a4a3a" }}>
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
                  <span style={{ color: '#6b5a4a' }}>期限なし</span>
                )}
              </div>
            </div>
          )}

          {/* 使用ボタン */}
          {itemStatus === 'used' ? (
            <div className="mt-4">
              <button
                disabled
                className="w-full rounded-xl backdrop-blur-sm border px-4 py-3 font-semibold opacity-70"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)', borderColor: '#b89f7a', color: '#6b5a4a' }}
              >
                使用済み
              </button>
              <p className="mt-2 text-center text-sm" style={{ color: '#6b5a4a' }}>
                使用日: {new Date(userItem.usedAt!).toLocaleDateString('ja-JP')}
              </p>
            </div>
          ) : itemStatus === 'notStarted' || itemStatus === 'expired' ? (
            <div className="mt-4">
              <button
                disabled
                className="w-full rounded-xl px-4 py-3 font-semibold border opacity-70"
                style={
                  itemStatus === 'notStarted'
                    ? { backgroundColor: 'rgba(234, 179, 8, 0.3)', borderColor: 'rgba(234, 179, 8, 0.3)', color: '#6b5a4a' }
                    : { backgroundColor: 'rgba(239, 68, 68, 0.3)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#6b5a4a' }
                }
              >
                {itemStatus === 'notStarted' ? '使用開始前' : '使用期限切れ'}
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <button
                ref={useButtonRef}
                onClick={handleUseClick}
                disabled={isUsing}
                className="w-full rounded-xl px-4 py-3 font-semibold shadow-lg transition-all hover:shadow-xl active:scale-95"
                style={{
                  background: isUsing
                    ? "rgba(255, 255, 255, 0.6)"
                    : "linear-gradient(to right, #e7c675, #f5d48a)",
                  color: "#4a3a2a",
                  opacity: isUsing ? 0.7 : 1,
                  border: "1px solid #b89f7a",
                }}
              >
                {isUsing ? '処理中...' : '使用する'}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="px-4 pb-4" style={{ backgroundColor: '#e9dacb' }}>
        <div
          className="rounded-xl px-3 py-2 text-xs shadow"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
        >
          <LegalFooterLinks
            className="flex flex-wrap justify-center gap-3"
            linkClassName="text-[#8b6f47] hover:underline"
          />
        </div>
      </div>
      </div>
    </div>
      <BottomNavigation currentPage="items" />

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
        onCancel={() => {
          setShowConfirmModal(false);
          // ボタンのフォーカスを解除
          if (useButtonRef.current) {
            useButtonRef.current.blur();
          }
        }}
      />
    </>
  );
}

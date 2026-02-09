'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';
import {
  UsersIcon,
  TagIcon,
  MessagesIcon,
  PointsIcon,
  GachaIcon,
  EditIcon,
  StarIcon,
  GiftIcon,
  TargetIcon,
  PackageIcon,
  VideoIcon,
  StatsIcon,
  ListIcon,
  HelpIcon,
} from '@/components/admin/icons/AdminIcons';

type HelpItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  category: string;
};

const helpItems: HelpItem[] = [
  // ユーザー関連
  {
    title: 'ユーザー情報を確認したい',
    description: 'ユーザーの詳細情報、獲得アイテム、ガチャ履歴、ポイント残高を確認できます',
    href: '/admin/users',
    icon: <UsersIcon className="h-5 w-5" />,
    category: 'ユーザー管理',
  },
  {
    title: 'ユーザーにタグを付けたい・削除したい',
    description: 'ユーザーにタグを割り当てたり、削除したりできます。タグは一括割当も可能です',
    href: '/admin/users?tab=tags',
    icon: <TagIcon className="h-5 w-5" />,
    category: 'ユーザー管理',
  },
  {
    title: 'ユーザーにメッセージを送信したい',
    description: '特定のユーザーやタグが付いたユーザーにLINEメッセージを配信できます',
    href: '/admin/analytics?tab=messages',
    icon: <MessagesIcon className="h-5 w-5" />,
    category: 'ユーザー管理',
  },
  {
    title: 'ユーザーにポイントを付与したい',
    description: '特定のユーザーに有償ポイントや無償ポイントを手動で付与できます',
    href: '/admin/points?tab=points',
    icon: <PointsIcon className="h-5 w-5" />,
    category: 'ポイント管理',
  },
  {
    title: 'ポイント購入プランを追加・変更したい',
    description: 'ユーザーが購入できるポイントプラン（価格、ポイント数、おまけポイント）を設定できます',
    href: '/admin/points?tab=point-plans',
    icon: <PointsIcon className="h-5 w-5" />,
    category: 'ポイント管理',
  },

  // ガチャ設定関連
  {
    title: 'ガチャの確率や設定を変更したい',
    description: 'ガチャタイプの確率（等級ごとの重み）、期間、動画設定、メッセージテンプレートを変更できます',
    href: '/admin/gacha?tab=gacha-types',
    icon: <GachaIcon className="h-5 w-5" />,
    category: 'ガチャ設定',
  },
  {
    title: 'ガチャの結果メッセージを変更したい',
    description: 'ガチャ結果をLINEで送信する際のメッセージテンプレートを管理できます',
    href: '/admin/gacha?tab=result-message-templates',
    icon: <EditIcon className="h-5 w-5" />,
    category: 'ガチャ設定',
  },
  {
    title: '等級（1等、2等など）を追加・変更したい',
    description: 'ガチャで使用する等級マスタを追加・編集できます。等級名も自由に変更可能です',
    href: '/admin/gacha?tab=prize-tiers',
    icon: <StarIcon className="h-5 w-5" />,
    category: 'ガチャ設定',
  },
  {
    title: '同じアイテムを違うガチャの違う等級に割り当てたい',
    description: '例：カードスリーブを1000円ガチャでは3等、3000円ガチャでは5等にする場合など',
    href: '/admin/gacha?tab=prize-assignments',
    icon: <GiftIcon className="h-5 w-5" />,
    category: 'ガチャ設定',
  },
  {
    title: 'ガチャの排出率を確認したい',
    description: '設定した確率で実際にどのような結果になるか、シミュレーションで確認できます',
    href: '/admin/gacha?tab=simulator',
    icon: <TargetIcon className="h-5 w-5" />,
    category: 'ガチャ設定',
  },

  // アイテム・動画関連
  {
    title: 'ガチャアイテムを追加・編集したい',
    description: '新しい景品アイテムを追加したり、既存のアイテム情報を編集できます',
    href: '/admin/gacha?tab=items',
    icon: <PackageIcon className="h-5 w-5" />,
    category: 'アイテム管理',
  },
  {
    title: 'ガチャ演出動画をアップロード・管理したい',
    description: '共通動画や等級別動画をアップロードし、各ガチャタイプに割り当てることができます',
    href: '/admin/videos',
    icon: <VideoIcon className="h-5 w-5" />,
    category: 'アイテム管理',
  },

  // 統計・履歴
  {
    title: 'ガチャの実行状況や課金状況を確認したい',
    description: 'ガチャの実行回数、課金人数、課金金額、等級別の排出率などを確認できます',
    href: '/admin/analytics?tab=statistics',
    icon: <StatsIcon className="h-5 w-5" />,
    category: '統計・履歴',
  },
  {
    title: '管理画面での操作履歴を確認したい',
    description: '誰がいつ、どのような操作を行ったかの履歴を確認できます',
    href: '/admin/system?tab=action-history',
    icon: <ListIcon className="h-5 w-5" />,
    category: '統計・履歴',
  },
];

const categories = [
  'ユーザー管理',
  'ポイント管理',
  'ガチャ設定',
  'アイテム管理',
  '統計・履歴',
];

export default function HelpPage() {
  const itemsByCategory = categories.map((category) => ({
    category,
    items: helpItems.filter((item) => item.category === category),
  }));

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-800 lg:mb-4 lg:text-3xl">
          管理者ヘルプ
        </h1>
        <p className="mb-6 text-sm text-gray-600 lg:text-base">
          やりたいことから、該当する管理ページを見つけることができます
        </p>

        <div className="space-y-8">
          {itemsByCategory.map(({ category, items }) => (
            <div key={category} className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-800">
                {category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="mb-2 flex items-start gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1">
                        <h3 className="mb-1 text-base font-semibold text-gray-800 group-hover:text-blue-600">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end text-xs text-blue-600 group-hover:text-blue-700">
                      <span>このページへ →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-800">
            <span className="mr-2 inline-flex items-center">
              <HelpIcon className="h-4 w-4" />
            </span>
            よくある質問
          </h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-medium">Q: ガチャの確率はどこで設定しますか？</p>
              <p className="mt-1 pl-4 text-gray-600">
                A: 「ガチャ設定」ページで、各等級の重み（確率）を設定できます。重みが大きいほど出やすくなります。
              </p>
            </div>
            <div>
              <p className="font-medium">Q: アイテムの等級はどこで決まりますか？</p>
              <p className="mt-1 pl-4 text-gray-600">
                A: 「景品割当（ガチャ別）」ページで、ガチャタイプごとにアイテムを等級に割り当てることができます。
              </p>
            </div>
            <div>
              <p className="font-medium">Q: 動画はどこで管理しますか？</p>
              <p className="mt-1 pl-4 text-gray-600">
                A: 「動画管理」ページで動画をアップロードし、「ガチャ設定」ページまたは「動画管理」の一括設定で割り当てます。
              </p>
            </div>
            <div>
              <p className="font-medium">Q: 新しい等級（6等、7等など）を追加したい</p>
              <p className="mt-1 pl-4 text-gray-600">
                A: 「等級マスタ管理」ページで新しい等級を追加し、「ガチャ設定」で確率を設定してください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}


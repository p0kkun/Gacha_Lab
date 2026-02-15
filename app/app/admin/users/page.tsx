'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import TabbedPage from '@/components/admin/TabbedPage';
import dynamic from 'next/dynamic';
import AdminIcon from '@/components/icons/AdminIcon';

// 各タブコンテンツを動的インポート
const UsersManagementContent = dynamic(() => import('@/app/admin/users/users-management'), { ssr: false });
const TagsManagementContent = dynamic(() => import('@/app/admin/tags/page'), { ssr: false });
const ReferralsContent = dynamic(() => import('@/app/admin/referrals/page'), { ssr: false });
const FreeGachaSettingsContent = dynamic(
  () => import('@/app/admin/free-gacha-settings/page'),
  { ssr: false }
);

function UsersContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'users';

  return (
    <TabbedPage
      title="ユーザー管理"
      defaultTab={defaultTab}
      tabs={[
        {
          id: 'users',
          label: 'ユーザー管理',
          icon: <AdminIcon name="users" className="h-5 w-5" title="ユーザー管理" />,
          content: <UsersManagementContent />,
        },
        {
          id: 'tags',
          label: 'タグ管理',
          icon: <AdminIcon name="tag" className="h-5 w-5" title="タグ管理" />,
          content: <TagsManagementContent />,
        },
        {
          id: 'referrals',
          label: '友だち紹介履歴',
          icon: <AdminIcon name="link" className="h-5 w-5" title="友だち紹介履歴" />,
          content: <ReferralsContent />,
        },
        {
          id: 'free-gacha-settings',
          label: '紹介特典設定',
          icon: <AdminIcon name="gift" className="h-5 w-5" title="紹介特典設定" />,
          content: <FreeGachaSettingsContent />,
        },
      ]}
    />
  );
}

export default function UsersManagementGroupPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="text-gray-500">読み込み中...</div></div>}>
        <UsersContent />
      </Suspense>
    </AdminLayout>
  );
}

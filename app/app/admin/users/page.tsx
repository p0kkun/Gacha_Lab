'use client';

import { useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import TabbedPage from '@/components/admin/TabbedPage';
import dynamic from 'next/dynamic';

// 各タブコンテンツを動的インポート
const UsersManagementContent = dynamic(() => import('@/app/admin/users/users-management'), { ssr: false });
const TagsManagementContent = dynamic(() => import('@/app/admin/tags/page'), { ssr: false });
const ReferralsContent = dynamic(() => import('@/app/admin/referrals/page'), { ssr: false });

export default function UsersManagementGroupPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'users';

  return (
    <AdminLayout>
      <TabbedPage
        title="ユーザー管理"
        defaultTab={defaultTab}
        tabs={[
          {
            id: 'users',
            label: 'ユーザー管理',
            icon: '👥',
            content: <UsersManagementContent />,
          },
          {
            id: 'tags',
            label: 'タグ管理',
            icon: '🏷️',
            content: <TagsManagementContent />,
          },
          {
            id: 'referrals',
            label: '友達紹介履歴',
            icon: '👥',
            content: <ReferralsContent />,
          },
        ]}
      />
    </AdminLayout>
  );
}

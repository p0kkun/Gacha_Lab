'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import TabbedPage from '@/components/admin/TabbedPage';
import dynamic from 'next/dynamic';

// 各タブコンテンツを動的インポート
const UsersManagementContent = dynamic(() => import('@/app/admin/users/users-management'), { ssr: false });
const TagsManagementContent = dynamic(() => import('@/app/admin/tags/page'), { ssr: false });
const ReferralsContent = dynamic(() => import('@/app/admin/referrals/page'), { ssr: false });

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

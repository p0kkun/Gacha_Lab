'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import TabbedPage from '@/components/admin/TabbedPage';
import dynamic from 'next/dynamic';

// 各タブコンテンツを動的インポート
const ActionHistoryContent = dynamic(() => import('@/app/admin/action-history/page'), { ssr: false });
const CacheManagementContent = dynamic(() => import('@/app/admin/system/cache-management'), { ssr: false });

function SystemContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'action-history';

  return (
    <TabbedPage
      title="システム"
      defaultTab={defaultTab}
      tabs={[
        {
          id: 'action-history',
          label: '操作履歴',
          icon: '📋',
          content: <ActionHistoryContent />,
        },
        {
          id: 'cache',
          label: 'キャッシュ管理',
          icon: '🗄️',
          content: <CacheManagementContent />,
        },
      ]}
    />
  );
}

export default function SystemGroupPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="text-gray-500">読み込み中...</div></div>}>
        <SystemContent />
      </Suspense>
    </AdminLayout>
  );
}

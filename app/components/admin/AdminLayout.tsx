'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/admin', label: 'ダッシュボード' },
    { href: '/admin/users', label: 'ユーザー管理' },
    { href: '/admin/gacha-types', label: 'ガチャ設定' },
    { href: '/admin/items', label: 'アイテム設定' },
    { href: '/admin/statistics', label: '統計・購入状況' },
    { href: '/admin/simulator', label: 'ガチャシミュレータ' },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    window.location.href = '/admin';
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* サイドバー */}
      <aside className="flex w-64 flex-col bg-white shadow-lg">
        <div className="border-b p-4">
          <h2 className="text-xl font-bold text-gray-800">管理画面</h2>
        </div>
        <nav className="flex-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-3 transition-colors ${
                pathname === item.href
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}


'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';

type MenuItem = {
  id: string;
  label: string;
  href: string;
  iconName: string; // アイコン名（ファイル名のベース部分）
  activePattern?: string[]; // アクティブ判定用のパターン
};

const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'ホーム',
    href: '/',
    iconName: 'home',
    activePattern: ['home', ''],
  },
  {
    id: 'gacha',
    label: 'ガチャ',
    href: '/?action=gacha',
    iconName: 'gacha',
    activePattern: ['gacha'],
  },
  {
    id: 'history',
    label: '履歴',
    href: '/?action=history',
    iconName: 'history',
    activePattern: ['history'],
  },
  {
    id: 'items',
    label: 'アイテム',
    href: '/?action=items',
    iconName: 'items',
    activePattern: ['items'],
  },
  {
    id: 'mypage',
    label: 'マイページ',
    href: '/?action=mypage',
    iconName: 'mypage',
    activePattern: ['mypage'],
  },
  {
    id: 'referral',
    label: '友達紹介',
    href: '/?action=referral',
    iconName: 'referral',
    activePattern: ['referral'],
  },
];

type BottomNavigationProps = {
  currentPage?: string;
  hideSpacer?: boolean; // スペーサーを非表示にするか
  transparent?: boolean; // 背景を透明にするか（ガチャ画面用）
};

export default function BottomNavigation({ currentPage, hideSpacer = false, transparent = false }: BottomNavigationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const action = searchParams.get('action');

  const isActive = (item: MenuItem): boolean => {
    if (currentPage) {
      return currentPage === item.id || (item.activePattern?.includes(currentPage) ?? false);
    }
    
    // ホームページの場合
    if (item.id === 'home') {
      return !action || action === '';
    }
    
    // その他のページの場合
    return item.activePattern?.includes(action || '') ?? false;
  };

  return (
    <>
      {/* スペーサー（ナビゲーションの高さ分） */}
      {!hideSpacer && <div className="h-20" />}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t ${transparent ? 'border-transparent bg-transparent shadow-none' : 'border-gray-200 bg-white shadow-lg'}`}>
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {menuItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition-colors ${
                  transparent
                    ? active
                      ? 'bg-green-800 bg-opacity-50 text-yellow-300'
                      : 'text-green-200 hover:bg-green-800 hover:bg-opacity-30 active:bg-green-800 active:bg-opacity-40'
                    : active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                }`}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <img
                  src={`/icons/navigation/icon-${item.iconName}${active ? '-active' : ''}.svg`}
                  alt={item.label}
                  className="h-6 w-6 flex-shrink-0"
                  aria-hidden="true"
                />
                <span className={`text-[10px] font-medium leading-tight ${
                  transparent
                    ? active ? 'text-yellow-300' : 'text-green-200'
                    : active ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

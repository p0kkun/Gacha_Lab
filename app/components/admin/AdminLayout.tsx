"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { href: "/admin", label: "ダッシュボード" },
    { href: "/admin/users", label: "ユーザー管理" },
    { href: "/admin/tags", label: "タグ管理" },
    { href: "/admin/messages", label: "メッセージ配信" },
    { href: "/admin/points", label: "ポイント管理" },
    { href: "/admin/gacha-types", label: "ガチャ設定" },
    { href: "/admin/items", label: "アイテム設定" },
    { href: "/admin/videos", label: "動画管理" },
    { href: "/admin/statistics", label: "統計・購入状況" },
    { href: "/admin/simulator", label: "ガチャシミュレータ" },
    { href: "/admin/action-history", label: "操作履歴" },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    window.location.href = "/admin";
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* モバイル用ハンバーガーメニューボタン */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed left-4 top-4 z-50 rounded-md bg-white p-2 shadow-lg lg:hidden"
        aria-label="メニューを開く"
      >
        <svg
          className="h-6 w-6 text-gray-800"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isMobileMenuOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* サイドバー */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-white shadow-lg transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b p-4">
          <h2 className="text-xl font-bold text-gray-800">管理画面</h2>
        </div>
        <nav className="flex-1 overflow-y-auto">
          {menuItems.map((item, index) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            const isBsop = item.label.includes("BSOP");
            const isBsopSub = item.label.startsWith("  ");

            return (
              <div key={item.href}>
                {(item as any).divider && index > 0 && (
                  <div className="my-2 border-t border-gray-200" />
                )}
                <Link
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 transition-colors ${
                    isActive
                      ? isBsop
                        ? "bg-orange-500 text-white"
                        : "bg-blue-500 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  } ${isBsopSub ? "pl-8 text-sm" : ""} ${
                    isBsop && !isBsopSub ? "font-semibold" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </div>
            );
          })}
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

      {/* モバイルメニューのオーバーレイ */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-white bg-opacity-70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto lg:ml-0">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}

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
    { href: "/admin", label: "ダッシュボード", icon: "📊" },
    { href: "/admin/users", label: "ユーザー管理", icon: "👥" },
    { href: "/admin/tags", label: "タグ管理", icon: "🏷️" },
    { href: "/admin/messages", label: "メッセージ配信", icon: "💬" },
    { href: "/admin/points", label: "ポイント管理", icon: "💰" },
    { href: "/admin/point-plans", label: "ポイント購入プラン", icon: "💳" },
    { href: "/admin/gacha-types", label: "ガチャ設定", icon: "🎰" },
    { href: "/admin/free-gacha-settings", label: "無料ガチャ設定", icon: "🎁" },
    { href: "/admin/result-message-templates", label: "結果メッセージテンプレート", icon: "📝" },
    { href: "/admin/prize-tiers", label: "等級マスタ管理", icon: "⭐" },
    { href: "/admin/prize-assignments", label: "景品割当（ガチャ別）", icon: "🎁" },
    { href: "/admin/items", label: "アイテム設定", icon: "📦" },
    { href: "/admin/videos", label: "動画管理", icon: "🎬" },
    { href: "/admin/statistics", label: "統計・購入状況", icon: "📈" },
    { href: "/admin/simulator", label: "ガチャシミュレータ", icon: "🎯" },
    { href: "/admin/referrals", label: "友達紹介履歴", icon: "👥" },
    { href: "/admin/action-history", label: "操作履歴", icon: "📋" },
    { href: "/admin/help", label: "ヘルプ", icon: "❓" },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    window.location.href = "/admin";
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* モバイル用ハンバーガーメニューボタン */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2.5 shadow-lg transition-all hover:shadow-xl lg:hidden"
        aria-label="メニューを開く"
      >
        <svg
          className="h-6 w-6 text-gray-700"
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
        className={`fixed left-0 top-0 z-40 flex h-screen w-72 flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* ヘッダー */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <h2 className="text-xl font-bold text-white">管理画面</h2>
          <p className="mt-1 text-sm text-blue-100">Gacha Lab Admin</p>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-blue-600"></span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* フッター */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-300 hover:shadow-sm"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              ログアウト
            </span>
          </button>
        </div>
      </aside>

      {/* モバイルメニューのオーバーレイ */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto lg:ml-72">
        <div className="mx-auto max-w-7xl p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

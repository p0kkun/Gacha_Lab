"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import {
  DashboardIcon,
  GachaIcon,
  PackageIcon,
  VideoIcon,
  PointsIcon,
  UsersIcon,
  MessagesIcon,
  TargetIcon,
  StatsIcon,
  ShieldIcon,
  SettingsIcon,
  HelpIcon,
} from "@/components/admin/icons/AdminIcons";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [exclusionLinks, setExclusionLinks] = useState<string[]>([]);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  const menuItems = [
    {
      href: "/admin",
      label: "ダッシュボード",
      icon: <DashboardIcon className="h-5 w-5" />,
    },
    {
      href: "/admin/gacha",
      label: "ガチャ管理",
      icon: <GachaIcon className="h-5 w-5" />,
    },
    {
      href: "/admin/master",
      label: "マスタ管理",
      icon: <PackageIcon className="h-5 w-5" />,
    },
    {
      href: "/admin/videos",
      label: "動画管理",
      icon: <VideoIcon className="h-5 w-5" />,
    },
    {
      href: "/admin/points",
      label: "ポイント管理",
      icon: <PointsIcon className="h-5 w-5" />,
    },
    {
      href: "/admin/users",
      label: "ユーザー管理",
      icon: <UsersIcon className="h-5 w-5" />,
    },
    {
      href: "/admin/messages",
      label: "メッセージ配信",
      icon: <MessagesIcon className="h-5 w-5" />,
    },
    {
      href: "/admin/debug",
      label: "ガチャシミュレータ",
      icon: <TargetIcon className="h-5 w-5" />,
    },
    {
      href: "/admin/statistics",
      label: "統計",
      icon: <StatsIcon className="h-5 w-5" />,
    },
    {
      href: "/admin/admin-management",
      label: "管理者管理",
      icon: <ShieldIcon className="h-5 w-5" />,
    },
    {
      href: "/admin/system",
      label: "システム",
      icon: <SettingsIcon className="h-5 w-5" />,
    },
    {
      href: "/admin/help",
      label: "ヘルプ",
      icon: <HelpIcon className="h-5 w-5" />,
    },
  ];

  const isExcluded = (path: string) => {
    return exclusionLinks.some((pattern) => {
      if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -2);
        return path === prefix || path.startsWith(`${prefix}/`);
      }
      return path === pattern;
    });
  };

  // アクティブ状態の判定を最適化
  const isActiveItem = useMemo(() => {
    return (itemHref: string) => {
      if (pathname === itemHref) return true;
      if (itemHref === "/admin") return false;
      if (pathname?.startsWith(itemHref + "/")) return true;

      // グループページの判定
      const groupMappings: Record<string, string[]> = {
        "/admin/gacha": [
          "/admin/gacha-types",
        ],
        "/admin/master": [
          "/admin/prize-tiers",
          "/admin/prize-assignments",
          "/admin/items",
        ],
        "/admin/points": ["/admin/point-plans"],
        "/admin/users": ["/admin/tags", "/admin/referrals", "/admin/free-gacha-settings"],
        "/admin/messages": ["/admin/result-message-templates"],
        "/admin/debug": [
          "/admin/simulator",
        ],
        "/admin/statistics": [],
        "/admin/admin-management": [
          "/admin/admin-users",
          "/admin/admin-roles",
          "/admin/admin-exclusion-links",
        ],
        "/admin/system": ["/admin/action-history", "/admin/cache"],
      };

      const subPaths = groupMappings[itemHref];
      return subPaths?.some((subPath) => pathname?.startsWith(subPath)) || false;
    };
  }, [pathname]);

  // 認証状態と除外リンクを取得
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      const token = sessionStorage.getItem("admin_token");
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (!token || !url.startsWith("/api/admin/")) {
        return originalFetch(input, init);
      }
      const headers = new Headers(
        init.headers || (input instanceof Request ? input.headers : undefined)
      );
      headers.set("Authorization", `Bearer ${token}`);
      if (input instanceof Request) {
        return originalFetch(new Request(input, { headers }), init);
      }
      return originalFetch(input, { ...init, headers });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    const loadAdminContext = async () => {
      try {
        const token = sessionStorage.getItem("admin_token");
        if (!token) {
          window.location.href = "/admin";
          return;
        }
        const res = await fetch("/api/admin/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          window.location.href = "/admin";
          return;
        }
        const data = await res.json();
        setExclusionLinks(data.exclusionLinks ?? []);
        if (data.adminUser) {
          sessionStorage.setItem("admin_authenticated", "true");
          sessionStorage.setItem("admin_user_id", String(data.adminUser.id));
          sessionStorage.setItem("admin_name", data.adminUser.name ?? "");
        }
      } catch {
        window.location.href = "/admin";
      } finally {
        setIsAuthChecked(true);
      }
    };
    void loadAdminContext();
  }, []);

  // 権限で除外されているパスはリダイレクト
  useEffect(() => {
    if (!isAuthChecked) return;
    if (pathname && isExcluded(pathname)) {
      window.location.href = "/admin";
    }
  }, [isAuthChecked, pathname, exclusionLinks]);

  // モバイルメニューを閉じる（ESCキー対応）
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileMenuOpen]);

  // モバイルでメニューが開いている時はスクロールを無効化
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
      });
    } finally {
      sessionStorage.removeItem("admin_authenticated");
      sessionStorage.removeItem("admin_user_id");
      sessionStorage.removeItem("admin_name");
      sessionStorage.removeItem("admin_token");
      window.location.href = "/admin";
    }
  };

  if (!isAuthChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <span className="text-sm font-medium">認証を確認中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* モバイル用ハンバーガーメニューボタン */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-white p-3 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:hidden"
        aria-label="メニューを開く"
        aria-expanded={isMobileMenuOpen}
      >
        <svg
          className="h-6 w-6 text-gray-700"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
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
        className={`fixed left-0 top-0 z-40 flex h-screen w-72 flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="メインナビゲーション"
      >
        {/* ヘッダー */}
        <div className="flex-shrink-0 border-b border-blue-500/20 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 px-6 py-6 shadow-sm">
          <h2 className="text-xl font-bold text-white drop-shadow-sm">
            管理画面
          </h2>
          <p className="mt-1.5 text-sm font-medium text-blue-100 opacity-95">
            TRE BOX Admin
          </p>
        </div>

        {/* ナビゲーション */}
        <nav
          className="flex-1 min-h-0 overflow-y-auto px-4 py-5 scrollbar-thin"
          aria-label="サイドナビゲーション"
        >
          <div className="space-y-1.5">
            {menuItems
              .filter((item) => !isExcluded(item.href))
              .map((item) => {
              const isActive = isActiveItem(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white
                    ${
                      isActive
                        ? "bg-gradient-to-r from-blue-50 to-blue-50/50 text-blue-700 shadow-md shadow-blue-100/50"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100"
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* アクティブ状態の左側インジケーター */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-blue-600 shadow-sm"></span>
                  )}
                  
                  <span
                    className={`text-lg transition-transform duration-200 ${
                      isActive ? "scale-110" : "group-hover:scale-110"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  
                  {/* アクティブ状態の右側インジケーター */}
                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 shadow-sm"></span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* フッター */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50/80 p-4 backdrop-blur-sm">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:bg-gray-100"
            aria-label="ログアウト"
          >
            <span className="flex items-center justify-center gap-2.5">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>ログアウト</span>
            </span>
          </button>
        </div>
      </aside>

      {/* モバイルメニューのオーバーレイ */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto lg:ml-72 text-gray-800">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}

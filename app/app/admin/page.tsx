"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  HelpIcon,
  UsersIcon,
  TagIcon,
  MessagesIcon,
  PointsIcon,
  GachaIcon,
  GiftIcon,
  EditIcon,
  SettingsIcon,
  StarIcon,
  PackageIcon,
  VideoIcon,
  StatsIcon,
  TargetIcon,
  ListIcon,
} from "@/components/admin/icons/AdminIcons";

export default function AdminPage() {
  // sessionStorageに認証情報がある場合は初期値をtrueに設定（ちらつき防止）
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_authenticated") === "true" &&
        sessionStorage.getItem("admin_token") !== null;
    }
    return false;
  });
  const [mounted, setMounted] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // クライアント側でのみ認証状態をチェック（ハイドレーションエラー回避）
  useEffect(() => {
    const initialize = async () => {
      setMounted(true);
      setIsChecking(true);
      try {
        const token = sessionStorage.getItem("admin_token");
        if (!token) {
          sessionStorage.removeItem("admin_authenticated");
          sessionStorage.removeItem("admin_user_id");
          sessionStorage.removeItem("admin_name");
          setIsAuthenticated(false);
          setIsChecking(false);
          return;
        }
        const res = await fetch("/api/admin/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.adminUser) {
            sessionStorage.setItem("admin_authenticated", "true");
            sessionStorage.setItem("admin_user_id", String(data.adminUser.id));
            sessionStorage.setItem("admin_name", data.adminUser.name ?? "");
          }
          setIsAuthenticated(true);
        } else {
          sessionStorage.removeItem("admin_authenticated");
          sessionStorage.removeItem("admin_user_id");
          sessionStorage.removeItem("admin_name");
          sessionStorage.removeItem("admin_token");
          setIsAuthenticated(false);
        }
      } catch {
        // ignore
        sessionStorage.removeItem("admin_authenticated");
        sessionStorage.removeItem("admin_user_id");
        sessionStorage.removeItem("admin_name");
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    const timeoutId = setTimeout(() => {
      void initialize();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError("メールアドレスまたはパスワードが正しくありません");
        return;
      }
      const data = await res.json();
      sessionStorage.setItem("admin_authenticated", "true");
      sessionStorage.setItem("admin_user_id", String(data.adminUser?.id ?? ""));
      sessionStorage.setItem("admin_name", data.adminUser?.name ?? "");
      if (data.token) {
        sessionStorage.setItem("admin_token", data.token);
      }
      setIsAuthenticated(true);
    } catch {
      setError("ログインに失敗しました");
    }
  };

  // マウント前または認証チェック中はローディング状態を表示（ハイドレーションエラー回避）
  if (!mounted || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
            管理画面ログイン
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="パスワードを入力"
                required
              />
            </div>
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-md bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between lg:mb-6">
          <h1 className="text-xl font-bold text-gray-800 lg:text-2xl">
            ダッシュボード
          </h1>
          <Link
            href="/admin/help"
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            <HelpIcon className="h-4 w-4" />
            <span>ヘルプを見る</span>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                ユーザー管理
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              ユーザー一覧と詳細情報を確認できます
            </p>
            <Link
              href="/admin/users"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              ユーザー管理へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                タグ管理
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              ユーザータグの追加・編集・一括割当ができます
            </p>
            <Link
              href="/admin/users?tab=tags"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              タグ管理へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <MessagesIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                メッセージ配信
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              LINEユーザーへのメッセージ配信ができます
            </p>
            <Link
              href="/admin/messages"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              メッセージ配信へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <PointsIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                ポイント管理
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              ユーザーへのポイント付与ができます
            </p>
            <Link
              href="/admin/points?tab=points"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              ポイント管理へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <PointsIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                ポイント購入プラン
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              ポイント購入プランの追加・編集ができます
            </p>
            <Link
              href="/admin/points?tab=point-plans"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              ポイント購入プランへ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <GachaIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                ガチャ設定
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              ガチャタイプの確率設定ができます
            </p>
            <Link
              href="/admin/gacha?tab=gacha-types"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              ガチャ設定へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <GiftIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                紹介特典設定
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              友だち紹介システムの特典ポイントを設定できます
            </p>
            <Link
              href="/admin/users?tab=free-gacha-settings"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              紹介特典設定へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <EditIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                結果メッセージテンプレート
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              ガチャ結果メッセージのテンプレートを管理できます
            </p>
            <Link
              href="/admin/messages?tab=result-message-templates"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              テンプレート管理へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                システム
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              操作履歴やキャッシュ管理などシステム設定ができます
            </p>
            <Link
              href="/admin/system"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              システム管理へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <StarIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                等級マスタ管理
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              ガチャの等級（1等、2等など）を追加・編集できます
            </p>
            <Link
              href="/admin/master?tab=prize-tiers"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              等級マスタ管理へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <GiftIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                景品割当（ガチャ別）
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              ガチャタイプごとに景品の等級割当を設定できます
            </p>
            <Link
              href="/admin/master?tab=prize-assignments"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              景品割当へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <PackageIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                アイテム設定
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              ガチャアイテムの追加・編集ができます
            </p>
            <Link
              href="/admin/master?tab=items"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              アイテム設定へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <VideoIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                動画管理
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              ガチャ演出動画のアップロード・管理ができます
            </p>
            <Link
              href="/admin/videos"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              動画管理へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <StatsIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                統計
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              ガチャやアイテムの統計情報を確認できます
            </p>
            <Link
              href="/admin/statistics"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              統計へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <TargetIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                ガチャシミュレータ
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              設定したガチャの排出率を確認できます
            </p>
            <Link
              href="/admin/debug?tab=simulator"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              シミュレータへ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                友だち紹介履歴
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              友だち紹介システムの履歴と無料ガチャ付与状況を確認できます
            </p>
            <Link
              href="/admin/users?tab=referrals"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              友だち紹介履歴へ
            </Link>
          </div>

          <div className="rounded-lg bg-white p-4 shadow lg:p-6">
            <div className="mb-2 flex items-center gap-2">
              <ListIcon className="h-5 w-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 lg:text-lg">
                操作履歴
              </h2>
            </div>
            <p className="mb-4 text-xs text-gray-600 lg:text-sm">
              管理画面での操作履歴を確認できます
            </p>
            <Link
              href="/admin/system?tab=action-history"
              className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-600 lg:inline-block lg:w-auto"
            >
              操作履歴へ
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

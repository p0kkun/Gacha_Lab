'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 簡単な認証チェック（セッションストレージを使用）
  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 環境変数から管理者パスワードを取得（デフォルトは "admin"）
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin';
    
    if (password === adminPassword) {
      sessionStorage.setItem('admin_authenticated', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('パスワードが正しくありません');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
            管理画面ログイン
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
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
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>デフォルトパスワード: admin</p>
            <p className="mt-2 text-xs">
              環境変数 NEXT_PUBLIC_ADMIN_PASSWORD で変更可能
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">ダッシュボード</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-2 text-lg font-semibold text-gray-800">ユーザー管理</h2>
            <p className="mb-4 text-sm text-gray-600">
              ユーザー一覧と詳細情報を確認できます
            </p>
            <a
              href="/admin/users"
              className="inline-block rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              ユーザー管理へ
            </a>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-2 text-lg font-semibold text-gray-800">ガチャ設定</h2>
            <p className="mb-4 text-sm text-gray-600">
              ガチャタイプの確率設定ができます
            </p>
            <a
              href="/admin/gacha-types"
              className="inline-block rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              ガチャ設定へ
            </a>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-2 text-lg font-semibold text-gray-800">アイテム設定</h2>
            <p className="mb-4 text-sm text-gray-600">
              ガチャアイテムの追加・編集ができます
            </p>
            <a
              href="/admin/items"
              className="inline-block rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              アイテム設定へ
            </a>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-2 text-lg font-semibold text-gray-800">統計・購入状況</h2>
            <p className="mb-4 text-sm text-gray-600">
              ガチャごとの課金人数や金額を確認できます
            </p>
            <a
              href="/admin/statistics"
              className="inline-block rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              統計へ
            </a>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-2 text-lg font-semibold text-gray-800">ガチャシミュレータ</h2>
            <p className="mb-4 text-sm text-gray-600">
              設定したガチャの排出率を確認できます
            </p>
            <a
              href="/admin/simulator"
              className="inline-block rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
            >
              シミュレータへ
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}





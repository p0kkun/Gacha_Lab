/**
 * 管理画面の認証ユーティリティ
 * 
 * 注意: 現在は簡易的な認証のみ実装。
 * 本番環境では、より強固な認証（JWT、セッション管理など）を実装することを推奨。
 */

import { NextRequest } from 'next/server';
// import { cookies } from 'next/headers'; // 現在未使用（コメントアウトされているため削除）

/**
 * 管理画面の認証トークンを検証
 * 
 * 現在の実装:
 * - クライアント側で sessionStorage に 'admin_authenticated' を保存
 * - API ルートでは、カスタムヘッダー 'X-Admin-Auth' で認証情報を送信
 * - サーバー側の環境変数 ADMIN_AUTH_TOKEN と比較
 * 
 * 改善案:
 * - JWT トークンを使用
 * - セッション管理をサーバー側で行う
 * - クッキーを使用した認証
 */
export function verifyAdminAuth(request: NextRequest): boolean {
  // 方法1: カスタムヘッダーで認証トークンを送信
  const authToken = request.headers.get('X-Admin-Auth');
  const expectedToken = process.env.ADMIN_AUTH_TOKEN || 'admin'; // サーバー側の環境変数

  if (authToken === expectedToken) {
    return true;
  }

  // 方法2: クッキーで認証トークンを送信（Next.js 15以降）
  // 注意: これはサーバーコンポーネントでのみ使用可能
  // const cookieStore = cookies();
  // const authCookie = cookieStore.get('admin_auth_token');
  // if (authCookie?.value === expectedToken) {
  //   return true;
  // }

  return false;
}

/**
 * 認証が必要なAPIルートで使用するミドルウェア
 */
export function withAdminAuth<T>(
  handler: (req: NextRequest) => Promise<T>
) {
  return async (req: NextRequest): Promise<T | Response> => {
    if (!verifyAdminAuth(req)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ) as unknown as T;
    }
    return handler(req);
  };
}

/**
 * クライアント側で認証トークンを取得
 * 現在は sessionStorage から取得
 * 
 * 注意: この関数はクライアント側でのみ使用可能
 */
export function getAdminAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const authStatus = sessionStorage.getItem('admin_authenticated');
  if (authStatus === 'true') {
    // 簡易的なトークン（本番環境では JWT などを使用）
    // クライアント側では NEXT_PUBLIC_ プレフィックスが必要
    return process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin';
  }
  return null;
}


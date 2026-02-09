"use client";

import { useState, useMemo } from "react";
import { CacheKeys } from "@/lib/cache-keys";
import AdminIcon from "@/components/icons/AdminIcon";
import { CheckIcon, CloseIcon } from "@/components/admin/icons/AdminIcons";

type CacheKeyInfo = {
  key: string;
  description: string;
  pattern: string;
};

export default function CacheManagementContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [cacheValue, setCacheValue] = useState<any>(null);
  const [keyInput, setKeyInput] = useState("");
  const [patternInput, setPatternInput] = useState("");
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<Array<{
    userId: string;
    displayName: string | null;
    pictureUrl: string | null;
  }>>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // 定義されているキャッシュキー一覧（useMemoでメモ化）
  const predefinedKeys: CacheKeyInfo[] = useMemo(
    () => [
      {
        key: CacheKeys.pointBalance("{userId}"),
        description: "ポイント残高（{userId}を実際のユーザーIDに置換）",
        pattern: CacheKeys.pointBalancePattern() },
      {
        key: CacheKeys.userStatsGacha("{userId}"),
        description: "ユーザー統計情報（ガチャ実行情報）",
        pattern: CacheKeys.userStatsPattern() },
      {
        key: CacheKeys.pointPurchasePlans(),
        description: "ポイント購入プラン一覧",
        pattern: CacheKeys.pointPurchasePlans() },
    ],
    []
  );

  const fetchCache = async (key: string) => {
    setLoading(true);
    setError(null);
    setCacheValue(null);

    try {
      const res = await fetch(`/api/admin/cache?key=${encodeURIComponent(key)}`, {
        headers: {} });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        throw new Error("キャッシュの取得に失敗しました");
      }

      const data = await res.json();
      setCacheValue(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const deleteCacheByKey = async (key: string) => {
    if (!confirm(`キー「${key}」のキャッシュを削除しますか？`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/cache", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json" },
        body: JSON.stringify({ key }) });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        throw new Error("キャッシュの削除に失敗しました");
      }

      setSuccess("キャッシュを削除しました");
      setCacheValue(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const deleteCacheByPattern = async (pattern: string) => {
    if (!confirm(`パターン「${pattern}」に一致する全てのキャッシュを削除しますか？`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/cache", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json" },
        body: JSON.stringify({ pattern }) });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        throw new Error("キャッシュの削除に失敗しました");
      }

      setSuccess("キャッシュを削除しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }

    setUserSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`, {
        headers: {} });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        throw new Error("ユーザー検索に失敗しました");
      }

      const data = await res.json();
      setUserSearchResults(data.users || []);
    } catch (e) {
      console.error("ユーザー検索エラー:", e);
      setError(e instanceof Error ? e.message : "ユーザー検索に失敗しました");
      setUserSearchResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  };

  const handleUserSelect = (userId: string, cacheKeyType: string = "point-balance") => {
    // 現在のkeyInputに{userId}が含まれている場合は置換、そうでなければ追加
    if (keyInput.includes("{userId}")) {
      setKeyInput(keyInput.replace("{userId}", userId));
    } else if (keyInput.includes(cacheKeyType)) {
      // 既存のキーにuserIdを追加
      const parts = keyInput.split(":");
      if (parts.length >= 2) {
        setKeyInput(`${parts[0]}:${userId}`);
      } else {
        setKeyInput(`${cacheKeyType}:${userId}`);
      }
    } else {
      // 新しいキーを作成
      setKeyInput(`${cacheKeyType}:${userId}`);
    }
    setShowUserSearchModal(false);
    setUserSearchQuery("");
    setUserSearchResults([]);
  };

  const deleteAllCache = async () => {
    if (!confirm("注意: 全てのキャッシュを削除しますか？\nこの操作は取り消せません。")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/cache", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all" }) });

      if (res.status === 401) {
        sessionStorage.removeItem("admin_authenticated");
        window.location.href = "/admin";
        return;
      }

      if (!res.ok) {
        throw new Error("キャッシュの削除に失敗しました");
      }

      setSuccess("全てのキャッシュを削除しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>
      )}

      {/* 使い方説明 */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 shadow">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-blue-800">
          <AdminIcon name="info" className="h-5 w-5" title="使い方" />
          使い方
        </h2>
        <div className="space-y-3 text-sm text-blue-900">
          <div>
            <h3 className="flex items-center gap-2 font-semibold mb-1">
              <AdminIcon name="key" className="h-4 w-4" title="キー" />
              キーとは？
            </h3>
            <p className="ml-4">
              <strong>特定の1つのキャッシュ</strong>を指定するときに使います。<br />
              例: <code className="bg-blue-100 px-1 rounded">point-balance:U1234567890abcdef</code><br />
              → ユーザーID「U1234567890abcdef」のポイント残高キャッシュのみを取得・削除します。
            </p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-semibold mb-1">
              <AdminIcon name="list" className="h-4 w-4" title="パターン" />
              パターンとは？
            </h3>
            <p className="ml-4">
              <strong>複数のキャッシュを一括で指定</strong>するときに使います。ワイルドカード（<code className="bg-blue-100 px-1 rounded">*</code>）を使用します。<br />
              例: <code className="bg-blue-100 px-1 rounded">point-balance:*</code><br />
              → 全ユーザーのポイント残高キャッシュを一括削除します。
            </p>
          </div>
        </div>
      </div>

      {/* 定義済みキー一覧 */}
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">定義済みキャッシュキー</h2>
        <div className="space-y-2">
          {predefinedKeys.map((info, idx) => {
            // {userId}を含む場合は、実際の使用例を表示
            const hasUserIdPlaceholder = info.key.includes("{userId}");
            const exampleKey = hasUserIdPlaceholder 
              ? info.key.replace("{userId}", "U1234567890abcdef")
              : info.key;

            return (
              <div key={idx} className="rounded border border-gray-200 p-3">
                <div className="mb-1">
                  <div className="font-mono text-sm text-gray-700">{info.key}</div>
                  {hasUserIdPlaceholder && (
                    <div className="mt-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <AdminIcon name="note" className="h-4 w-4" title="使用例" />
                        使用例: <code className="bg-gray-100 px-1 rounded">{exampleKey}</code>
                      </span>
                    </div>
                  )}
                </div>
                <div className="mb-2 text-xs text-gray-600">
                  {info.description}
                  {hasUserIdPlaceholder && (
                    <span className="block mt-1 text-orange-600 font-medium">
                      ※ <code className="bg-orange-100 px-1 rounded">{`{userId}`}</code> の部分を実際のユーザーIDに置き換えて入力してください
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedKey(info.key);
                      // {userId}を含む場合は、プレースホルダーを残したまま入力フィールドに設定
                      setKeyInput(info.key);
                    }}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                    disabled={loading}
                  >
                    キーを選択
                  </button>
                  <button
                    onClick={() => {
                      setPatternInput(info.pattern);
                    }}
                    className="rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700"
                    disabled={loading}
                  >
                    パターンを選択
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* キャッシュ取得 */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">キャッシュ取得・削除（キー指定）</h2>
          <button
            onClick={() => {
              setShowUserSearchModal(true);
              setUserSearchQuery("");
              setUserSearchResults([]);
            }}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            disabled={loading}
          >
            <span className="inline-flex items-center gap-2">
              <AdminIcon name="users" className="h-4 w-4" title="ユーザー検索" />
              ユーザー検索
            </span>
          </button>
        </div>
        <p className="mb-3 text-sm text-gray-600">
          特定のキャッシュキーを指定して、1つのキャッシュデータを取得または削除します。
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="キャッシュキーを入力（例: point-balance:U1234567890abcdef）"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
          />
          <div className="flex gap-2">
            <button
              onClick={() => fetchCache(keyInput)}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              disabled={loading || !keyInput.trim()}
            >
              取得
            </button>
            <button
              onClick={() => deleteCacheByKey(keyInput)}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              disabled={loading || !keyInput.trim()}
            >
              削除
            </button>
          </div>
          {cacheValue !== null && (
            <div className={`mt-4 rounded border p-4 ${
              cacheValue.exists 
                ? "border-green-300 bg-green-50" 
                : "border-red-300 bg-red-50"
            }`}>
              <div className="mb-3 flex items-center gap-2">
                {cacheValue.exists ? (
                  <>
                    <CheckIcon className="h-5 w-5 text-green-700" />
                    <span className="text-sm font-semibold text-green-800">
                      キャッシュが見つかりました
                    </span>
                  </>
                ) : (
                  <>
                    <CloseIcon className="h-5 w-5 text-red-700" />
                    <span className="text-sm font-semibold text-red-800">
                      キャッシュが見つかりませんでした
                    </span>
                  </>
                )}
              </div>
              {cacheValue.exists ? (
                <div>
                  <div className="mb-2 text-xs font-medium text-green-700">
                    キャッシュの値:
                  </div>
                  <pre className="max-h-96 overflow-auto rounded border border-green-200 bg-white p-3 text-xs">
                    {JSON.stringify(cacheValue.value, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-sm text-red-700">
                  <p className="mb-2 font-medium">
                    指定されたキー「<code className="bg-red-100 px-1 rounded font-mono">{keyInput}</code>」のキャッシュは存在しません。
                  </p>
                  <div className="text-xs text-red-600 space-y-1 mt-2">
                    <p className="font-semibold mb-1">考えられる理由:</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      <li>キャッシュがまだ作成されていません（ポイント残高を一度も取得していないユーザーなど）</li>
                      <li>TTL（有効期限: 60秒）が切れています</li>
                      <li>ポイント更新後にキャッシュが削除され、まだ再取得されていません</li>
                      <li>キーが間違っている可能性があります</li>
                    </ul>
                    <div className="mt-3 pt-2 border-t border-red-200">
                      <p className="flex items-center gap-2 font-semibold mb-1">
                        <AdminIcon name="note" className="h-4 w-4" title="補足" />
                        補足:
                      </p>
                      <p>
                        <code className="bg-red-50 px-1 rounded">point-balance</code>キャッシュは、<code className="bg-red-50 px-1 rounded">/api/points/balance</code>でポイント残高を取得した際に自動的に作成されます（TTL: 60秒）。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* パターン削除 */}
      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">パターン削除（一括削除）</h2>
        <p className="mb-3 text-sm text-gray-600">
          ワイルドカード（<code className="bg-gray-100 px-1 rounded">*</code>）を使用して、複数のキャッシュを一括で削除します。
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={patternInput}
            onChange={(e) => setPatternInput(e.target.value)}
            placeholder="パターンを入力（例: point-balance:* で全ユーザーのポイント残高を削除）"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
          />
          <button
            onClick={() => deleteCacheByPattern(patternInput)}
            className="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
            disabled={loading || !patternInput.trim()}
          >
            パターンに一致するキャッシュを削除
          </button>
        </div>
      </div>

      {/* 全削除 */}
      <div className="rounded-lg bg-red-50 p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold text-red-800">危険な操作</h2>
        <button
          onClick={deleteAllCache}
          className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          disabled={loading}
        >
          全てのキャッシュを削除
        </button>
        <p className="mt-2 text-xs text-red-600">
          この操作は全てのキャッシュを削除します。注意して使用してください。
        </p>
      </div>

      {/* ユーザー検索モーダル */}
      {showUserSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowUserSearchModal(false);
              setUserSearchQuery("");
              setUserSearchResults([]);
            }}
          />
          {/* モーダル */}
          <div className="relative z-10 w-full max-w-2xl max-h-[80vh] rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">ユーザー検索</h3>
              <button
                onClick={() => {
                  setShowUserSearchModal(false);
                  setUserSearchQuery("");
                  setUserSearchResults([]);
                }}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="閉じる"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 max-h-[calc(80vh-140px)]">
              <div className="mb-4">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    setUserSearchQuery(query);
                    searchUsers(query);
                  }}
                  placeholder="ユーザーIDまたは表示名で検索..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  autoFocus
                />
              </div>

              {userSearchLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">検索中...</div>
                </div>
              )}

              {!userSearchLoading && userSearchQuery && userSearchResults.length === 0 && (
                <div className="py-8 text-center text-gray-600">
                  ユーザーが見つかりませんでした
                </div>
              )}

              {!userSearchLoading && userSearchResults.length > 0 && (
                <div className="space-y-2">
                  <div className="mb-2 text-sm text-gray-600">
                    検索結果: {userSearchResults.length}件
                  </div>
                  <div className="space-y-1">
                    {userSearchResults.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleUserSelect(user.userId)}
                      >
                        {user.pictureUrl && (
                          <img
                            src={user.pictureUrl}
                            alt={user.displayName || ""}
                            className="h-10 w-10 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-black">
                            {user.displayName || "（表示名なし）"}
                          </div>
                          <div className="text-xs text-gray-600 font-mono">
                            {user.userId}
                          </div>
                        </div>
                        <div className="text-xs text-blue-600">選択</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!userSearchQuery && (
                <div className="py-8 text-center text-gray-500">
                  ユーザーIDまたは表示名を入力して検索してください
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => {
                  setShowUserSearchModal(false);
                  setUserSearchQuery("");
                  setUserSearchResults([]);
                }}
                className="w-full rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

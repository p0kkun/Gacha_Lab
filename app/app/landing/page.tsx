import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* ヘッダー */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">Gacha Lab</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-7xl px-4 py-12">
        {/* ヒーローセクション */}
        <section className="mb-16 text-center">
          <h2 className="mb-4 text-5xl font-bold text-gray-800">
            ポーカー風ガチャプラットフォーム
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
            LINE公式アカウント上で動作する、ホールデムポーカーの演出を楽しめるガチャサービスです。
            役の強さに応じてレアリティが決定され、エピック、レア、コモンの3段階でアイテムを獲得できます。
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://line.me/R/ti/p/@your-line-id"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-green-500 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-green-600"
            >
              LINE公式アカウントで開く
            </a>
          </div>
        </section>

        {/* サービス概要 */}
        <section className="mb-16">
          <h3 className="mb-8 text-center text-3xl font-bold text-gray-800">サービス概要</h3>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 text-4xl">🎰</div>
              <h4 className="mb-2 text-xl font-semibold text-gray-700">ポーカー風ガチャ</h4>
              <p className="text-gray-600">
                ホールデムポーカーの演出を楽しみながら、様々なアイテムやクーポンを獲得できます。
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 text-4xl">🎁</div>
              <h4 className="mb-2 text-xl font-semibold text-gray-700">レアリティシステム</h4>
              <p className="text-gray-600">
                役の強さに応じて、エピック、レア、コモンの3段階のレアリティでアイテムが提供されます。
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 text-4xl">📱</div>
              <h4 className="mb-2 text-xl font-semibold text-gray-700">LINE連携</h4>
              <p className="text-gray-600">
                LINE公式アカウントから簡単にアクセスでき、LINEアカウントでログインできます。
              </p>
            </div>
          </div>
        </section>

        {/* 企業情報 */}
        <section className="mb-16 rounded-lg bg-white p-8 shadow-md">
          <h3 className="mb-6 text-center text-3xl font-bold text-gray-800">運営企業情報</h3>
          <div className="mx-auto max-w-2xl space-y-4 text-gray-600">
            <div>
              <strong className="text-gray-700">企業名:</strong> Gacha Lab
            </div>
            <div>
              <strong className="text-gray-700">サービス名:</strong> Gacha Lab
            </div>
            <div>
              <strong className="text-gray-700">サービス内容:</strong> ポーカー風ガチャプラットフォーム
            </div>
            <div>
              <strong className="text-gray-700">提供商品:</strong> ガチャ抽選サービス、ポーカーイベントのクーポン、バウチャー、その他デジタルアイテム
            </div>
          </div>
        </section>

        {/* フッター */}
        <footer className="border-t bg-white py-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex flex-wrap justify-center gap-6">
              <Link
                href="/about"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                サービスについて
              </Link>
              <Link
                href="/commercial-transaction"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                特定商取引法に基づく表記
              </Link>
              <Link
                href="/terms"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                サービス利用規約
              </Link>
              <Link
                href="/privacy"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                プライバシーポリシー
              </Link>
            </div>
            <p className="text-center text-sm text-gray-500">
              © 2025 Gacha Lab. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}


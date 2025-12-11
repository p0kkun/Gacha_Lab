import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
          Gacha Lab について
        </h1>

        <div className="space-y-6">
          {/* サービス概要 */}
          <section className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-semibold text-gray-700">サービス概要</h2>
            <p className="mb-4 leading-relaxed text-gray-600">
              Gacha Labは、LINE公式アカウント上で動作するポーカー風ガチャプラットフォームです。
              ホールデムポーカーの演出を楽しみながら、様々なアイテムやクーポンを獲得できます。
            </p>
            <p className="leading-relaxed text-gray-600">
              ユーザーはLINEアカウントでログインし、ガチャを引いてポーカーイベントのクーポンやバウチャーを獲得できます。
              役の強さに応じてレアリティが決定され、エピック、レア、コモンの3段階でアイテムが提供されます。
            </p>
          </section>

          {/* 企業情報 */}
          <section className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-semibold text-gray-700">運営企業</h2>
            <div className="space-y-2 text-gray-600">
              <p><strong className="text-gray-700">企業名:</strong> Gacha Lab</p>
              <p><strong className="text-gray-700">サービス名:</strong> Gacha Lab</p>
              <p><strong className="text-gray-700">サービス内容:</strong> ポーカー風ガチャプラットフォーム</p>
            </div>
          </section>

          {/* 商品・サービス内容 */}
          <section className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-semibold text-gray-700">商品・サービス内容</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-lg font-semibold text-gray-700">ガチャ抽選サービス</h3>
                <p className="leading-relaxed text-gray-600">
                  ホールデムポーカーの演出を楽しみながら、アイテムやクーポンを獲得できるガチャサービスです。
                  役の強さに応じて、エピック、レア、コモンの3段階のレアリティでアイテムが提供されます。
                </p>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-gray-700">提供アイテム</h3>
                <ul className="list-disc space-y-1 pl-6 text-gray-600">
                  <li>ポーカーイベントのクーポン</li>
                  <li>バウチャー</li>
                  <li>その他デジタルアイテム</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 利用方法 */}
          <section className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-semibold text-gray-700">利用方法</h2>
            <ol className="list-decimal space-y-2 pl-6 text-gray-600">
              <li>LINE公式アカウントからアプリにアクセス</li>
              <li>LINEアカウントでログイン</li>
              <li>ガチャ商品を選択</li>
              <li>決済を行い、ガチャを引く</li>
              <li>ポーカー演出を楽しみながら結果を確認</li>
              <li>獲得したアイテムを確認</li>
            </ol>
          </section>

          {/* リンク */}
          <section className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-semibold text-gray-700">関連ページ</h2>
            <div className="space-y-2">
              <Link
                href="/commercial-transaction"
                className="block text-blue-600 hover:text-blue-800 hover:underline"
              >
                特定商取引法に基づく表記
              </Link>
              <Link
                href="/terms"
                className="block text-blue-600 hover:text-blue-800 hover:underline"
              >
                サービス利用規約
              </Link>
              <Link
                href="/privacy"
                className="block text-blue-600 hover:text-blue-800 hover:underline"
              >
                プライバシーポリシー
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}



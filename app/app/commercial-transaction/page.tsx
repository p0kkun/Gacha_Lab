export default function CommercialTransactionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
          特定商取引法に基づく表記
        </h1>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="space-y-6">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">事業者名</h2>
              <p className="text-gray-600">Gacha Lab</p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">運営責任者</h2>
              <p className="text-gray-600">Gacha Lab 運営チーム</p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">所在地</h2>
              <p className="text-gray-600">
                〒000-0000<br />
                東京都（詳細はお問い合わせください）
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">お問い合わせ先</h2>
              <p className="text-gray-600">
                メールアドレス: support@gacha-lab.example.com<br />
                （お問い合わせはLINE公式アカウントからも可能です）
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">販売価格</h2>
              <p className="text-gray-600">
                各ガチャ商品の価格は、商品選択画面に表示される価格に準じます。<br />
                価格は税込表示です。
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">商品の引渡時期</h2>
              <p className="text-gray-600">
                ガチャ抽選後、即座に結果が表示されます。<br />
                獲得したアイテムは、抽選完了と同時にアカウントに付与されます。
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">支払方法</h2>
              <p className="text-gray-600">
                クレジットカード決済（Stripe経由）<br />
                対応カード: VISA、Mastercard、American Express、JCB
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">返品・キャンセルについて</h2>
              <p className="text-gray-600">
                ガチャ抽選はデジタルコンテンツの性質上、購入後の返品・キャンセルはお受けできません。<br />
                ただし、システムエラー等により正常に抽選が行われなかった場合は、お問い合わせください。
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">動作環境</h2>
              <p className="text-gray-600">
                LINEアプリがインストールされたスマートフォン（iOS / Android）<br />
                LINEアカウントが必要です。
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">その他</h2>
              <p className="text-gray-600">
                本サービスは、LINE LIFFアプリとして提供されています。<br />
                サービス利用規約およびプライバシーポリシーも併せてご確認ください。
              </p>
            </section>
          </div>

          <div className="mt-8 border-t pt-6">
            <p className="text-sm text-gray-500">
              最終更新日: 2025年1月
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


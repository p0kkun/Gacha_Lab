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
              <h2 className="mb-2 text-xl font-semibold text-gray-700">販売事業者</h2>
              <p className="text-gray-600">株式会社Az-Story</p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">運営責任者</h2>
              <p className="text-gray-600">西村　昌紘</p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">所在地</h2>
              <p className="text-gray-600">
                〒521-0016
                <br />
                滋賀県米原市下多良85-1-105
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">電話番号</h2>
              <p className="text-gray-600">
                080-1324-5151
                <br />
                ※お問い合わせは原則メールにてお願いいたします。
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">メールアドレス</h2>
              <p className="text-gray-600">azstory.customer@gmail.com</p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">販売価格</h2>
              <p className="text-gray-600">各ガチャごとに表示された価格（税込）</p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">
                商品代金以外の必要料金
              </h2>
              <p className="text-gray-600">
                インターネット接続に必要な通信料はユーザー負担となります。
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">支払方法</h2>
              <p className="text-gray-600">アプリ内表示の決済方法</p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">支払時期</h2>
              <p className="text-gray-600">購入手続き完了時に課金されます。</p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">
                商品の提供時期（デジタル）
              </h2>
              <p className="text-gray-600">
                決済完了後、直ちに本サービス内で抽選結果が表示されます。
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">
                賞品（現物）の引渡時期
              </h2>
              <p className="text-gray-600">
                当選後、ユーザーが発送情報を登録してから通常7営業日以内に発送します。
                <br />
                ※在庫状況・天候・配送事情により遅れる場合があります。
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">返品・交換について</h2>
              <p className="text-gray-600">
                商品の性質上、購入後のキャンセル・返金はできません。
                <br />
                ただし、賞品に初期不良がある場合、到着後7日以内にご連絡いただいた場合に限り交換等の対応を行います。
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">動作環境</h2>
              <p className="text-gray-600">
                本サービスが利用可能なOS・端末環境はアプリストアの記載に準じます。
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">
                表現および商品に関する注意書き
              </h2>
              <ul className="list-disc space-y-2 pl-6 text-gray-600">
                <li>掲載画像はイメージを含み、実物と異なる場合があります。</li>
                <li>抽選結果は確率に基づくものであり、特定賞品の当選を保証するものではありません。</li>
                <li>支払金額以上の価値取得を保証するものではありません。</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">
                販売数量の制限等特別な条件
              </h2>
              <p className="text-gray-600">
                ガチャの販売数・提供割合は予告なく変更される場合があります。
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

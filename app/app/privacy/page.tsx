export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
          プライバシーポリシー
        </h1>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <p className="mb-8 text-gray-600">
            株式会社Az-Story（以下「当社」）は、当社が提供するガチャアプリ「TRE BOX」
            （以下「本サービス」）におけるユーザーの個人情報について、以下のとおり取り扱います。
          </p>

          <div className="prose max-w-none space-y-8">
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第1条（取得する情報）
              </h2>
              <p className="mb-2 text-gray-600">当社は、以下の情報を取得する場合があります。</p>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>アカウント情報（ニックネーム、ID 等）</li>
                <li>連絡先情報（メールアドレス）</li>
                <li>賞品発送情報（氏名、住所、電話番号）</li>
                <li>決済関連情報（決済履歴、購入情報）</li>
                <li>端末情報（OS、端末識別情報、IPアドレス）</li>
                <li>アクセスログ・利用履歴</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第2条（利用目的）
              </h2>
              <p className="mb-2 text-gray-600">取得した情報は、以下の目的で利用します。</p>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>本サービスの提供・運営</li>
                <li>抽選結果の通知および賞品発送</li>
                <li>本人確認（高額賞品当選時）</li>
                <li>不正行為の防止および調査</li>
                <li>お問い合わせ対応</li>
                <li>サービス改善・統計分析</li>
                <li>法令に基づく対応</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第3条（第三者提供）
              </h2>
              <p className="mb-2 text-gray-600">
                当社は、以下の場合を除き、個人情報を第三者に提供しません。
              </p>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>ユーザーの同意がある場合</li>
                <li>賞品配送のため配送業者へ提供する場合</li>
                <li>法令に基づく場合</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第4条（委託）
              </h2>
              <p className="text-gray-600">
                当社は、業務の一部を外部事業者に委託する場合があります。その際、適切な管理・監督を行います。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第5条（安全管理）
              </h2>
              <p className="text-gray-600">
                当社は、個人情報の漏えい・滅失・改ざんを防止するため、適切な安全管理措置を講じます。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第6条（保存期間）
              </h2>
              <p className="text-gray-600">
                個人情報は利用目的達成に必要な期間保存し、その後適切に削除します。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第7条（開示・訂正・削除）
              </h2>
              <p className="text-gray-600">
                ユーザーは、当社所定の方法により自己の個人情報の開示・訂正・削除を請求できます。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第8条（未成年の個人情報）
              </h2>
              <p className="text-gray-600">
                未成年者が利用する場合、保護者の同意を得るものとします。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第9条（クッキー等の利用）
              </h2>
              <p className="text-gray-600">
                本サービスでは利用状況分析のためクッキーや類似技術を利用する場合があります。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第10条（ポリシーの変更）
              </h2>
              <p className="text-gray-600">
                本ポリシーは必要に応じて変更されます。変更後は本サービス上に掲示した時点で効力を生じます。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第11条（お問い合わせ窓口）
              </h2>
              <p className="text-gray-600">
                株式会社Az-Story
                <br />
                顧客情報責任者
                <br />
                西村　昌紘
                <br />
                メール：azstory.customer@gmail.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}







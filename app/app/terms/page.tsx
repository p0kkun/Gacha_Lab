export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
          ガチャアプリ利用規約
        </h1>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <p className="mb-8 text-gray-600">
            本規約は、株式会社Az-Story（以下「当社」）が提供するガチャアプリ「TRE BOX」
            （以下「本サービス」）の利用条件を定めるものです。ユーザーは本規約に同意の上、本サービスを利用するものとします。
          </p>

          <div className="prose max-w-none space-y-8">
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第1条（定義）
              </h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>「ユーザー」：本サービスを利用するすべての者</li>
                <li>「本コンテンツ」：アプリ内で表示・取得されるデータ、演出、情報等</li>
                <li>「賞品」：本サービスの抽選により提供される現物商品</li>
                <li>「有償通貨」：アプリ内で購入されるポイント等のデジタル通貨</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第2条（利用登録）
              </h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>ユーザーは当社所定の方法で登録を行います。</li>
                <li>虚偽情報が判明した場合、当社は利用停止できるものとします。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第3条（未成年の利用）
              </h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>未成年者は保護者の同意を得た上で利用するものとします。</li>
                <li>同意のない課金は取り消される場合があります。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第4条（アカウント管理）
              </h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>アカウントは本人のみ利用可能です。</li>
                <li>譲渡・貸与・売買を禁止します。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第5条（課金および支払いの性質）
              </h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>
                  ユーザーの支払いは、本サービスの抽選機会およびエンターテインメント提供の対価です。
                </li>
                <li>特定賞品の取得や価値を保証するものではありません。</li>
                <li>有償通貨の換金・返金は法令上必要な場合を除き行いません。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第6条（ガチャおよび確率）
              </h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>各賞品の提供割合はアプリ内に表示します。</li>
                <li>表示確率は統計的な理論値であり、特定結果を保証するものではありません。</li>
                <li>抽選はシステムによりランダムに実施されます。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第7条（賞品の内容）
              </h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>賞品は新品商品です。</li>
                <li>画像はイメージを含み、実物と異なる場合があります。</li>
                <li>内容は予告なく変更される場合があります。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第8条（賞品の当選および発送）
              </h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>賞品の発送は日本国内に限ります。</li>
                <li>当選後14日以内に発送先情報の登録がない場合、当選は無効となる場合があります。</li>
                <li>住所入力誤りによる未着について当社は責任を負いません。</li>
                <li>発送後の紛失・遅延は配送業者の規約に従います。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第9条（高額賞品の本人確認）
              </h2>
              <p className="text-gray-600">
                市場価格30,000円を超える賞品について、当社は本人確認書類の提出を求める場合があります。確認に応じない場合、当選は無効となる場合があります。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第10条（商品不良）
              </h2>
              <p className="text-gray-600">
                賞品の初期不良は到着後7日以内の申告に限り対応します。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第11条（転売禁止）
              </h2>
              <p className="text-gray-600">
                当選賞品の営利目的の転売を禁止します。違反時はアカウント停止措置を取ることがあります。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第12条（当選の取消）
              </h2>
              <p className="mb-2 text-gray-600">
                以下の場合、当選を無効にできるものとします：
              </p>
              <ul className="list-disc space-y-2 pl-6 text-gray-600">
                <li>不正行為</li>
                <li>複数アカウントの不正利用</li>
                <li>本人確認拒否</li>
                <li>規約違反</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第13条（税金）
              </h2>
              <p className="text-gray-600">
                賞品受領に伴い発生する税金はユーザーの責任とします。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第14条（禁止事項）
              </h2>
              <ul className="list-disc space-y-2 pl-6 text-gray-600">
                <li>不正ツール使用</li>
                <li>バグ悪用</li>
                <li>誹謗中傷</li>
                <li>法令違反行為</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第15条（データの権利）
              </h2>
              <p className="text-gray-600">
                本コンテンツの権利は当社に帰属し、ユーザーには使用権のみ付与されます。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第16条（サービス変更・終了）
              </h2>
              <p className="text-gray-600">
                当社は事前告知により本サービスの変更・停止・終了ができます。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第17条（免責）
              </h2>
              <p className="text-gray-600">
                当社の責任が発生した場合、ユーザーが直近1か月に支払った金額を上限とします。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第18条（規約変更）
              </h2>
              <p className="text-gray-600">
                本規約は当社の判断で変更できます。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第19条（個人情報）
              </h2>
              <p className="text-gray-600">
                個人情報は別途プライバシーポリシーに従います。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">
                第20条（準拠法・管轄）
              </h2>
              <p className="text-gray-600">
                日本法を準拠法とし、大津地方裁判所を一審専属管轄とします。
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompensationPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
          課金トラブル時の補填ポリシー
        </h1>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <p className="mb-8 text-gray-600">
            本ポリシーは、ガチャアプリ「TRE BOX」（以下「本サービス」）における課金関連の不具合・トラブルが発生した場合の対応方針を定めるものです。
          </p>

          <div className="space-y-6 text-gray-600">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">■ 補填対象となるケース</h2>
              <p className="mb-2">以下の場合、当社は事実確認のうえ、補填対応を行うことがあります。</p>
              <ol className="list-decimal space-y-2 pl-6">
                <li>決済が完了したにもかかわらず抽選が実行されなかった場合</li>
                <li>システム不具合により抽選結果が正常に反映されなかった場合</li>
                <li>当社のシステム障害が原因で有償通貨が消失した場合</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">■ 補填内容</h2>
              <p className="mb-2">状況に応じて以下のいずれかを実施します。</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>未実行分の抽選回数の付与</li>
                <li>消失した有償通貨の返還</li>
                <li>同等価値のゲーム内補填</li>
              </ul>
              <p className="mt-2">※現金での返金は、法令に基づく場合を除き行いません。</p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">■ 補填対象外となるケース</h2>
              <p className="mb-2">以下は補填対象外となります。</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>ユーザーの通信環境・端末不具合による問題</li>
                <li>誤操作による購入・抽選実行</li>
                <li>確率結果に対する不満（例：「当たらない」等）</li>
                <li>利用規約違反が確認された場合</li>
                <li>問い合わせ時点で十分な確認情報がない場合</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">■ 申請方法</h2>
              <p className="mb-2">
                不具合が発生した場合、以下の情報を添えてサポート窓口へご連絡ください。
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>ユーザーID</li>
                <li>発生日時</li>
                <li>購入内容（回数・金額）</li>
                <li>状況の詳細</li>
                <li>レシート情報（ストア決済履歴のスクリーンショット等）</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">■ 申請期限</h2>
              <p>トラブル発生から7日以内にご連絡いただいた場合に限り対応します。</p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">■ 調査について</h2>
              <ul className="list-disc space-y-2 pl-6">
                <li>当社はサーバーログおよび決済情報を基に確認を行います。</li>
                <li>調査結果により補填可否を判断します。</li>
                <li>不正利用の疑いがある場合、アカウント停止措置を行うことがあります。</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-gray-700">■ 免責事項</h2>
              <p>当社の責任は、ユーザーが直近1か月に支払った金額を上限とします。</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
          Gacha Lab サービス利用規約
        </h1>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <p className="mb-6 text-sm text-gray-500">最終更新日：2025年1月</p>

          <div className="prose max-w-none space-y-8">
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">第1条（適用）</h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>本規約は、Gacha Lab（以下「本サービス」といいます）の利用条件を定めるものです。</li>
                <li>本サービスを利用するすべてのユーザー（以下「ユーザー」といいます）は、本規約に同意したものとみなされます。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">第2条（サービス内容）</h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>本サービスは、LINE上で動作するポーカー風ガチャ機能を提供するプラットフォームです。</li>
                <li>ユーザーは、本サービスを通じてガチャ抽選を行い、ポーカー演出を視聴し、アイテムやクーポンを獲得することができます。</li>
                <li>本サービスの機能や仕様は予告なく変更される場合があります。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">第3条（利用資格）</h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>本サービスは、LINEアカウントを保有するユーザーが利用できます。</li>
                <li>未成年者が利用する場合は、保護者の同意を得た上で利用してください。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">第4条（禁止事項）</h2>
              <p className="mb-2 text-gray-600">ユーザーは、以下の行為を行ってはなりません。</p>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>本サービスの運営を妨害する行為</li>
                <li>不正な手段により本サービスを利用する行為</li>
                <li>その他、法令に違反する行為または公序良俗に反する行為</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">第5条（免責事項）</h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>本サービスの利用により生じた損害について、運営者は一切の責任を負いません。</li>
                <li>本サービスは現状のまま提供され、動作の保証はありません。</li>
                <li>本サービスの中断、終了、またはデータの消失により生じた損害について、運営者は責任を負いません。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">第6条（個人情報の取り扱い）</h2>
              <p className="text-gray-600">
                本サービスにおける個人情報の取り扱いについては、別途定めるプライバシーポリシーに従います。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">第7条（規約の変更）</h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>運営者は、ユーザーへの事前通知なく、本規約を変更することができます。</li>
                <li>変更後の規約は、本サービス上に掲載した時点から効力を生じるものとします。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">第8条（準拠法および管轄裁判所）</h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>本規約は、日本法に準拠して解釈されます。</li>
                <li>本サービスに関する紛争については、運営者の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。</li>
              </ol>
            </section>
          </div>

          <div className="mt-8 border-t pt-6">
            <p className="text-gray-600">
              <strong>運営者：</strong>Gacha Lab
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


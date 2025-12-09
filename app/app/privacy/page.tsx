export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-800">
          Gacha Lab プライバシーポリシー
        </h1>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <p className="mb-6 text-sm text-gray-500">最終更新日：2025年1月</p>

          <p className="mb-8 text-gray-600">
            Gacha Lab（以下「当サービス」といいます）は、ユーザーの個人情報の保護を重要視しており、以下のとおりプライバシーポリシーを定めます。
          </p>

          <div className="prose max-w-none space-y-8">
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">1. 個人情報の取得主体</h2>
              <p className="text-gray-600">
                本サービスにおける個人情報の取得主体は、以下のとおりです。
              </p>
              <p className="mt-2 text-gray-600">
                <strong>プロバイダー名：</strong>Gacha Lab
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">2. 取得する個人情報</h2>
              <p className="mb-2 text-gray-600">当サービスでは、以下の個人情報を取得する場合があります。</p>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>
                  <strong>LINEアカウント情報</strong>
                  <br />
                  ユーザーID、表示名、プロフィール画像（LINEプラットフォーム経由で取得）
                </li>
                <li>
                  <strong>サービス利用情報</strong>
                  <br />
                  ガチャ抽選履歴、動画視聴履歴、アクセス日時
                </li>
                <li>
                  <strong>端末情報</strong>
                  <br />
                  デバイス情報、OS情報、ブラウザ情報（サービス改善のため）
                </li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">3. 個人情報の利用目的</h2>
              <p className="mb-2 text-gray-600">取得した個人情報は、以下の目的で利用します。</p>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>本サービスの提供・運営</li>
                <li>ガチャ抽選機能の提供</li>
                <li>サービス改善のための分析</li>
                <li>不正利用の防止</li>
                <li>お問い合わせ対応</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">4. 個人情報の管理</h2>
              <ol className="list-decimal space-y-2 pl-6 text-gray-600">
                <li>当サービスは、個人情報を適切に管理し、漏洩、滅失、毀損の防止に努めます。</li>
                <li>個人情報は、暗号化通信（HTTPS）により保護します。</li>
              </ol>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">5. 個人情報の第三者提供</h2>
              <p className="text-gray-600">
                当サービスは、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">6. 個人情報の開示・訂正・削除</h2>
              <p className="text-gray-600">
                ユーザーは、当サービスが保有する個人情報について、開示・訂正・削除を請求することができます。請求方法については、お問い合わせ先までご連絡ください。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">7. Cookie等の利用</h2>
              <p className="text-gray-600">
                当サービスでは、サービス改善のため、Cookie等の技術を使用する場合があります。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">8. お問い合わせ先</h2>
              <p className="text-gray-600">
                個人情報に関するお問い合わせは、以下の方法でご連絡ください。
              </p>
              <p className="mt-2 text-gray-600">
                <strong>プロバイダー名：</strong>Gacha Lab
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-gray-700">9. プライバシーポリシーの変更</h2>
              <p className="text-gray-600">
                本ポリシーは、法令の変更やサービス内容の変更に伴い、予告なく変更される場合があります。変更後のポリシーは、本ページに掲載した時点から効力を生じるものとします。
              </p>
            </section>
          </div>

          <div className="mt-8 border-t pt-6">
            <p className="text-gray-600">
              <strong>制定日：</strong>2025年1月
            </p>
            <p className="mt-2 text-gray-600">
              <strong>運営者：</strong>Gacha Lab
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


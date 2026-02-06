import React from "react";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">
          各種規約・ポリシー
        </h1>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <p className="mb-6 text-gray-600">
            以下のリンクから各種規約・ポリシーをご確認いただけます。
          </p>

          <ul className="space-y-3 text-gray-700">
            <li>
              <a className="text-blue-600 hover:underline" href="/terms">
                利用規約
              </a>
            </li>
            <li>
              <a className="text-blue-600 hover:underline" href="/privacy">
                プライバシーポリシー
              </a>
            </li>
            <li>
              <a
                className="text-blue-600 hover:underline"
                href="/commercial-transaction"
              >
                特定商取引法に基づく表記
              </a>
            </li>
            <li>
              <a className="text-blue-600 hover:underline" href="/compensation-policy">
                資金決済法に基づく表記
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md">
        {/* ヘッダー */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-800">ヘルプ・お知らせ</h1>
        </div>

        {/* メニュー */}
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">サービスについて</h2>
            <p className="mb-4 text-sm text-gray-600">
              Gacha Labは、ホールデムポーカーの演出を楽しめるガチャサービスです。
              役の強さに応じてレアリティが決定され、エピック、レア、コモンの3段階でアイテムを獲得できます。
            </p>
            <Link
              href="/about"
              className="text-blue-600 hover:underline"
              target="_blank"
            >
              詳細を見る →
            </Link>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">利用規約</h2>
            <p className="mb-4 text-sm text-gray-600">
              サービスの利用規約をご確認ください。
            </p>
            <Link
              href="/terms"
              className="text-blue-600 hover:underline"
              target="_blank"
            >
              利用規約を見る →
            </Link>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">プライバシーポリシー</h2>
            <p className="mb-4 text-sm text-gray-600">
              個人情報の取り扱いについてご確認ください。
            </p>
            <Link
              href="/privacy"
              className="text-blue-600 hover:underline"
              target="_blank"
            >
              プライバシーポリシーを見る →
            </Link>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              特定商取引法に基づく表記
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              特定商取引法に基づく表記をご確認ください。
            </p>
            <Link
              href="/commercial-transaction"
              className="text-blue-600 hover:underline"
              target="_blank"
            >
              表記を見る →
            </Link>
          </div>
        </div>

        {/* メニューリンク */}
        <div className="mt-6 rounded-lg bg-white p-4 shadow">
          <a
            href="?action=gacha"
            className="block rounded-md bg-blue-500 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-600"
          >
            ガチャを引く
          </a>
        </div>
      </div>
    </div>
  );
}



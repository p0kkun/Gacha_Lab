import React from "react";
import Link from "next/link";

type LegalLink = {
  href: string;
  title: string;
  description: string;
};

const legalLinks: LegalLink[] = [
  {
    href: "/terms",
    title: "サービス利用規約",
    description: "サービスの利用条件・禁止事項など",
  },
  {
    href: "/privacy",
    title: "プライバシーポリシー",
    description: "個人情報の取り扱いについて",
  },
  {
    href: "/commercial-transaction",
    title: "特定商取引法に基づく表記",
    description: "販売事業者情報・返品条件など",
  },
  {
    href: "/compensation-policy",
    title: "課金トラブル時の補填ポリシー",
    description: "返金・補填の対応方針について",
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen px-4 py-6" style={{ backgroundColor: "#e9dacb" }}>
      <div className="mx-auto max-w-md">
        <div
          className="mb-5 rounded-2xl p-5 shadow"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.55)" }}
        >
          <h1 className="text-2xl font-bold" style={{ color: "#4a3a2a" }}>
            各種規約・ポリシー
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#6b5a4a" }}>
            重要事項の一覧です。リンクから詳細をご確認ください。
          </p>
        </div>

        <div className="space-y-3">
          {legalLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block rounded-2xl px-4 py-4 shadow transition"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold" style={{ color: "#4a3a2a" }}>
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "#6b5a4a" }}>
                    {item.description}
                  </p>
                </div>
                <span
                  className="text-lg transition group-hover:translate-x-0.5"
                  style={{ color: "#8b6f47" }}
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

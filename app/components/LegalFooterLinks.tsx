"use client";

import Link from "next/link";

type LegalFooterLinksProps = {
  className?: string;
  linkClassName?: string;
};

export default function LegalFooterLinks({
  className = "flex flex-wrap justify-center gap-4",
  linkClassName = "text-blue-600 hover:text-blue-800 hover:underline",
}: LegalFooterLinksProps) {
  return (
    <div className={className}>
      <Link href="/terms" className={linkClassName}>
        サービス利用規約
      </Link>
      <Link href="/privacy" className={linkClassName}>
        プライバシーポリシー
      </Link>
      <Link href="/commercial-transaction" className={linkClassName}>
        特定商取引法に基づく表記
      </Link>
      <Link href="/compensation-policy" className={linkClassName}>
        課金トラブル時の補填ポリシー
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";

type LegalFooterLinksProps = {
  className?: string;
  linkClassName?: string;
  onLinkClick?: (href: string) => boolean | void;
};

export default function LegalFooterLinks({
  className = "flex flex-wrap justify-center gap-4",
  linkClassName = "text-blue-600 hover:text-blue-800 hover:underline",
  onLinkClick,
}: LegalFooterLinksProps) {
  const links = [
    { href: "/terms", label: "サービス利用規約" },
    { href: "/privacy", label: "プライバシーポリシー" },
    { href: "/commercial-transaction", label: "特定商取引法に基づく表記" },
    { href: "/compensation-policy", label: "課金トラブル時の補填ポリシー" },
  ];

  return (
    <div className={className}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={linkClassName}
          onClick={(e) => {
            if (!onLinkClick) return;
            const result = onLinkClick(link.href);
            if (result === false) {
              e.preventDefault();
            }
          }}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

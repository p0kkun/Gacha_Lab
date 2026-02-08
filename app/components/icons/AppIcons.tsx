import React from "react";

type IconProps = {
  className?: string;
  title?: string;
};

type Suit = "spade" | "heart" | "diamond" | "club";

type SuitIconProps = IconProps & {
  suit: Suit;
};

const SUIT_PATHS: Record<Suit, string> = {
  spade:
    "M12 2c-3.9 3.4-8 6.7-8 10.6 0 2.5 1.9 4.4 4.4 4.4 1.5 0 2.8-.7 3.6-1.8-.2 1.3-.9 2.7-2.3 4.8h5.2c-1.4-2.1-2.1-3.5-2.3-4.8.8 1.1 2.1 1.8 3.6 1.8 2.5 0 4.4-1.9 4.4-4.4C20 8.7 15.9 5.4 12 2z",
  heart:
    "M12 20s-7-4.4-9.2-8.5C1.1 7.3 2.8 4 6.1 4c2 0 3.3 1.1 3.9 2.2C10.6 5.1 11.9 4 13.9 4c3.3 0 5 3.3 3.3 7.5C19 15.6 12 20 12 20z",
  diamond: "M12 2l7 10-7 10L5 12 12 2z",
  club:
    "M12 2c-2 0-3.6 1.6-3.6 3.6 0 .7.2 1.4.6 2-2.7.1-4.8 2.3-4.8 5 0 2.8 2.3 5 5 5 1.4 0 2.7-.6 3.6-1.6-.2 1.3-.9 2.7-2.3 4.8h5.2c-1.4-2.1-2.1-3.5-2.3-4.8.9 1 2.2 1.6 3.6 1.6 2.8 0 5-2.2 5-5 0-2.7-2.1-4.9-4.8-5 .4-.6.6-1.3.6-2C15.6 3.6 14 2 12 2z",
};

export function SuitIcon({ suit, className, title }: SuitIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-4 w-4"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      fill="currentColor"
    >
      {title ? <title>{title}</title> : null}
      <path d={SUIT_PATHS[suit]} />
    </svg>
  );
}

export function CardBackIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-4 w-4"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <rect x="4" y="3" width="16" height="18" rx="2" fill="#FDE68A" />
      <rect x="6" y="5" width="12" height="14" rx="1" fill="#F59E0B" />
      <rect x="7" y="6" width="10" height="12" rx="1" fill="#FDE68A" />
    </svg>
  );
}

export function GiftIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-5 w-5"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <rect x="3" y="9" width="18" height="11" rx="2" fill="#F59E0B" />
      <rect x="3" y="9" width="18" height="3" fill="#FCD34D" />
      <rect x="11" y="9" width="2" height="11" fill="#FCD34D" />
      <path
        d="M12 4c-1.7-2-4.5-1.5-4.5.6 0 1.1.9 2.1 2.7 2.4H12V4z"
        fill="#FBBF24"
      />
      <path
        d="M12 4c1.7-2 4.5-1.5 4.5.6 0 1.1-.9 2.1-2.7 2.4H12V4z"
        fill="#FBBF24"
      />
    </svg>
  );
}

export function PhoneIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-5 w-5"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <rect x="7" y="2" width="10" height="20" rx="2" fill="#9CA3AF" />
      <rect x="8.5" y="4" width="7" height="14" rx="1" fill="#E5E7EB" />
      <circle cx="12" cy="19" r="1" fill="#6B7280" />
    </svg>
  );
}

export function SpinnerIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-5 w-5 animate-spin"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="9" stroke="#E5E7EB" strokeWidth="3" fill="none" />
      <path
        d="M21 12a9 9 0 0 1-9 9"
        stroke="#F59E0B"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}

export function LightbulbIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-4 w-4"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 3a6 6 0 0 0-3.3 11.1L9 17h6l.3-2.9A6 6 0 0 0 12 3z"
        fill="#FCD34D"
      />
      <rect x="9" y="17" width="6" height="3" rx="1" fill="#9CA3AF" />
    </svg>
  );
}

export function CreditCardIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-4 w-4"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <rect x="3" y="5" width="18" height="14" rx="2" fill="#93C5FD" />
      <rect x="3" y="8" width="18" height="3" fill="#60A5FA" />
      <rect x="6" y="14" width="6" height="2" rx="1" fill="#2563EB" />
    </svg>
  );
}

export function PinIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-4 w-4"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z"
        fill="#F59E0B"
      />
      <circle cx="12" cy="9" r="2.5" fill="#FDE68A" />
    </svg>
  );
}

export function GachaIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-5 w-5"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <rect x="5" y="3" width="14" height="18" rx="2" fill="#F59E0B" />
      <circle cx="12" cy="9" r="3" fill="#FDE68A" />
      <rect x="9" y="14" width="6" height="2" rx="1" fill="#B45309" />
    </svg>
  );
}

export function HelpIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-5 w-5"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="10" fill="#E5E7EB" />
      <text x="12" y="13" textAnchor="middle" fontSize="12" fill="#374151">
        ?
      </text>
    </svg>
  );
}

export type { Suit };

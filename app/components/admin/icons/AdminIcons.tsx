import React from "react";

type IconProps = {
  className?: string;
  size?: number;
};

const baseProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function DashboardIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M3 12h7V3H3v9zM14 21h7v-7h-7v7zM14 10h7V3h-7v7zM3 21h7v-5H3v5z" />
    </svg>
  );
}

export function GachaIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M7 8h4M7 12h10M9 20h6" />
    </svg>
  );
}

export function VideoIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <rect x="3" y="5" width="15" height="14" rx="2" />
      <path d="M18 9l3-2v10l-3-2V9z" />
    </svg>
  );
}

export function PointsIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M8.5 9.5h5a2.5 2.5 0 010 5h-5" />
    </svg>
  );
}

export function UsersIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M16 11a4 4 0 10-8 0 4 4 0 008 0z" />
      <path d="M4 20a8 8 0 0116 0" />
    </svg>
  );
}

export function MessagesIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M4 5h16v10H7l-3 3V5z" />
    </svg>
  );
}

export function StatsIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M4 20V6M10 20V10M16 20V4M22 20H2" />
    </svg>
  );
}

export function ShieldIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3z" />
    </svg>
  );
}

export function SettingsIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a7.8 7.8 0 000-6l-2 1.2a6.2 6.2 0 00-1.6-1.6l1.2-2a7.8 7.8 0 00-6 0l1.2 2a6.2 6.2 0 00-1.6 1.6l-2-1.2a7.8 7.8 0 000 6l2-1.2a6.2 6.2 0 001.6 1.6l-1.2 2a7.8 7.8 0 006 0l-1.2-2a6.2 6.2 0 001.6-1.6l2 1.2z" />
    </svg>
  );
}

export function HelpIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 115 0c0 2-2.5 2-2.5 4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function InfoIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

export function GiftIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M12 8v12M3 12h18" />
      <path d="M7 8c-1.5 0-2.5-1-2.5-2.5S5.5 3 7 3c2 0 3 2.5 5 5-2-2.5-3-5-5-5z" />
      <path d="M17 8c1.5 0 2.5-1 2.5-2.5S18.5 3 17 3c-2 0-3 2.5-5 5 2-2.5 3-5 5-5z" />
    </svg>
  );
}

export function PackageIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}

export function TagIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M20 10l-7-7H4v9l7 7 9-9z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}

export function EditIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25z" />
      <path d="M14.06 4.19l3.75 3.75" />
    </svg>
  );
}

export function TargetIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  );
}

export function StarIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3z" />
    </svg>
  );
}

export function ListIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export function WarningIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M12 3l9 16H3l9-16z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function CheckIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}

export function CloseIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className}>
      <path d="M6 6l12 12M18 6l-12 12" />
    </svg>
  );
}

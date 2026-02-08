import React from "react";

type AdminIconName =
  | "users"
  | "tag"
  | "message"
  | "point"
  | "payment"
  | "gacha"
  | "gift"
  | "note"
  | "box"
  | "video"
  | "chart"
  | "target"
  | "list"
  | "key"
  | "shield"
  | "lock"
  | "eyeOff"
  | "doc"
  | "database"
  | "help"
  | "link"
  | "info"
  | "save";

const ICON_LABELS: Record<AdminIconName, string> = {
  users: "U",
  tag: "T",
  message: "M",
  point: "P",
  payment: "¥",
  gacha: "G",
  gift: "G",
  note: "N",
  box: "B",
  video: "V",
  chart: "C",
  target: "R",
  list: "L",
  key: "K",
  shield: "S",
  lock: "L",
  eyeOff: "E",
  doc: "D",
  database: "DB",
  help: "?",
  link: "L",
  info: "i",
  save: "S",
};

type AdminIconProps = {
  name: AdminIconName;
  className?: string;
  title?: string;
};

export default function AdminIcon({ name, className, title }: AdminIconProps) {
  const label = ICON_LABELS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-5 w-5"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#E5E7EB" />
      <text
        x="12"
        y="13"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={label.length > 1 ? "8" : "10"}
        fontWeight="700"
        fill="#374151"
      >
        {label}
      </text>
    </svg>
  );
}

export type { AdminIconName };

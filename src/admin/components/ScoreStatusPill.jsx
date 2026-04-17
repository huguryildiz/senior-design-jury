// src/admin/components/ScoreStatusPill.jsx
// Score sheet status pill: Scored / Partial / Empty
// Uses global .pill classes from status-pills.css.

import { CheckIcon, CircleDotDashedIcon, CircleIcon } from "@/shared/ui/Icons";

const PILL_CONFIG = {
  scored:  { cls: "pill-scored",  Icon: CheckIcon,           label: "Scored" },
  partial: { cls: "pill-partial", Icon: CircleDotDashedIcon, label: "Partial" },
  empty:   { cls: "pill-empty",   Icon: CircleIcon,          label: "Empty" },
};

export default function ScoreStatusPill({ status, className = "" }) {
  const cfg = PILL_CONFIG[status] ?? PILL_CONFIG.empty;
  return (
    <span className={`pill ${cfg.cls}${className ? ` ${className}` : ""}`}>
      <cfg.Icon size={12} />
      {cfg.label}
    </span>
  );
}

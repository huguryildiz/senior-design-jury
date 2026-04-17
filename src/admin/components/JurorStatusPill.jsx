// src/admin/components/JurorStatusPill.jsx
// Juror workflow progress pill: Completed / In Progress / Editing / Ready to Submit / Not Started
// Uses global .pill classes from status-pills.css.

import {
  CircleCheckIcon,
  SendIcon,
  ClockIcon,
  PencilLineIcon,
  CircleSlashIcon,
} from "@/shared/ui/Icons";

const PILL_CONFIG = {
  completed:       { cls: "pill-completed",   Icon: CircleCheckIcon, label: "Completed" },
  ready_to_submit: { cls: "pill-ready",        Icon: SendIcon,        label: "Ready to Submit" },
  in_progress:     { cls: "pill-progress",     Icon: ClockIcon,       label: "In Progress" },
  editing:         { cls: "pill-editing",      Icon: PencilLineIcon,  label: "Editing" },
};

export default function JurorStatusPill({ status, className = "" }) {
  const cfg = PILL_CONFIG[status] ?? { cls: "pill-not-started", Icon: CircleSlashIcon, label: "Not Started" };
  return (
    <span className={`pill ${cfg.cls}${className ? ` ${className}` : ""}`}>
      <cfg.Icon size={12} />
      {cfg.label}
    </span>
  );
}

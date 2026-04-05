// src/admin/LastActivity.jsx

import { HistoryIcon } from "@/shared/ui/Icons";
import { formatTs } from "../utils/adminUtils";

export default function LastActivity({ value, className = "" }) {
  if (!value) return null;
  const label = formatTs(value);
  if (!label || label === "—") return null;
  return (
    <div className={["vera-last-activity", "vera-datetime-text", className].filter(Boolean).join(" ")} title={label} aria-label={`Last activity ${label}`}>
      <span className="vera-last-activity__icon" aria-hidden="true">
        <HistoryIcon />
      </span>
      <span className="leading-tight">{label}</span>
    </div>
  );
}

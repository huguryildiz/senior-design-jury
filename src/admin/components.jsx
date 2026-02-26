// src/admin/components.jsx
// ============================================================
// Shared JSX components for admin tab modules.
import { CheckIcon, HourglassIcon, PencilIcon } from "../shared/Icons";
export { HomeIcon, RefreshIcon } from "../shared/Icons";
// ============================================================

// ── Status badge ──────────────────────────────────────────────
// editingFlag = "editing" takes highest visual priority —
// it means the juror is actively re-editing a submitted form.
export function StatusBadge({ status, editingFlag, variant, icon, children }) {
  if (variant || icon || children) {
    return (
      <span className={`status-badge${variant ? ` ${variant}` : ""}`}>
        {icon}
        {children}
      </span>
    );
  }
  if (editingFlag === "editing")    return <span className="status-badge editing"><PencilIcon />Editing</span>;
  if (status === "all_submitted")   return <span className="status-badge submitted"><CheckIcon />Submitted</span>;
  if (status === "group_submitted") return <span className="status-badge submitted"><CheckIcon />Submitted</span>;
  if (status === "in_progress")     return <span className="status-badge in-progress"><HourglassIcon />In Progress</span>;
  return null;
}

// src/admin/components.jsx
// ============================================================
// Shared JSX components for admin tab modules.
// HomeIcon is re-exported from shared/Icons so admin files
// only need one import path.
// ============================================================

export { HomeIcon, RefreshIcon } from "../shared/Icons";

// ── Status badge ──────────────────────────────────────────────
// editingFlag = "editing" takes highest visual priority —
// it means the juror is actively re-editing a submitted form.
export function StatusBadge({ status, editingFlag }) {
  if (editingFlag === "editing")    return <span className="status-badge editing">✏️ Editing</span>;
  if (status === "all_submitted")   return <span className="status-badge submitted">✓ Submitted</span>;
  if (status === "group_submitted") return <span className="status-badge submitted">✓ Submitted</span>;
  if (status === "in_progress")     return <span className="status-badge in-progress">● In Progress</span>;
  return null;
}

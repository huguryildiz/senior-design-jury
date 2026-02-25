// src/admin/components.jsx
// ============================================================
// Shared JSX components for admin tab modules.
// HomeIcon is re-exported from shared/Icons so admin files
// only need one import path.
// ============================================================

export { HomeIcon, RefreshIcon } from "../shared/Icons";

const EditSVG = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9.5L10 2.5L11.5 4L4.5 11H3Z" />
    <path d="M9.5 3.5L11 5" />
  </svg>
);
const CheckSVG = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7L6 10L11 4" />
  </svg>
);
const DotSVG = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7" cy="7" r="2.5" />
  </svg>
);

// ── Status badge ──────────────────────────────────────────────
// editingFlag = "editing" takes highest visual priority —
// it means the juror is actively re-editing a submitted form.
export function StatusBadge({ status, editingFlag }) {
  if (editingFlag === "editing")    return <span className="status-badge editing"><EditSVG />Editing</span>;
  if (status === "all_submitted")   return <span className="status-badge submitted"><CheckSVG />Submitted</span>;
  if (status === "group_submitted") return <span className="status-badge submitted"><CheckSVG />Submitted</span>;
  if (status === "in_progress")     return <span className="status-badge in-progress"><DotSVG />In Progress</span>;
  return null;
}

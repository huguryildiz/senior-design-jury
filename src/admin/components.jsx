// src/admin/components.jsx
// ============================================================
// Shared JSX components used across admin tab modules.
// ============================================================

// Re-export icons from shared so admin files can import from one place
export { HomeIcon } from "../shared/Icons";

// ── Status badge ──────────────────────────────────────────────
// Now includes "editing" status for the EditingFlag feature.
export function StatusBadge({ status, editingFlag }) {
  // Highest priority: currently being edited after all_submitted
  if (editingFlag === "editing")         return <span className="status-badge editing">✏️ Editing</span>;
  if (status === "all_submitted")        return <span className="status-badge submitted">✓ Submitted</span>;
  if (status === "group_submitted")      return <span className="status-badge submitted">✓ Submitted</span>;
  if (status === "in_progress")          return <span className="status-badge in-progress">● In Progress</span>;
  return null;
}

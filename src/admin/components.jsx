// src/admin/components.jsx
// ── Shared JSX components used across admin tabs ─────────────

export function StatusBadge({ status }) {
  if (status === "all_submitted")   return <span className="status-badge submitted">✓ Submitted</span>;
  if (status === "group_submitted") return <span className="status-badge submitted">✓ Submitted</span>;
  if (status === "in_progress")     return <span className="status-badge in-progress">● In Progress</span>;
  return null;
}

export function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

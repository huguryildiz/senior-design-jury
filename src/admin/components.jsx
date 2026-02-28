// src/admin/components.jsx
// ============================================================
// Shared JSX components for admin tab modules.
import { useEffect } from "react";
import { CheckIcon, HourglassIcon, PencilIcon } from "../shared/Icons";
export { HomeIcon, RefreshIcon } from "../shared/Icons";
// ============================================================

// ── Outside click / tap (pointerdown) ────────────────────────
// Closes on pointerdown outside of provided target(s).
export function useOutsidePointerDown(isOpen, targets, onClose) {
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => {
      const list = Array.isArray(targets) ? targets : [targets];
      for (const t of list) {
        const el = t?.current ?? t;
        if (!el) continue;
        if (el === e.target || (el.contains && el.contains(e.target))) return;
      }
      onClose?.();
    };
    document.addEventListener("pointerdown", handle, { capture: true });
    return () => document.removeEventListener("pointerdown", handle, { capture: true });
  }, [isOpen, targets, onClose]);
}

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

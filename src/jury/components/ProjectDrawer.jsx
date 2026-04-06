// Bottom sheet listing all projects with status badges and avatar chips.
import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { TeamMembersInline } from "@/shared/ui/EntityMeta";
import { getProjectStatus, countFilledForProject } from "../utils/scoreState";

export default function ProjectDrawer({ open, onClose, projects, scores, criteria, current, onNavigate }) {
  const listRef = useRef(null);

  // Scroll active item into view on open
  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector(".dj-drawer-item.active");
    if (active) {
      requestAnimationFrame(() => active.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
  }, [open, current]);

  // Close on Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  let scoredCount = 0;
  let partialCount = 0;
  let emptyCount = 0;
  projects.forEach((p) => {
    const s = getProjectStatus(scores, p.project_id, criteria);
    if (s === "scored") scoredCount++;
    else if (s === "partial") partialCount++;
    else emptyCount++;
  });

  const handleSelect = (idx) => {
    onNavigate(idx);
    onClose();
  };

  return (
    <div className="dj-drawer-overlay" onClick={onClose}>
      <div className="dj-drawer-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="dj-drawer-handle" />
        <div className="dj-drawer-header">
          <div className="dj-drawer-title">Select Group</div>
          <button className="dj-drawer-close" onClick={onClose}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <div className="dj-drawer-summary">
          <span className="dj-drawer-stat">
            <span className="dj-drawer-stat-dot" style={{ background: "#22c55e" }} />
            <span style={{ color: "#22c55e" }}>{scoredCount} scored</span>
          </span>
          <span className="dj-drawer-stat">
            <span className="dj-drawer-stat-dot" style={{ background: "#f59e0b" }} />
            <span style={{ color: "#f59e0b" }}>{partialCount} partial</span>
          </span>
          <span className="dj-drawer-stat">
            <span className="dj-drawer-stat-dot" style={{ background: "#475569" }} />
            <span style={{ color: "#64748b" }}>{emptyCount} empty</span>
          </span>
        </div>
        <div className="dj-drawer-list" ref={listRef}>
          {projects.map((p, i) => {
            const status = getProjectStatus(scores, p.project_id, criteria);
            const filled = countFilledForProject(scores, p.project_id, criteria);
            const total = criteria.length;

            let statusLabel, statusClass;
            if (status === "scored") { statusLabel = `✓ ${total}/${total}`; statusClass = "scored"; }
            else if (status === "partial") { statusLabel = `⚠ ${filled}/${total}`; statusClass = "partial"; }
            else { statusLabel = `${filled}/${total}`; statusClass = "empty"; }

            return (
              <div
                key={p.project_id}
                className={`dj-drawer-item${i === current ? " active" : ""}`}
                onClick={() => handleSelect(i)}
              >
                <span className="dj-drawer-p-badge">P{i + 1}</span>
                <div className="dj-drawer-item-info">
                  <div className="dj-drawer-item-name">{p.title}</div>
                  <div className="dj-drawer-item-members">
                    <TeamMembersInline names={p.members} />
                  </div>
                </div>
                <span className={`dj-drawer-item-status ${statusClass}`}>{statusLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

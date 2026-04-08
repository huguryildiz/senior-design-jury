// Bottom sheet listing all projects with status badges and avatar chips.
import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { TeamMembersInline } from "@/shared/ui/EntityMeta";
import { getProjectStatus, countFilledForProject } from "../utils/scoreState";
import SpotlightTour from "./SpotlightTour";

const DRAWER_TOUR_STEPS = [
  {
    selector: ".dj-drawer-summary",
    title: "Scoring Overview",
    body: "A quick summary of your progress — green means fully scored, amber means partial, grey means not started.",
    placement: "below",
  },
  {
    selector: ".dj-drawer-item",
    title: "Jump to Any Group",
    body: "Tap a group to navigate directly to it. The score and criteria count are shown on the right.",
    placement: "below",
  },
];

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

  const totalMax = criteria.reduce((s, c) => s + (c.max || 0), 0);

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
            const projectScore = criteria.reduce((s, c) => {
              const v = scores[p.project_id]?.[c.id];
              return s + (v !== "" && v != null ? Number(v) || 0 : 0);
            }, 0);

            const dotColor = status === "scored" ? "#22c55e" : status === "partial" ? "#f59e0b" : "#475569";

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
                <div className="dj-drawer-item-right">
                  <span className="dj-drawer-score-hero">
                    {filled > 0 ? (
                      <>
                        <span className="dj-drawer-score-val">{projectScore.toFixed(1)}</span>
                        <span className="dj-drawer-score-max"> /{totalMax}</span>
                      </>
                    ) : (
                      <>
                        <span className="dj-drawer-score-val empty">—</span>
                        <span className="dj-drawer-score-max"> /{totalMax}</span>
                      </>
                    )}
                  </span>
                  <span className="dj-drawer-status-line">
                    <span className="dj-drawer-status-dot" style={{ background: dotColor }} />
                    {filled}/{total}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SpotlightTour
        sessionKey="dj_tour_drawer"
        steps={DRAWER_TOUR_STEPS}
        delay={400}
      />
    </div>
  );
}

// src/jury/EvalHeader.jsx
// ============================================================
// Sticky header for EvalStep (4 rows):
//   Row 1: Juror identity + save status + Home button
//   Row 2: Group info card (collapsible)
//   Row 3: Prev · Dropdown · Next navigation
//   Row 4: Progress bar
// ============================================================

import { memo, useState, useEffect } from "react";
import { CRITERIA, APP_CONFIG } from "../config";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  HomeIcon,
  LandmarkIcon,
  UserCheckIcon,
  LoaderIcon,
} from "../shared/Icons";
import { GroupLabel, ProjectTitle, StudentNames } from "../components/EntityMeta";

// ── Save indicator ─────────────────────────────────────────────
function SaveIndicator({ saveStatus }) {
  if (saveStatus === "saving") {
    return (
      <span className="autosave-dot saving">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
          <g className="autosave-arrow">
            <path d="M12 13v8"/>
            <path d="m8 17 4-4 4 4"/>
          </g>
        </svg>
        Saving…
      </span>
    );
  }
  if (saveStatus === "saved") {
    return (
      <span className="autosave-dot saved">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m17 15-5.5 5.5L9 18"/>
          <path d="M5.516 16.07A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 3.501 7.327"/>
        </svg>
        Saved
      </span>
    );
  }
  return (
    <span className="autosave-dot idle">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
      </svg>
    </span>
  );
}

// ── Progress gradient ──────────────────────────────────────────
function progressGradient(pct) {
  if (pct === 0)   return "#e2e8f0";
  if (pct <= 33)   return "#f97316";
  if (pct <= 66)   return "#eab308";
  if (pct < 100)   return "#84cc16";
  return "#22c55e";
}

// ── Group label for dropdown ───────────────────────────────────
function groupLabel(p, scores) {
  const ppid   = p.project_id;
  const filled = CRITERIA.reduce((acc, c) => {
    const v = scores[ppid]?.[c.id];
    return v === "" || v == null ? acc : acc + 1;
  }, 0);
  const total = CRITERIA.length;
  const ratio = `(${filled}/${total})`;
  const name  = `Group ${p.group_no}`;
  if (filled === total && total > 0) return `✅ ${name} ${ratio}`;
  if (filled > 0)                    return `⚠️ ${name} ${ratio}`;
  return `${name} ${ratio}`;
}

// ── EvalHeader ─────────────────────────────────────────────────
const EvalHeader = memo(function EvalHeader({
  juryName, juryDept,
  saveStatus,
  lockActive,
  onGoHome,
  onShowBackMenu,
  project,
  current,
  projects,
  scores,
  onNavigate,
  progressPct,
  headerCollapsed,
}) {
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);

  // Reset group info panel when navigating to a new group
  useEffect(() => { setGroupInfoOpen(false); }, [current]);

  const studentList = project.group_students
    ? project.group_students.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const goPrev = () => { if (current > 0) onNavigate(current - 1); };
  const goNext = () => { if (current < projects.length - 1) onNavigate(current + 1); };

  return (
    <div className={`eval-sticky-header${headerCollapsed ? " is-collapsed" : ""}`}>

      {/* Row 1: Juror identity + save status + Home button */}
      <div className="eval-identity-bar">
        <div className="eval-identity-left">
          <div className="eval-identity-name-row">
            <span className="eval-identity-icon" aria-hidden="true"><UserCheckIcon /></span>
            <span className="eval-identity-name eval-scroll-line">{juryName}</span>
          </div>
          {juryDept && (
            <span className="eval-identity-dept eval-scroll-line">
              <LandmarkIcon />
              <span className="eval-identity-dept-text">{juryDept}</span>
            </span>
          )}
        </div>
        <div className="eval-identity-actions">
          <span className="eval-identity-save">
            <SaveIndicator saveStatus={saveStatus} />
          </span>
          <span className="eval-identity-sep" aria-hidden="true">·</span>
          <button
            className="eval-home-btn-icon"
            onClick={() => { lockActive ? onGoHome() : onShowBackMenu(); }}
            aria-label="Home"
          >
            <HomeIcon />
          </button>
        </div>
      </div>

      {/* Row 2: Group info card (collapsible) */}
      <div className={`eval-project-card-wrap${headerCollapsed ? " collapsed" : ""}`}>
        <div className={`eval-project-card${groupInfoOpen ? " is-open" : ""}`}>
          <div className="eval-project-summary">
            <div className="eval-group-cluster">
              <div className="eval-group-label">
                <GroupLabel text={`Group ${project.group_no}`} size={18} />
              </div>
              <button
                className="eval-project-toggle"
                type="button"
                aria-expanded={groupInfoOpen}
                aria-label={groupInfoOpen ? "Collapse group details" : "Expand group details"}
                onClick={() => setGroupInfoOpen((v) => !v)}
              >
                <ChevronDownIcon />
              </button>
            </div>
          </div>
          <div className="eval-project-details">
            {project.project_title && (
              <div className="eval-project-detail">
                <ProjectTitle text={project.project_title} size={16} />
              </div>
            )}
            {APP_CONFIG.showStudents && studentList.length > 0 && (
              <div className="eval-project-detail">
                <StudentNames names={studentList} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Prev · Dropdown · Next */}
      <div className="eval-nav-row">
        <button
          className="group-nav-btn"
          onClick={goPrev}
          disabled={current === 0}
          aria-label="Previous group"
        >
          <ChevronLeftIcon />
        </button>
        <div className="group-nav-center">
          <select
            className="group-nav-select"
            value={current}
            onChange={(e) => onNavigate(Number(e.target.value))}
          >
            {projects.map((p, i) => (
              <option key={p.project_id} value={i}>{groupLabel(p, scores)}</option>
            ))}
          </select>
        </div>
        <button
          className="group-nav-btn"
          onClick={goNext}
          disabled={current === projects.length - 1}
          aria-label="Next group"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Row 4: Progress bar */}
      <div className="eval-progress-row">
        <span className="eval-progress-icon" aria-hidden="true">
          <LoaderIcon />
        </span>
        <div className="eval-progress-bar-bg">
          <div
            className="eval-progress-bar-fill"
            style={{ width: `${progressPct}%`, background: progressGradient(progressPct) }}
          />
        </div>
        <span className="eval-progress-label">{Math.round(progressPct)}%</span>
      </div>

    </div>
  );
});

export default EvalHeader;

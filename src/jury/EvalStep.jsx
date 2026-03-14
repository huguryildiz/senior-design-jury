// src/jury/EvalStep.jsx
// ============================================================
// Step 3 — Scoring form orchestrator.
//
// Owns UI state (showBackMenu, headerCollapsed, scrollRef).
// All score state and handlers come from useJuryState via props.
// Sub-components:
//   EvalHeader       — sticky 4-row header
//   GroupStatusPanel — status banners (synced / edit / lock / error)
//   ScoringGrid      — criterion inputs + comments + submit buttons
//
// Write strategy:
//   - Score onChange  → state only, no write
//   - Score onBlur    → clamp + writeGroup(pid)
//   - Comment onChange → state only, no write
//   - Comment onBlur  → writeGroup(pid)
//   - Navigation      → writeGroup(currentPid) then navigate
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { CRITERIA } from "../config";
import { isScoreFilled } from "./useJuryState";
import { HomeIcon, PencilIcon } from "../shared/Icons";
import EvalHeader from "./EvalHeader";
import GroupStatusPanel from "./GroupStatusPanel";
import ScoringGrid from "./ScoringGrid";

export default function EvalStep({
  juryName, juryDept,
  projects,
  current, onNavigate,
  scores, comments, touched,
  groupSynced, editMode, lockActive,
  progressPct, allComplete,
  saveStatus,
  handleScore, handleScoreBlur,
  handleCommentChange, handleCommentBlur,
  handleFinalSubmit,
  onGoHome,
}) {
  const [showBackMenu,    setShowBackMenu]    = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const scrollRef = useRef(null);

  const project = projects[current];

  // Sticky header collapse on mobile scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (window.innerWidth > 1024) { setHeaderCollapsed(false); return; }
      const y = el.scrollTop;
      setHeaderCollapsed((prev) => {
        if (!prev && y > 80) return true;
        if (prev && y < 30) return false;
        return prev;
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const onShowBackMenu = useCallback(() => setShowBackMenu(true), []);

  if (!project) return null;

  const pid = project.project_id;

  const completedGroups = (projects || []).filter((p) =>
    CRITERIA.every((c) => isScoreFilled(scores[p.project_id]?.[c.id]))
  ).length;
  const totalGroups = projects?.length || 0;

  const totalScore = CRITERIA.reduce(
    (s, c) => s + (parseInt(scores[pid]?.[c.id], 10) || 0),
    0
  );

  return (
    <div
      className="eval-screen"
      onClick={(e) => {
        if (e.target === e.currentTarget) document.activeElement.blur();
      }}
    >
      <div className="eval-card">
        <div className="eval-scroll" ref={scrollRef}>

          <EvalHeader
            juryName={juryName}
            juryDept={juryDept}
            saveStatus={saveStatus}
            lockActive={lockActive}
            onGoHome={onGoHome}
            onShowBackMenu={onShowBackMenu}
            project={project}
            current={current}
            projects={projects}
            scores={scores}
            onNavigate={onNavigate}
            progressPct={progressPct}
            headerCollapsed={headerCollapsed}
          />

          <div className="eval-body">
            <GroupStatusPanel
              pid={pid}
              groupSynced={groupSynced}
              editMode={editMode}
              lockActive={lockActive}
              saveStatus={saveStatus}
              handleCommentBlur={handleCommentBlur}
            />
            <ScoringGrid
              pid={pid}
              scoresPid={scores[pid]}
              commentsPid={comments[pid]}
              touchedPid={touched[pid]}
              lockActive={lockActive}
              handleScore={handleScore}
              handleScoreBlur={handleScoreBlur}
              handleCommentChange={handleCommentChange}
              handleCommentBlur={handleCommentBlur}
              totalScore={totalScore}
              allComplete={allComplete}
              editMode={editMode}
              completedGroups={completedGroups}
              totalGroups={totalGroups}
              handleFinalSubmit={handleFinalSubmit}
            />
          </div>

        </div>
      </div>

      {/* ── Home confirmation overlay ── */}
      {showBackMenu && (
        <div className="back-menu-overlay" onClick={() => setShowBackMenu(false)}>
          <div
            className="back-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="back-menu-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="back-menu-title" id="back-menu-title">Leave this evaluation?</p>
            <p className="back-menu-sub">Your progress is saved. You can continue later.</p>
            <button className="back-menu-btn primary" onClick={() => setShowBackMenu(false)}>
              <PencilIcon />
              Continue Editing
            </button>
            <button
              className="back-menu-btn secondary"
              onClick={() => { setShowBackMenu(false); onGoHome(); }}
            >
              <HomeIcon />
              Return Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

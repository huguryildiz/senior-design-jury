// src/jury/DoneStep.jsx
// ============================================================
// Step 4 — Confirmation / thank-you screen.
// Shows the submitted scores per group.
// Receives `projects` as a prop (dynamic from DB).
// ============================================================

import { useMemo, useState } from "react";
import { CRITERIA } from "../config";
import { HomeIcon, ChevronDownIcon, PencilIcon, HistoryIcon, InfoIcon } from "../shared/Icons";

const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";
import { normalizeCriterion } from "../shared/criteriaHelpers";
import { getCellState, getPartialTotal, jurorStatusMeta } from "../admin/scoreHelpers";
import { GroupLabel, ProjectTitle, StudentNames } from "../components/EntityMeta";
import { formatTs as formatShortTs } from "../admin/utils";

function groupTimestamp(project) {
  const ts = project?.updated_at || "";
  if (!ts) return "—";
  return formatShortTs(ts);
}

export default function DoneStep({
  juryName,
  doneScores,
  scores,
  projects,
  onBack,
  onEditScores,
  criteria: criteriaProp,
}) {
  const criteria = (criteriaProp || CRITERIA).map(normalizeCriterion);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const isEditMode = Boolean(onEditScores);
  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const displayScores = isEditMode ? (scores || {}) : (doneScores || scores || {});
  const titleText = isEditMode
    ? "Edit mode is enabled"
    : `Thank You${juryName ? `, ${juryName}` : ""}!`;
  const subtitleText = isEditMode
    ? "You can update scores and re-submit when you’re done."
    : "Your evaluations have been submitted. Contact the administrator if you need changes.";
  const headerIcon = isEditMode ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil-icon lucide-pencil">
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-party-popper">
      <path d="M5.8 11.3 2 22l10.7-3.79" />
      <path d="M4 3h.01" />
      <path d="M22 8h.01" />
      <path d="M15 2h.01" />
      <path d="M22 20h.01" />
      <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
      <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" />
      <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" />
      <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
    </svg>
  );

  function toggleGroup(pid) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  }

  return (
    <div className="premium-screen done-screen">
      <div className="premium-card done-card">
        <div className="premium-header">
          <div className={`premium-icon-square${isEditMode ? "" : " confetti-icon"}`} aria-hidden="true">
            {!isEditMode && !prefersReducedMotion && <span className="confetti-burst confetti-a" />}
            {!isEditMode && !prefersReducedMotion && <span className="confetti-burst confetti-b" />}
            {headerIcon}
          </div>
          <div className="premium-title">{titleText}</div>
          <div className="premium-subtitle done-subtitle">
            <span>{subtitleText}</span>
          </div>
        </div>

        {isDemoMode && (
          <div className="premium-info-strip" style={{ margin: "0 0 12px" }}>
            <span className="info-strip-icon" aria-hidden="true"><InfoIcon /></span>
            <span>This was a demo evaluation. In production, scores are final and visible to admins.</span>
          </div>
        )}

        <div className="done-summary spd-list">
          {(projects || []).map((p) => {
            const pid        = p.project_id;
            const isExpanded = expandedGroups.has(pid);
            const panelId    = `done-group-panel-${pid}`;
            const criteriaValues = displayScores[pid] || {};
            const allFilled = criteria.every((c) => {
              const v = criteriaValues[c.id ?? c.key];
              return v !== null && v !== undefined && String(v).trim() !== "";
            });
            const totalScore = getPartialTotal(displayScores[pid] || {}, criteria);
            const rowEntry = {
              ...criteriaValues,
              total: allFilled ? totalScore : null,
            };
            const scoreState = getCellState(rowEntry);
            const stateMeta = jurorStatusMeta[scoreState] ?? jurorStatusMeta.empty;
            const StatusIcon = stateMeta.icon;
            const shownScore =
              scoreState === "scored"
                ? totalScore
                : scoreState === "partial"
                  ? getPartialTotal(rowEntry)
                  : "—";
            const timestamp = groupTimestamp(p);
            const studentList = p.group_students
              ? p.group_students.split(",").map((s) => s.trim()).filter(Boolean)
              : [];
            const hasDetails = Boolean(p.project_title) || studentList.length > 0;

            return (
              <div key={pid} className="spd-row-wrap">
                <div className="spd-row">
                  <button
                    className="spd-row-left group-accordion-header"
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => { if (hasDetails) toggleGroup(pid); }}
                    style={{ cursor: hasDetails ? "pointer" : "default" }}
                  >
                    <div className="spd-row-header-line">
                      <span className="spd-row-name">
                        <span className="spd-row-name-text swipe-x">
                          <GroupLabel text={`Group ${p.group_no}`} shortText={`Group ${p.group_no}`} />
                        </span>
                        {hasDetails && (
                          <span className={`group-accordion-chevron${isExpanded ? " open" : ""}`}>
                            <ChevronDownIcon />
                          </span>
                        )}
                      </span>
                    </div>
                  </button>
                  <span className="spd-row-ts" title={timestamp}>
                    <span className="spd-row-ts-icon" aria-hidden="true"><HistoryIcon /></span>
                    <span className="spd-row-ts-text">{timestamp}</span>
                  </span>
                  <span className={`status-badge ${stateMeta.colorClass} spd-row-pill`}>
                    <StatusIcon />
                    {stateMeta.label}
                  </span>
                  <span className={`spd-row-score ${scoreState}`}>{String(shownScore)}</span>
                </div>

                {hasDetails && (
                  <div id={panelId} className={`group-accordion-panel${isExpanded ? " open" : ""}`}>
                    <div className="group-accordion-panel-inner spd-row-details">
                      {p.project_title && (
                        <div className="spd-detail">
                          <ProjectTitle text={p.project_title} />
                        </div>
                      )}
                      <div className="spd-detail">
                        <StudentNames names={studentList} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="done-actions">
          {onEditScores && (
            <button className="premium-btn-secondary done-edit-glow" onClick={onEditScores} type="button">
              <PencilIcon />
              Edit My Scores
            </button>
          )}
          <button className="premium-btn-primary" onClick={onBack} type="button">
            <HomeIcon /> Return Home
          </button>
        </div>
      </div>
    </div>
  );
}

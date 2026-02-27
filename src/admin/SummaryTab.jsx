// src/admin/SummaryTab.jsx
// ── Ranking summary with medal badges ────────────────────────

import { useState } from "react";
import { APP_CONFIG, CRITERIA } from "../config";
import { InfoIcon, UsersRoundIcon, FolderKanbanIcon } from "../shared/Icons";
import medalFirst from "../assets/1st-place-medal.svg";
import medalSecond from "../assets/2nd-place-medal.svg";
import medalThird from "../assets/3rd-place-medal.svg";

const CRITERIA_LIST = CRITERIA.map((c) => ({ id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max }));

const MEDALS = [medalFirst, medalSecond, medalThird];
export default function SummaryTab({ ranked, submittedData }) {
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  function toggleGroup(groupKey) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  }

  if (submittedData.length === 0) {
    return <div className="empty-msg">No submitted evaluations yet.</div>;
  }
  const topRankTheme = { accent: "#c89b2f", tint: "rgba(253, 248, 238, 0.92)" };
  return (
    <div className="summary-page">
      <div className="summary-note">
        <InfoIcon />
        Rankings include only <strong>completed</strong> submissions.
      </div>
      <div className="rank-list">
      {ranked.map((p, i) => {
        const groupId = p.id ?? i + 1;
        const groupKey = `summary-${groupId}-${i}`;
        const isExpanded = expandedGroups.has(groupKey);
        const hasDetails = !!p.desc || (APP_CONFIG.showStudents && p.students?.length > 0);
        const panelId = `summary-group-panel-${groupKey}`;
        return (
          <div
            key={p.id ?? `${p.name}-${i}`}
            className={`rank-card${i === 0 ? " top-rank" : ""} rank-${i + 1}`}
            style={i === 0 ? { background: topRankTheme.tint } : undefined}
          >
            {i === 0 && (
              <span className="rank-accent" style={{ background: topRankTheme.accent }} aria-hidden="true" />
            )}
            <div className={`rank-num${i < 3 ? " top-rank" : ""}`}>
              {i < 3 ? (
                <img className="rank-medal" src={MEDALS[i]} alt={`${i + 1} place medal`} />
              ) : (
                i + 1
              )}
            </div>
            <div className="rank-info">
              <div className="group-card-wrap">
                <button
                  className="group-card-header group-accordion-header"
                  tabIndex={hasDetails ? 0 : -1}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  type="button"
                  onClick={() => { if (hasDetails) toggleGroup(groupKey); }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && hasDetails) {
                      e.preventDefault();
                      toggleGroup(groupKey);
                    }
                  }}
                  style={{ cursor: hasDetails ? "pointer" : "default" }}
                >
                  <div className="group-card-title">
                    <span className="group-card-name">Group {groupId}</span>
                    {hasDetails && (
                      <span className={`group-accordion-chevron${isExpanded ? " open" : ""}`}>▾</span>
                    )}
                  </div>
                  <div className="group-card-score">
                    <small className="group-card-score-label">AVERAGE</small>
                    <span
                      className="group-card-score-value"
                      style={i === 0 ? { color: topRankTheme.accent } : undefined}
                    >
                      {p.totalAvg.toFixed(2)}
                    </span>
                  </div>
                </button>
                <div
                  id={panelId}
                  className={`group-accordion-panel${isExpanded ? " open" : ""}`}
                >
                  <div className="group-accordion-panel-inner group-card-accordion-inner">
                    {p.desc && (
                      <div className="group-card-desc">
                        <span className="group-card-desc-icon" aria-hidden="true"><FolderKanbanIcon /></span>
                        <span className="group-card-desc-text">{p.desc}</span>
                      </div>
                    )}
                    {APP_CONFIG.showStudents && p.students?.length > 0 && (
                      <div className="group-card-students">
                        <span className="group-card-students-icon" aria-hidden="true"><UsersRoundIcon /></span>
                        <span className="group-card-students-text">{p.students.join(" · ")}</span>
                      </div>
                    )}
                  </div>
                </div>
                <span className="rank-eval-count">({p.count} evaluation{p.count !== 1 ? "s" : ""})</span>
              </div>
              <div className="rank-bars">
                {CRITERIA_LIST.map((c) => (
                  <div key={c.id} className="mini-bar-row">
                    <span className="mini-label">{c.shortLabel || c.label}</span>
                    <div className="mini-bar-track">
                      <div className="mini-bar-fill" style={{ width: `${((p.avg[c.id] || 0) / c.max) * 100}%` }} />
                    </div>
                    <span className="mini-val">{(p.avg[c.id] || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

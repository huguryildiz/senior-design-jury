// src/admin/SummaryTab.jsx
// ── Ranking summary with medal badges ────────────────────────

import { useState } from "react";
import { APP_CONFIG, CRITERIA } from "../config";
import { InfoIcon } from "../shared/Icons";
import medalFirst from "../assets/1st-place-medal.svg";
import medalSecond from "../assets/2nd-place-medal.svg";
import medalThird from "../assets/3rd-place-medal.svg";

const CRITERIA_LIST = CRITERIA.map((c) => ({ id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max }));

const rankTheme = (i) => [
  { bg: "#F59E0B", fg: "#0B1220", ring: "#FCD34D" },
  { bg: "#94A3B8", fg: "#0B1220", ring: "#CBD5E1" },
  { bg: "#B45309", fg: "#FFF7ED", ring: "#FDBA74" },
][i] ?? { bg: "#475569", fg: "#F1F5F9", ring: "#94A3B8" };

const MEDALS = [medalFirst, medalSecond, medalThird];
const rankBadge = (i) => {
  const medalSrc = MEDALS[i];
  return medalSrc ? <img className="rank-medal" src={medalSrc} alt={`${i + 1} place medal`} /> : String(i + 1);
};
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
  return (
    <>
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
          <div key={p.id ?? `${p.name}-${i}`} className="rank-card" style={i < 3 ? {
            background: "#ECFDF5",
            boxShadow: "0 0 0 1px #BBF7D0, 0 8px 22px rgba(34,197,94,0.18)",
            border: "1px solid #86EFAC",
          } : undefined}>
            <div className="rank-num" style={{
              width: 52, height: 52, borderRadius: 999, display: "grid", placeItems: "center",
              fontSize: i < 3 ? 22 : 18, fontWeight: 800,
              background: i < 3 ? "transparent" : rankTheme(i).bg,
              color: rankTheme(i).fg,
              boxShadow: i < 3 ? "0 0 0 5px rgba(34,197,94,0.25)" : "0 6px 18px rgba(15,23,42,0.12)",
              border: i < 3 ? "none" : `3px solid ${rankTheme(i).ring}`,
              overflow: "hidden",
              padding: 0,
            }}>
              {rankBadge(i)}
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
                    <small className="group-card-score-label">avg.</small>
                    <span className="group-card-score-value">{p.totalAvg.toFixed(2)}</span>
                  </div>
                </button>
                <div
                  id={panelId}
                  className={`group-accordion-panel${isExpanded ? " open" : ""}`}
                >
                  <div className="group-accordion-panel-inner group-card-accordion-inner">
                    {p.desc && (
                      <div className="group-card-desc">
                        {p.desc}
                      </div>
                    )}
                    {APP_CONFIG.showStudents && p.students?.length > 0 && (
                      <div className="group-card-students">
                        👥 {p.students.join(" · ")}
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
    </>
  );
}

// src/admin/JurorsTab.jsx
// ============================================================
// Per-juror progress cards.
//
// Features:
//   - Filter by juror dropdown + free-text search
//   - EditingFlag badge ("✏️ Editing") when a juror is
//     actively re-editing after submission
//   - PIN reset button that calls onPinReset(juryName, juryDept)
// ============================================================

import { useState, useMemo } from "react";
import { PROJECTS } from "../config";
import { formatTs } from "./utils";
import { StatusBadge } from "./components";

const PROJECT_LIST = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);
const TOTAL_GROUPS = PROJECT_LIST.length;

export default function JurorsTab({ jurorStats, jurors, onPinReset }) {
  const [jurorFilter, setJurorFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let list = jurorStats;
    if (jurorFilter !== "ALL") list = list.filter((s) => s.jury === jurorFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        s.jury.toLowerCase().includes(q) ||
        (s.latestRow?.juryDept || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [jurorStats, jurorFilter, searchQuery]);

  return (
    <>
      {/* Filter bar */}
      <div className="juror-filter-bar">
        <select
          className="juror-filter-select"
          value={jurorFilter}
          onChange={(e) => setJurorFilter(e.target.value)}
        >
          <option value="ALL">All jurors</option>
          {jurors.map((j) => <option key={j} value={j}>{j}</option>)}
        </select>

        <div className="juror-search-wrap">
          <input
            className="juror-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search by name or department…"
          />
          {searchQuery && (
            <button className="juror-search-clear" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty-msg">No jurors match the current filter.</div>
      )}

      {filtered.map(({ jury, rows, submitted, overall, latestTs, latestRow }) => {
        const pct = Math.round((submitted.length / TOTAL_GROUPS) * 100);

        // Colour the progress bar based on completion percentage.
        const barColor =
          pct === 100 ? "#22c55e" :
          pct > 66    ? "#84cc16" :
          pct > 33    ? "#eab308" :
          pct > 0     ? "#f97316" : "#e2e8f0";

        // Show "✏️ Editing" badge when ANY row for this juror has
        // editingFlag="editing" (set by resetJuror on the server).
        const isEditing = rows.some((r) => r.editingFlag === "editing");

        return (
          <div key={jury} className={`juror-card ${isEditing ? "juror-card-editing" : ""}`}>

            {/* Card header: identity + status + meta + PIN reset */}
            <div className="juror-card-header">
              <div>
                <div className="juror-name">
                  👤 {jury}
                  {latestRow?.juryDept && (
                    <span className="juror-dept-inline"> ({latestRow.juryDept})</span>
                  )}
                </div>
                {isEditing
                  ? <StatusBadge status={overall} editingFlag="editing" />
                  : <StatusBadge status={overall} />
                }
              </div>

              <div className="juror-meta">
                {latestTs > 0 && (
                  <div className="juror-last-submit">
                    <span className="juror-last-submit-label">Last activity</span>
                    <span className="juror-last-submit-time">
                      {formatTs(latestRow?.timestamp)}
                    </span>
                  </div>
                )}
                <div style={{
                  fontSize:   13,
                  color:      submitted.length < TOTAL_GROUPS ? "#b45309" : "#166534",
                  fontWeight: 600,
                }}>
                  {submitted.length === TOTAL_GROUPS
                    ? "✓ All completed"
                    : `${submitted.length}/${TOTAL_GROUPS} completed`}
                </div>

                {/* PIN reset button */}
                {onPinReset && (
                  <button
                    className="pin-reset-btn"
                    title={`Reset PIN for ${jury}`}
                    onClick={() => {
                      if (window.confirm(
                        `Reset PIN for ${jury}?\n\nThey will be assigned a new PIN on their next login.`
                      )) {
                        onPinReset(jury, latestRow?.juryDept || "");
                      }
                    }}
                  >
                    🔑 Reset PIN
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="juror-progress-wrap">
              <div className="juror-progress-bar-bg">
                <div
                  className="juror-progress-bar-fill"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
              <span className="juror-progress-label">{pct}%</span>
            </div>

            {/* Per-group rows */}
            <div className="juror-projects">
              {rows
                .slice()
                .sort((a, b) => a.projectId - b.projectId)
                .map((d) => {
                  const grp = PROJECT_LIST.find((p) => p.id === d.projectId);
                  return (
                    <div key={`${jury}-${d.projectId}`} className="juror-row">
                      <div className="juror-row-main">
                        <span className="juror-row-name">Group {d.projectId}</span>
                        {grp?.desc && (
                          <span className="juror-row-desc">{grp.desc}</span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        {formatTs(d.timestamp)}
                      </span>
                      <StatusBadge status={d.status} editingFlag={d.editingFlag} />
                      {(d.status === "all_submitted" || d.status === "group_submitted") && (
                        <span className="juror-score">{d.total} / 100</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </>
  );
}

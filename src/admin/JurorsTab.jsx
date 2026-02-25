// src/admin/JurorsTab.jsx

import { useState, useMemo } from "react";
import { PROJECTS } from "../config";
import { formatTs, adminCompletionPct } from "./utils";
import { StatusBadge } from "./components";

const PROJECT_LIST = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);

// jurors prop: { key, name, dept, jurorId }[]
export default function JurorsTab({ jurorStats, onPinReset }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return jurorStats;
    return jurorStats.filter((s) =>
      s.jury.toLowerCase().includes(q) ||
      (s.dept || s.latestRow?.juryDept || "").toLowerCase().includes(q)
    );
  }, [jurorStats, searchQuery]);

  return (
    <div className="jurors-tab-wrap">
      {/* Search bar */}
      <div className="juror-filter-bar">
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

      <div className="jurors-grid jurors-grid-full">
        {filtered.map((stat) => {
          const { key, jury, rows, overall, latestRow } = stat;

          // Progress bar: matches Jury Form sticky header (criteria filled / total criteria).
          const pct = adminCompletionPct(rows);

          const barColor =
            pct === 100 ? "#22c55e" :
            pct > 66    ? "#84cc16" :
            pct > 33    ? "#eab308" :
            pct > 0     ? "#f97316" : "#e2e8f0";

          const isEditing = rows.some((r) => r.editingFlag === "editing");

          const statusClass = isEditing
            ? "juror-card-editing"
            : overall === "all_submitted" ? "juror-card-all-submitted"
            : overall === "in_progress"   ? "juror-card-in-progress"
            : "";

          return (
            <div key={key} className={`juror-card ${statusClass}`}>

              <div className="juror-card-header">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="juror-name" style={{ wordBreak: "break-word" }}>
                    👤 {jury}
                    {latestRow?.juryDept && (
                      <span className="juror-dept-inline"> ({latestRow.juryDept})</span>
                    )}
                  </div>
                  {isEditing
                    ? <StatusBadge status={overall} editingFlag="editing" />
                    : <StatusBadge status={overall} />
                  }
                  {onPinReset && (
                    <button
                      className="pin-reset-btn"
                      title={`Reset PIN for ${jury}`}
                      onClick={() => {
                        if (window.confirm(
                          `Reset PIN for ${jury}?\n\nThey will be assigned a new PIN on their next login.`
                        )) {
                          onPinReset(jury, latestRow?.juryDept || "", latestRow?.jurorId || "");
                        }
                      }}
                    >
                      🔑 Reset PIN
                    </button>
                  )}
                </div>

                <div className="juror-meta">
                  {latestRow?.timestamp && (
                    <div className="juror-last-submit">
                      <span className="juror-last-submit-label">Last activity</span>
                      <span className="juror-last-submit-time">
                        {formatTs(latestRow?.timestamp)}
                      </span>
                    </div>
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
                      <div key={`${key}-${d.projectId}`} className="juror-row">
                        <div className="juror-row-main">
                          <span className="juror-row-name">
                            {grp?.name || `Group ${d.projectId}`}
                          </span>
                          {grp?.desc && (
                            <span className="juror-row-desc">{grp.desc}</span>
                          )}
                          {grp?.students?.length > 0 && (
                            <span className="juror-row-students">
                              👥 {grp.students.join(" · ")}
                            </span>
                          )}
                        </div>
                        <div className="juror-row-right">
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {formatTs(d.timestamp)}
                          </span>
                          <StatusBadge status={d.status} editingFlag={d.editingFlag} />
                          {(d.status === "all_submitted" || d.status === "group_submitted") && (
                            <span className="juror-score">{d.total} / 100</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

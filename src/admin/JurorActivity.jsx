// src/admin/JurorActivity.jsx

import { useState, useMemo, useEffect } from "react";
import { formatTs, adminCompletionPct, cmp } from "./utils";
import { readSection, writeSection } from "./persist";
import { StatusBadge } from "./components";
import { getCellState, getPartialTotal, jurorStatusMeta } from "./scoreHelpers";
import { ChevronDownIcon, HistoryIcon, LandmarkIcon, LoaderIcon, SearchIcon, UserCheckIcon, XIcon } from "../shared/Icons";
import { GroupLabel, ProjectTitle, StudentNames } from "../components/EntityMeta";

// jurorStats prop: { key, name, dept, jurorId, rows, latestRow, editEnabled }[]
// groups prop: { id (uuid), groupNo, label }[]

function getOverallStatus(stat, groupCount) {
  const isEditing = !!stat.editEnabled;
  const isFinal = !!stat.latestRow?.finalSubmittedAt;
  const scoredCount = (stat.rows || []).filter((d) => d.total !== null && d.total !== undefined).length;
  const startedCount = (stat.rows || []).filter((d) => getCellState(d) !== "empty").length;
  return (
    isEditing                                             ? "editing"         :
    isFinal                                               ? "completed"       :
    (scoredCount === groupCount && groupCount > 0)        ? "ready_to_submit" :
    startedCount > 0                                      ? "in_progress"     :
    "not_started"
  );
}

export default function JurorActivity({ jurorStats, groups = [] }) {
  const [searchTerm, setSearchTerm] = useState(() => {
    const s = readSection("jurors");
    return typeof s.searchTerm === "string" ? s.searchTerm : "";
  });

  useEffect(() => {
    writeSection("jurors", { searchTerm });
  }, [searchTerm]);

  const [expandedJurors, setExpandedJurors] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  function toggleJuror(jurorKey) {
    setExpandedJurors((prev) => {
      const next = new Set(prev);
      next.has(jurorKey) ? next.delete(jurorKey) : next.add(jurorKey);
      return next;
    });
  }
  function toggleGroup(jurorKey, groupId) {
    const groupKey = `${jurorKey}-${groupId}`;
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = jurorStats.slice().sort((a, b) => cmp(a.jury, b.jury));
    if (normalizedSearch) {
      list = list.filter((s) => {
        const dept = s.latestRow?.juryDept || s.dept || "";
        const status = getOverallStatus(s, groups.length);
        const statusLabel = jurorStatusMeta[status]?.label ?? status;
        const statusText = `${status} ${statusLabel} ${String(status).replace(/_/g, " ")}`;
        const haystack = `${s.jury} ${dept} ${statusText}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }
    return list;
  }, [jurorStats, normalizedSearch, groups.length]);

  return (
    <div className="juror-activity">
      {/* Search bar */}
      <div className="juror-filter-bar">
        <div className="juror-search-wrap">
          <span className="juror-search-icon" aria-hidden="true"><SearchIcon /></span>
          <input
            className="juror-search-input"
            type="text"
            placeholder="Search jurors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search jurors"
          />
          {searchTerm && (
            <button
              className="juror-search-clear"
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchTerm("")}
            >
              <XIcon />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty-msg">No jurors match the current filter.</div>
      )}

      <div className="jurors-grid jurors-grid-compact">
        {filtered.map((stat) => {
          const { key, jury, rows, latestRow, editEnabled, dept } = stat;
          const overallStatus = getOverallStatus(stat, groups.length);
          const isEditing = !!editEnabled;
          const totalGroups = groups.length;
          const scoredCount = (rows || []).filter((d) => d.total !== null && d.total !== undefined).length;
          const pct = adminCompletionPct(rows, totalGroups);
          const isExpanded = expandedJurors.has(key);
          const safeKey = String(key).replace(/[^a-z0-9_-]/gi, "_");
          const panelId = `juror-eval-panel-${safeKey}`;

          const barColor =
            pct === 100 ? "#22c55e" :
            pct > 66    ? "#84cc16" :
            pct > 33    ? "#eab308" :
            pct > 0     ? "#f97316" : "#e2e8f0";

          const deptLine = String(latestRow?.juryDept || dept || "").trim();
          const lastActivity = (latestRow?.finalSubmittedAt || latestRow?.updatedAt)
            ? formatTs(latestRow?.finalSubmittedAt || latestRow?.updatedAt)
            : "—";
          const rowMap = new Map((rows || []).map((r) => [r.projectId, r]));
          const perGroupRows = groups.map((g) => {
            const row = rowMap.get(g.id);
            const projectTitle = String(g.title ?? g.project_title ?? "").trim();
            const studentsList = Array.isArray(g.students)
              ? g.students
              : String(g.students ?? "")
                  .split(/[;,]/)
                  .map((s) => s.trim())
                  .filter(Boolean);
            const updatedAtRaw = row?.updatedAt || row?.updated_at || row?.timestamp || "";
            const updatedAt = updatedAtRaw ? formatTs(updatedAtRaw) : "—";
            const entry = row || {
              projectId: g.id,
              groupNo: g.groupNo,
              total: null,
              technical: null,
              design: null,
              delivery: null,
              teamwork: null,
            };
            const state = getCellState(entry);
            const scoreValue =
              state === "scored"  ? Number(entry.total) :
              state === "partial" ? getPartialTotal(entry) :
              null;
            return {
              id: g.id,
              label: g.label || `Group ${g.groupNo}`,
              shortLabel: `Grp. ${g.groupNo}`,
              projectTitle,
              students: studentsList,
              updatedAt,
              state,
              score: scoreValue,
            };
          });

          const statusClass =
            overallStatus === "editing"         ? "juror-card-editing"         :
            overallStatus === "completed"       ? "juror-card-completed"       :
            overallStatus === "ready_to_submit" ? "juror-card-ready-to-submit" :
            overallStatus === "in_progress"     ? "juror-card-in-progress"     :
            overallStatus === "not_started"     ? "juror-card-not-started"     : "";

          return (
            <div key={key} className={`juror-card ${statusClass}`}>
              <div className="juror-card-top">
                <div className="juror-card-identity">
                  <div className="juror-name">
                    <span className="juror-name-icon" aria-hidden="true"><UserCheckIcon /></span>
                    <span className="juror-name-text swipe-x">{jury}</span>
                  </div>
                  {deptLine && (
                    <div className="juror-meta-line swipe-x">
                      <LandmarkIcon />
                      {deptLine}
                    </div>
                  )}
                </div>
                <div className="juror-card-status">
                  <StatusBadge
                    status={overallStatus}
                    editingFlag={isEditing ? "editing" : ""}
                  />
                </div>
              </div>

              <div className="juror-progress-block">
                <div className="juror-progress-row">
                  <span className="juror-progress-icon" aria-hidden="true">
                    <LoaderIcon />
                  </span>
                  <div className="juror-progress-bar-bg">
                    <div
                      className="juror-progress-bar-fill"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                  <span className="juror-progress-percent">{pct}%</span>
                </div>
              </div>

              <div className="juror-card-footer">
                <span className="juror-last-activity">
                  <HistoryIcon />
                  {lastActivity}
                </span>
                {totalGroups > 0 && (
                  <button
                    type="button"
                    className={`juror-expand-btn${isExpanded ? " is-open" : ""}`}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => toggleJuror(key)}
                  >
                    <span>View evaluations</span>
                    <span className={`juror-expand-icon${isExpanded ? " open" : ""}`} aria-hidden="true">
                      <ChevronDownIcon />
                    </span>
                  </button>
                )}
              </div>

              {isExpanded && totalGroups > 0 && (
                <div className="juror-eval-list" id={panelId}>
                  {perGroupRows.map((row) => {
                    const scoreLabel = Number.isFinite(row.score) ? row.score : "—";
                    const groupKey = `${key}-${row.id}`;
                    const hasDetails = Boolean(row.projectTitle) || row.students.length > 0;
                    const isGroupOpen = expandedGroups.has(groupKey);
                    const groupPanelId = `juror-group-panel-${safeKey}-${row.id}`;
                    const meta = jurorStatusMeta[row.state] ?? jurorStatusMeta.not_started;
                    const StatusIcon = meta.icon;
                    return (
                      <div key={`${key}-${row.id}`}>
                        <div className="juror-eval-row">
                          {hasDetails ? (
                            <button
                              type="button"
                              className="juror-eval-toggle group-accordion-header"
                              aria-expanded={isGroupOpen}
                              aria-controls={groupPanelId}
                              onClick={() => toggleGroup(key, row.id)}
                            >
                              <GroupLabel text={row.label} shortText={row.shortLabel} />
                              <span className={`group-accordion-chevron${isGroupOpen ? " open" : ""}`} aria-hidden="true">
                                <ChevronDownIcon />
                              </span>
                            </button>
                          ) : (
                            <span className="juror-eval-label"><GroupLabel text={row.label} shortText={row.shortLabel} /></span>
                          )}
                          <span className="juror-eval-right">
                            <span className="juror-eval-updated">
                              <HistoryIcon />
                              {row.updatedAt}
                            </span>
                            <span className={`status-badge is-compact ${meta.colorClass}`}>
                              <StatusIcon />
                              {meta.label}
                            </span>
                            <span className={`juror-eval-score ${row.state}`}>{scoreLabel}</span>
                          </span>
                        </div>
                        {hasDetails && (
                          <div
                            id={groupPanelId}
                            className={`group-accordion-panel juror-eval-panel${isGroupOpen ? " open" : ""}`}
                          >
                            <div className="group-accordion-panel-inner">
                              <div className="juror-eval-details">
                                {row.projectTitle && (
                                  <div className="juror-eval-detail">
                                    <ProjectTitle text={row.projectTitle} />
                                  </div>
                                )}
                                {row.students.length > 0 && (
                                  <div className="juror-eval-detail">
                                    <StudentNames names={row.students} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

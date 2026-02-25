// src/admin/MatrixTab.jsx
// ── Status-based juror × group color matrix ───────────────────

import { useState, useMemo } from "react";
import { cmp } from "./utils";

const cellStyle = (entry) => {
  if (!entry) return { background: "#f8fafc", color: "#94a3b8" };
  if (entry.status === "all_submitted")   return { background: "#dcfce7", color: "#166534", fontWeight: 700 };
  if (entry.status === "group_submitted") return { background: "#dcfce7", color: "#166534", fontWeight: 700 };
  if (entry.status === "in_progress")     return { background: "#fef9c3", color: "#92400e" };
  return { background: "#f8fafc", color: "#94a3b8" };
};

const cellText = (entry) => {
  if (!entry) return "—";
  if (entry.status === "all_submitted")   return entry.total;
  if (entry.status === "group_submitted") return entry.total;
  if (entry.status === "in_progress")     return "…";
  return "—";
};

export default function MatrixTab({ data, jurors, groups, jurorDeptMap }) {
  const [sortKey,     setSortKey]     = useState("name");   // "name" | "pct" | "totalAvg"
  const [sortDir,     setSortDir]     = useState("asc");    // "asc" | "desc"
  const [jurorSearch, setJurorSearch] = useState("");

  const lookup = useMemo(() => {
    const map = {};
    data.forEach((r) => {
      if (!map[r.juryName]) map[r.juryName] = {};
      map[r.juryName][r.projectId] = { total: r.total, status: r.status };
    });
    return map;
  }, [data]);

  // Completion count (submitted groups) per juror — used for pct sort.
  const submittedCount = (juror) =>
    groups.filter((g) =>
      lookup[juror]?.[g.id]?.status === "all_submitted" ||
      lookup[juror]?.[g.id]?.status === "group_submitted"
    ).length;

  // Average total across submitted groups per juror — used for totalAvg sort.
  const avgTotal = (juror) => {
    const vals = groups
      .map((g) => lookup[juror]?.[g.id])
      .filter((e) => e?.status === "all_submitted" || e?.status === "group_submitted")
      .map((e) => e.total);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const visibleJurors = useMemo(() => {
    let list = jurors.filter((j) =>
      !jurorSearch || j.toLowerCase().includes(jurorSearch.toLowerCase())
    );
    list = [...list].sort((a, b) => {
      if (sortKey === "name")     return sortDir === "asc" ? cmp(a, b)                   : cmp(b, a);
      if (sortKey === "pct")      return sortDir === "asc" ? submittedCount(a) - submittedCount(b) : submittedCount(b) - submittedCount(a);
      if (sortKey === "totalAvg") return sortDir === "asc" ? avgTotal(a) - avgTotal(b)    : avgTotal(b) - avgTotal(a);
      return 0;
    });
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jurors, jurorSearch, sortKey, sortDir, lookup]);

  // Average row: per group, average total of submitted entries from visibleJurors.
  const groupAverages = useMemo(() =>
    groups.map((g) => {
      const vals = visibleJurors
        .map((j) => lookup[j]?.[g.id])
        .filter((e) => e?.status === "all_submitted" || e?.status === "group_submitted")
        .map((e) => e.total);
      return vals.length
        ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
        : null;
    }),
  [visibleJurors, groups, lookup]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }
  const sortIcon = (key) => sortKey !== key ? "" : sortDir === "asc" ? " ↑" : " ↓";

  if (!jurors.length) return <div className="empty-msg">No data yet.</div>;

  return (
    <div className="matrix-wrap">
      {/* Controls */}
      <div className="matrix-controls">
        <div className="matrix-search-wrap">
          <input
            className="matrix-search-input"
            value={jurorSearch}
            onChange={(e) => setJurorSearch(e.target.value)}
            placeholder="🔍 Filter juror…"
          />
          {jurorSearch && (
            <button className="matrix-search-clear" onClick={() => setJurorSearch("")}>✕</button>
          )}
        </div>
        <div className="matrix-sort-bar">
          <span className="matrix-sort-label">Sort:</span>
          {[
            { key: "name",     label: "Name" },
            { key: "pct",      label: "Completion" },
            { key: "totalAvg", label: "Avg Total" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`matrix-sort-btn${sortKey === key ? " active" : ""}`}
              onClick={() => toggleSort(key)}
            >
              {label}{sortIcon(key)}
            </button>
          ))}
        </div>
      </div>

      <p className="matrix-subtitle">
        <span className="matrix-legend-item"><span className="matrix-legend-dot submitted-dot"/>Submitted</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot progress-dot"/>In Progress</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot empty-dot"/>Not Started</span>
        {visibleJurors.length < jurors.length && (
          <span style={{ color: "#3b82f6", fontWeight: 600 }}>
            Showing {visibleJurors.length}/{jurors.length} jurors
          </span>
        )}
      </p>
      <div className="matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="matrix-corner">Juror / Group</th>
              {groups.map((g) => (
                <th key={g.id}>
                  <strong>{g.label}</strong>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleJurors.map((juror) => {
              const dept = jurorDeptMap.get(juror) || "";
              return (
                <tr key={juror}>
                  <td className="matrix-juror">
                    {juror}
                    {dept && <span className="matrix-juror-dept"> ({dept})</span>}
                  </td>
                  {groups.map((g) => {
                    const entry = lookup[juror]?.[g.id] ?? null;
                    return (
                      <td key={g.id} style={cellStyle(entry)}>{cellText(entry)}</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="matrix-avg-row">
              <td className="matrix-juror matrix-avg-label">Average</td>
              {groupAverages.map((avg, i) => (
                <td key={groups[i].id} className="matrix-avg-cell">
                  {avg !== null ? avg : "—"}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// src/admin/MatrixTab.jsx
// ── Enterprise-style juror × group matrix ─────────────────────
// - Column-based sorting (click group header: desc → asc → reset)
// - Sticky header + frozen first column
// - Juror column text filter
// - Final-only averages (all_submitted only)

import { useState, useMemo } from "react";
import { cmp } from "./utils";

// ── Cell helpers ──────────────────────────────────────────────

const cellStyle = (entry) => {
  if (!entry) return { background: "#f8fafc", color: "#94a3b8" };
  if (entry.status === "all_submitted")   return { background: "#dcfce7", color: "#166534", fontWeight: 700 };
  if (entry.status === "group_submitted") return { background: "#dcfce7", color: "#166534", fontWeight: 700 };
  if (entry.status === "in_progress")     return { background: "#fef9c3", color: "#92400e" };
  return { background: "#f8fafc", color: "#94a3b8" };
};

const cellText = (entry) => {
  if (!entry) return "—";
  if (entry.status === "all_submitted" || entry.status === "group_submitted") return entry.total;
  if (entry.status === "in_progress") return "";  // background color only
  return "—";
};

// ── Component ──────────────────────────────────────────────────

// Props:
//   data    – raw rows
//   jurors  – { key, name, dept }[]  (from AdminPanel uniqueJurors)
//   groups  – { id, label }[]
export default function MatrixTab({ data, jurors, groups }) {
  // Group column sort state
  const [sortGroupId,  setSortGroupId]  = useState(null);   // group id | null
  const [sortGroupDir, setSortGroupDir] = useState("desc");  // "desc" | "asc"

  // Juror text filter
  const [jurorFilter,     setJurorFilter]     = useState("");
  const [activeFilterCol, setActiveFilterCol] = useState(null);

  // Build lookup: jurorKey → { [projectId]: { total, status } }
  const lookup = useMemo(() => {
    const map = {};
    data.forEach((r) => {
      const key = r.jurorId
        ? r.jurorId
        : `${(r.juryName || "").trim().toLowerCase()}__${(r.juryDept || "").trim().toLowerCase()}`;
      if (!map[key]) map[key] = {};
      map[key][r.projectId] = { total: r.total, status: r.status };
    });
    return map;
  }, [data]);

  // Click-to-sort cycle on group columns: none → desc → asc → none
  function toggleGroupSort(gId) {
    if (sortGroupId !== gId) {
      setSortGroupId(gId);
      setSortGroupDir("desc");
    } else if (sortGroupDir === "desc") {
      setSortGroupDir("asc");
    } else {
      setSortGroupId(null);
      setSortGroupDir("desc");
    }
  }

  const groupSortIcon = (gId) => {
    if (sortGroupId !== gId) return "↕";
    return sortGroupDir === "desc" ? "↓" : "↑";
  };

  function clearAllFilters() {
    setJurorFilter("");
    setActiveFilterCol(null);
  }

  const visibleJurors = useMemo(() => {
    let list = jurors.slice();

    // Apply juror name text filter.
    if (jurorFilter) {
      const q = jurorFilter.toLowerCase();
      list = list.filter((j) => j.name.toLowerCase().includes(q));
    }

    // Sort by active group column (only all_submitted; missing/non-final → bottom).
    if (sortGroupId !== null) {
      list = [...list].sort((a, b) => {
        const ea = lookup[a.key]?.[sortGroupId];
        const eb = lookup[b.key]?.[sortGroupId];
        const va = ea?.status === "all_submitted" ? Number(ea.total) : null;
        const vb = eb?.status === "all_submitted" ? Number(eb.total) : null;

        // Nulls always sink to bottom regardless of direction.
        if (va === null && vb === null) return cmp(a.name, b.name);
        if (va === null) return 1;
        if (vb === null) return -1;

        const diff = sortGroupDir === "desc" ? vb - va : va - vb;
        return diff !== 0 ? diff : cmp(a.name, b.name); // stable tie-breaker
      });
    }
    // Default order: jurors are alpha-sorted from AdminPanel.

    return list;
  }, [jurors, jurorFilter, sortGroupId, sortGroupDir, lookup]);

  // Average row: final-only entries from visibleJurors, 2 decimal places.
  const groupAverages = useMemo(() =>
    groups.map((g) => {
      const vals = visibleJurors
        .map((j) => lookup[j.key]?.[g.id])
        .filter((e) => e?.status === "all_submitted")
        .map((e) => e.total);
      return vals.length
        ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
        : null;
    }),
  [visibleJurors, groups, lookup]);

  if (!jurors.length) return <div className="empty-msg">No data yet.</div>;

  return (
    <div className="matrix-wrap">

      {/* Controls bar — only rendered when there's something to show */}
      {(jurorFilter || visibleJurors.length < jurors.length) && (
        <div className="matrix-controls">
          {jurorFilter && (
            <button className="matrix-clear-filters" onClick={clearAllFilters}>
              ✕ Clear Filters
            </button>
          )}
          {visibleJurors.length < jurors.length && (
            <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>
              Showing {visibleJurors.length}/{jurors.length} jurors
            </span>
          )}
        </div>
      )}

      {/* Info note + legend */}
      <p className="matrix-info-note">ℹ️ Averages include only final submissions.</p>
      <p className="matrix-subtitle">
        <span className="matrix-legend-item"><span className="matrix-legend-dot submitted-dot"/>Submitted</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot progress-dot"/>In Progress</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot empty-dot"/>Not Started</span>
      </p>

      {/* Close-layer: click outside filter popover to dismiss */}
      {activeFilterCol !== null && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50 }}
          onClick={() => setActiveFilterCol(null)}
        />
      )}

      <div className="matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              {/* Juror column — text filter only */}
              <th className="matrix-corner">
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Juror / Group
                  <button
                    className={`col-filter-btn${jurorFilter ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setActiveFilterCol((p) => p === "juror" ? null : "juror"); }}
                    title="Filter jurors"
                  >▼</button>
                </div>
                {activeFilterCol === "juror" && (
                  <div className="col-filter-popover" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      placeholder="Filter juror name…"
                      value={jurorFilter}
                      onChange={(e) => setJurorFilter(e.target.value)}
                    />
                    {jurorFilter && (
                      <button className="col-filter-clear" onClick={() => { setJurorFilter(""); setActiveFilterCol(null); }}>
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </th>

              {/* Group columns — click-to-sort only, no filter */}
              {groups.map((g) => {
                const isActive = sortGroupId === g.id;
                return (
                  <th key={g.id}>
                    <button
                      className={`matrix-col-sort${isActive ? " active" : ""}`}
                      onClick={() => toggleGroupSort(g.id)}
                      title={`Sort by ${g.label}`}
                    >
                      <strong>{g.label}</strong>
                      <span className="sort-icon">{groupSortIcon(g.id)}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {visibleJurors.map((juror) => (
              <tr key={juror.key}>
                <td className="matrix-juror">
                  {juror.name}
                  {juror.dept && <span className="matrix-juror-dept"> ({juror.dept})</span>}
                </td>
                {groups.map((g) => {
                  const entry = lookup[juror.key]?.[g.id] ?? null;
                  return (
                    <td key={g.id} style={cellStyle(entry)}>{cellText(entry)}</td>
                  );
                })}
              </tr>
            ))}
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

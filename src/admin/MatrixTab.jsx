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

// jurors prop: { key, name, dept }[]
// jurorDeptMap: Map<key, dept> (not used directly since dept is on the object)
export default function MatrixTab({ data, jurors, groups }) {
  const [sortKey,          setSortKey]          = useState("name");  // "name" | "pct" | "totalAvg"
  const [sortDir,          setSortDir]          = useState("asc");
  const [jurorFilter,      setJurorFilter]      = useState("");       // text filter on juror name
  const [groupFilters,     setGroupFilters]     = useState({});       // { [groupId]: { op, val, val2 } }
  const [activeFilterCol,  setActiveFilterCol]  = useState(null);    // which <th> popover is open

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

  // Completion count (final-only) per juror — used for pct sort.
  const submittedCount = (juror) =>
    groups.filter((g) => lookup[juror.key]?.[g.id]?.status === "all_submitted").length;

  // Average total across final-only groups per juror — used for totalAvg sort.
  const avgTotal = (juror) => {
    const vals = groups
      .map((g) => lookup[juror.key]?.[g.id])
      .filter((e) => e?.status === "all_submitted")
      .map((e) => e.total);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const visibleJurors = useMemo(() => {
    let list = jurors.slice();

    // Apply juror name text filter.
    if (jurorFilter) {
      const q = jurorFilter.toLowerCase();
      list = list.filter((j) => j.name.toLowerCase().includes(q));
    }

    // Apply per-group numeric filters (entry must be all_submitted AND satisfy condition).
    Object.entries(groupFilters).forEach(([gId, f]) => {
      if (!f?.val && f?.val !== 0) return;
      const gIdNum = Number(gId);
      list = list.filter((j) => {
        const entry = lookup[j.key]?.[gIdNum];
        if (!entry || entry.status !== "all_submitted") return false;
        const v = Number(entry.total);
        if (f.op === "gte")     return v >= Number(f.val);
        if (f.op === "lte")     return v <= Number(f.val);
        if (f.op === "between") return v >= Number(f.val) && v <= Number(f.val2 ?? f.val);
        return true;
      });
    });

    // Sort.
    list = [...list].sort((a, b) => {
      if (sortKey === "name")     return sortDir === "asc" ? cmp(a.name, b.name)         : cmp(b.name, a.name);
      if (sortKey === "pct")      return sortDir === "asc" ? submittedCount(a) - submittedCount(b) : submittedCount(b) - submittedCount(a);
      if (sortKey === "totalAvg") return sortDir === "asc" ? avgTotal(a) - avgTotal(b)   : avgTotal(b) - avgTotal(a);
      return 0;
    });
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jurors, jurorFilter, groupFilters, sortKey, sortDir, lookup]);

  // Average row: per group, final-only entries from visibleJurors.
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

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }
  const sortIcon = (key) => sortKey !== key ? "" : sortDir === "asc" ? " ↑" : " ↓";

  function setGroupFilter(gId, val) {
    setGroupFilters((prev) => ({ ...prev, [gId]: val }));
  }
  function clearGroupFilter(gId) {
    setGroupFilters((prev) => { const n = { ...prev }; delete n[gId]; return n; });
  }
  function clearAllFilters() {
    setJurorFilter("");
    setGroupFilters({});
    setActiveFilterCol(null);
  }
  const hasFilters = jurorFilter || Object.keys(groupFilters).length > 0;

  function toggleFilterCol(colId) {
    setActiveFilterCol((prev) => (prev === colId ? null : colId));
  }

  if (!jurors.length) return <div className="empty-msg">No data yet.</div>;

  return (
    <div className="matrix-wrap">
      {/* Sort controls */}
      <div className="matrix-controls">
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
        {hasFilters && (
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

      {/* Info note — final-only averages */}
      <p className="matrix-info-note">ℹ️ Averages include only final submissions.</p>

      {/* Legend */}
      <p className="matrix-subtitle">
        <span className="matrix-legend-item"><span className="matrix-legend-dot submitted-dot"/>Submitted</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot progress-dot"/>In Progress</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot empty-dot"/>Not Started</span>
      </p>

      {/* Close-layer: click outside popover to dismiss */}
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
              {/* Juror column with text filter */}
              <th className="matrix-corner" style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Juror / Group
                  <button
                    className={`col-filter-btn${jurorFilter ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("juror"); }}
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

              {/* Group columns with numeric filter */}
              {groups.map((g) => {
                const gf = groupFilters[g.id];
                return (
                  <th key={g.id} style={{ position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <strong>{g.label}</strong>
                      <button
                        className={`col-filter-btn${gf ? " active" : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggleFilterCol(g.id); }}
                        title={`Filter ${g.label}`}
                      >▼</button>
                    </div>
                    {activeFilterCol === g.id && (
                      <div className="col-filter-popover" onClick={(e) => e.stopPropagation()} style={{ left: "auto", right: 0 }}>
                        <select
                          value={gf?.op || "gte"}
                          onChange={(e) => setGroupFilter(g.id, { op: e.target.value, val: gf?.val || "", val2: gf?.val2 || "" })}
                        >
                          <option value="gte">≥ (at least)</option>
                          <option value="lte">≤ (at most)</option>
                          <option value="between">Between</option>
                        </select>
                        {(gf?.op !== "between") ? (
                          <input
                            autoFocus
                            type="number"
                            placeholder="Score…"
                            value={gf?.val || ""}
                            onChange={(e) => setGroupFilter(g.id, { op: gf?.op || "gte", val: e.target.value, val2: gf?.val2 || "" })}
                          />
                        ) : (
                          <div className="filter-between-row">
                            <input
                              autoFocus
                              type="number"
                              placeholder="Min"
                              value={gf?.val || ""}
                              onChange={(e) => setGroupFilter(g.id, { op: "between", val: e.target.value, val2: gf?.val2 || "" })}
                            />
                            <span style={{ fontSize: 11, color: "#64748b" }}>–</span>
                            <input
                              type="number"
                              placeholder="Max"
                              value={gf?.val2 || ""}
                              onChange={(e) => setGroupFilter(g.id, { op: "between", val: gf?.val || "", val2: e.target.value })}
                            />
                          </div>
                        )}
                        {gf && (
                          <button className="col-filter-clear" onClick={() => { clearGroupFilter(g.id); setActiveFilterCol(null); }}>
                            Clear
                          </button>
                        )}
                      </div>
                    )}
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

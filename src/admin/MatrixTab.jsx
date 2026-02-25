// src/admin/MatrixTab.jsx
// ── Enterprise-style juror × group matrix ─────────────────────
// - Column-based sorting (click group header: desc → asc → reset)
// - Sticky header + frozen first column
// - Excel-style per-column header filters
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

function CellContent({ entry }) {
  if (!entry) return "—";
  if (entry.status === "all_submitted" || entry.status === "group_submitted") return entry.total;
  if (entry.status === "in_progress") return <span className="matrix-ip-badge">In Progress</span>;
  return "—";
}

// ── Component ──────────────────────────────────────────────────

// Props:
//   data          – raw rows
//   jurors        – { key, name, dept }[]  (from AdminPanel uniqueJurors)
//   groups        – { id, label }[]
export default function MatrixTab({ data, jurors, groups }) {
  // Sort: which group column is active + direction cycle
  // sortGroupDir cycles: null (default) → "desc" → "asc" → null
  const [sortGroupId,  setSortGroupId]  = useState(null);   // group id | null
  const [sortGroupDir, setSortGroupDir] = useState("desc");  // "desc" | "asc"

  // Filters
  const [jurorFilter,     setJurorFilter]     = useState("");   // text
  const [groupFilters,    setGroupFilters]    = useState({});   // { [groupId]: { op, val, val2 } }
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

  // Click-to-sort cycle: none → desc → asc → none
  function toggleGroupSort(gId) {
    if (sortGroupId !== gId) {
      setSortGroupId(gId);
      setSortGroupDir("desc");
    } else if (sortGroupDir === "desc") {
      setSortGroupDir("asc");
    } else {
      setSortGroupId(null);
      setSortGroupDir("desc"); // reset direction ready for next use
    }
  }

  // Sort icon shown in group column header
  const groupSortIcon = (gId) => {
    if (sortGroupId !== gId) return "↕";
    return sortGroupDir === "desc" ? "↓" : "↑";
  };

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
  function toggleFilterCol(colId) {
    setActiveFilterCol((prev) => (prev === colId ? null : colId));
  }
  const hasFilters = jurorFilter || Object.keys(groupFilters).length > 0;

  const visibleJurors = useMemo(() => {
    let list = jurors.slice();

    // 1. Apply juror name text filter.
    if (jurorFilter) {
      const q = jurorFilter.toLowerCase();
      list = list.filter((j) => j.name.toLowerCase().includes(q));
    }

    // 2. Apply per-group numeric filters (only all_submitted entries count).
    Object.entries(groupFilters).forEach(([gId, f]) => {
      if (f?.val === "" || f?.val === undefined) return;
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

    // 3. Sort by active group column (only all_submitted; missing/non-final → bottom).
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
    // Default order: no extra sort (jurors are already alpha-sorted from AdminPanel).

    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jurors, jurorFilter, groupFilters, sortGroupId, sortGroupDir, lookup]);

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

      {/* Controls: only shown when there's something to show */}
      {(hasFilters || visibleJurors.length < jurors.length) && (
        <div className="matrix-controls">
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
      )}

      {/* Info note + legend */}
      <p className="matrix-info-note">ℹ️ Averages include only final submissions.</p>
      <p className="matrix-subtitle">
        <span className="matrix-legend-item"><span className="matrix-legend-dot submitted-dot"/>Submitted</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot progress-dot"/>In Progress</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot empty-dot"/>Not Started</span>
      </p>

      {/* Close-layer: click outside any open popover to dismiss */}
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
              {/* ── Juror column: text filter ── */}
              <th className="matrix-corner">
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

              {/* ── Group columns: click-to-sort + numeric filter ── */}
              {groups.map((g) => {
                const gf      = groupFilters[g.id];
                const isActive = sortGroupId === g.id;
                return (
                  <th key={g.id}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      {/* Sort trigger */}
                      <button
                        className={`matrix-col-sort${isActive ? " active" : ""}`}
                        onClick={() => toggleGroupSort(g.id)}
                        title={`Sort by ${g.label}`}
                      >
                        <strong>{g.label}</strong>
                        <span className="sort-icon">{groupSortIcon(g.id)}</span>
                      </button>
                      {/* Filter trigger */}
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
                        {gf?.op !== "between" ? (
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
                    <td key={g.id} style={cellStyle(entry)}>
                      <CellContent entry={entry} />
                    </td>
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

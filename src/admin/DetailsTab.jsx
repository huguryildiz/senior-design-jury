// src/admin/DetailsTab.jsx
// ============================================================
// Sortable details table with Excel-style column header filters.
// ============================================================

import { useState, useMemo } from "react";
import { PROJECTS } from "../config";
import { cmp, exportCSV, formatTs, tsToMillis } from "./utils";
import { StatusBadge } from "./components";

const PROJECT_LIST = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);

// Show "—" for null/undefined/empty/NaN only.  0 is a valid score.
function displayScore(val) {
  if (val === "" || val === null || val === undefined) return "—";
  const n = Number(val);
  if (!Number.isFinite(n)) return "—";
  return n;
}

const STATUS_OPTIONS = [
  { key: "in_progress",     label: "In Progress" },
  { key: "group_submitted", label: "Completed"   },
  { key: "all_submitted",   label: "Final"       },
  { key: "editing",         label: "Editing"     },
];

const SCORE_COLS = [
  { key: "technical", label: "Technical /30" },
  { key: "design",    label: "Written /30"   },
  { key: "delivery",  label: "Oral /30"      },
  { key: "teamwork",  label: "Team /10"      },
  { key: "total",     label: "Total"         },
];

// Stable per-row key matching AdminPanel's rowKey.
function rowKey(r) {
  return r.jurorId
    ? r.jurorId
    : `${(r.juryName || "").trim().toLowerCase()}__${(r.juryDept || "").trim().toLowerCase()}`;
}

// Numeric filter popover content.
function NumericFilter({ value, onChange }) {
  const op = value?.op || "gte";
  const v1 = value?.val  ?? "";
  const v2 = value?.val2 ?? "";
  return (
    <>
      <select
        value={op}
        onChange={(e) => onChange({ op: e.target.value, val: v1, val2: v2 })}
      >
        <option value="gte">≥ (at least)</option>
        <option value="lte">≤ (at most)</option>
        <option value="between">Between</option>
      </select>
      {op !== "between" ? (
        <input
          autoFocus
          type="number"
          placeholder="Score…"
          value={v1}
          onChange={(e) => onChange({ op, val: e.target.value, val2: v2 })}
        />
      ) : (
        <div className="filter-between-row">
          <input
            autoFocus
            type="number"
            placeholder="Min"
            value={v1}
            onChange={(e) => onChange({ op, val: e.target.value, val2: v2 })}
          />
          <span style={{ fontSize: 11, color: "#64748b" }}>–</span>
          <input
            type="number"
            placeholder="Max"
            value={v2}
            onChange={(e) => onChange({ op, val: v1, val2: e.target.value })}
          />
        </div>
      )}
    </>
  );
}

// jurors prop: { key, name, dept }[]
export default function DetailsTab({ data, jurors }) {
  const [filterJuror,    setFilterJuror]    = useState("ALL");
  const [filterDept,     setFilterDept]     = useState("");
  const [filterGroup,    setFilterGroup]    = useState("ALL");
  const [filterStatuses, setFilterStatuses] = useState(new Set());
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [scoreFilters,   setScoreFilters]   = useState({});  // { [colKey]: { op, val, val2 } }
  const [filterComment,  setFilterComment]  = useState("");
  const [sortKey,        setSortKey]        = useState("tsMs");
  const [sortDir,        setSortDir]        = useState("desc");
  const [activeFilterCol, setActiveFilterCol] = useState(null);

  const groups = useMemo(
    () => PROJECT_LIST.map((p) => ({ id: p.id, label: `Group ${p.id}`, name: p.name }))
      .sort((a, b) => a.id - b.id),
    []
  );

  const hasAnyFilter = useMemo(() =>
    filterJuror !== "ALL" || filterDept || filterGroup !== "ALL" ||
    filterStatuses.size > 0 || dateFrom || dateTo ||
    Object.keys(scoreFilters).length > 0 || filterComment,
    [filterJuror, filterDept, filterGroup, filterStatuses, dateFrom, dateTo, scoreFilters, filterComment]
  );

  function resetFilters() {
    setFilterJuror("ALL");
    setFilterDept("");
    setFilterGroup("ALL");
    setFilterStatuses(new Set());
    setDateFrom("");
    setDateTo("");
    setScoreFilters({});
    setFilterComment("");
    setSortKey("tsMs");
    setSortDir("desc");
    setActiveFilterCol(null);
  }

  function toggleStatus(key) {
    setFilterStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setScoreFilter(col, val) {
    setScoreFilters((prev) => ({ ...prev, [col]: val }));
  }
  function clearScoreFilter(col) {
    setScoreFilters((prev) => { const n = { ...prev }; delete n[col]; return n; });
  }

  function toggleFilterCol(colId) {
    setActiveFilterCol((prev) => (prev === colId ? null : colId));
  }

  const rows = useMemo(() => {
    const fromMs = dateFrom ? new Date(dateFrom).getTime()               : 0;
    const toMs   = dateTo   ? new Date(dateTo + "T23:59:59").getTime()   : Infinity;

    let list = data.slice();

    if (filterJuror !== "ALL") {
      list = list.filter((r) => rowKey(r) === filterJuror);
    }
    if (filterGroup !== "ALL") {
      list = list.filter((r) => String(r.projectId) === filterGroup);
    }
    if (filterDept) {
      const q = filterDept.toLowerCase();
      list = list.filter((r) => (r.juryDept || "").toLowerCase().includes(q));
    }
    if (filterStatuses.size > 0) {
      list = list.filter((r) => {
        if (filterStatuses.has("editing") && r.editingFlag === "editing") return true;
        return filterStatuses.has(r.status);
      });
    }
    if (dateFrom || dateTo) {
      list = list.filter((r) => {
        const ms = r.tsMs || tsToMillis(r.timestamp);
        return ms >= fromMs && ms <= toMs;
      });
    }
    Object.entries(scoreFilters).forEach(([col, f]) => {
      if (f?.val === "" || f?.val === undefined) return;
      list = list.filter((r) => {
        const v = Number(r[col]);
        if (!Number.isFinite(v)) return false;
        if (f.op === "gte")     return v >= Number(f.val);
        if (f.op === "lte")     return v <= Number(f.val);
        if (f.op === "between") return v >= Number(f.val) && v <= Number(f.val2 ?? f.val);
        return true;
      });
    });
    if (filterComment) {
      const q = filterComment.toLowerCase();
      list = list.filter((r) => (r.comments || "").toLowerCase().includes(q));
    }

    list.sort((a, b) =>
      sortDir === "asc" ? cmp(a[sortKey], b[sortKey]) : cmp(b[sortKey], a[sortKey])
    );
    return list;
  }, [data, filterJuror, filterGroup, filterDept, filterStatuses, dateFrom, dateTo,
      scoreFilters, filterComment, sortKey, sortDir]);

  function setSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }
  const sortIcon = (key) =>
    sortKey !== key ? "↕" : sortDir === "asc" ? "↑" : "↓";

  return (
    <>
      {/* Compact toolbar: row count + clear + export */}
      <div className="detail-table-toolbar">
        <span className="filter-count">
          Showing <strong>{rows.length}</strong> row{rows.length !== 1 ? "s" : ""}
        </span>
        {hasAnyFilter && (
          <button className="filter-reset" onClick={resetFilters}>✕ Clear Filters</button>
        )}
        <button className="csv-export-btn" onClick={() => exportCSV(rows)}>
          ⬇ Export CSV
        </button>
      </div>

      {/* Close-layer: click outside popover to dismiss */}
      {activeFilterCol !== null && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50 }}
          onClick={() => setActiveFilterCol(null)}
        />
      )}

      {/* Table */}
      <div className="detail-table-wrap">
        <table className="detail-table">
          <thead>
            <tr>
              {/* Juror */}
              <th style={{ position: "relative", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span onClick={() => setSort("juryName")}>Juror {sortIcon("juryName")}</span>
                  <button
                    className={`col-filter-btn${filterJuror !== "ALL" ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("juror"); }}
                    title="Filter by juror"
                  >▼</button>
                </div>
                {activeFilterCol === "juror" && (
                  <div className="col-filter-popover" onClick={(e) => e.stopPropagation()}>
                    <select
                      autoFocus
                      value={filterJuror}
                      onChange={(e) => { setFilterJuror(e.target.value); setActiveFilterCol(null); }}
                    >
                      <option value="ALL">All jurors</option>
                      {jurors.map((j) => (
                        <option key={j.key} value={j.key}>
                          {j.name}{j.dept ? ` (${j.dept})` : ""}
                        </option>
                      ))}
                    </select>
                    {filterJuror !== "ALL" && (
                      <button className="col-filter-clear" onClick={() => { setFilterJuror("ALL"); setActiveFilterCol(null); }}>
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </th>

              {/* Department */}
              <th style={{ position: "relative", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span onClick={() => setSort("juryDept")}>Department {sortIcon("juryDept")}</span>
                  <button
                    className={`col-filter-btn${filterDept ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("dept"); }}
                    title="Filter by department"
                  >▼</button>
                </div>
                {activeFilterCol === "dept" && (
                  <div className="col-filter-popover" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      placeholder="Filter department…"
                      value={filterDept}
                      onChange={(e) => setFilterDept(e.target.value)}
                    />
                    {filterDept && (
                      <button className="col-filter-clear" onClick={() => { setFilterDept(""); setActiveFilterCol(null); }}>
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </th>

              {/* Group */}
              <th style={{ position: "relative", cursor: "pointer", whiteSpace: "nowrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span onClick={() => setSort("projectId")}>Group {sortIcon("projectId")}</span>
                  <button
                    className={`col-filter-btn${filterGroup !== "ALL" ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("group"); }}
                    title="Filter by group"
                  >▼</button>
                </div>
                {activeFilterCol === "group" && (
                  <div className="col-filter-popover" onClick={(e) => e.stopPropagation()}>
                    <select
                      autoFocus
                      value={filterGroup}
                      onChange={(e) => { setFilterGroup(e.target.value); setActiveFilterCol(null); }}
                    >
                      <option value="ALL">All groups</option>
                      {groups.map((g) => (
                        <option key={g.id} value={String(g.id)}>{g.label}</option>
                      ))}
                    </select>
                    {filterGroup !== "ALL" && (
                      <button className="col-filter-clear" onClick={() => { setFilterGroup("ALL"); setActiveFilterCol(null); }}>
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </th>

              {/* Timestamp */}
              <th style={{ position: "relative", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span onClick={() => setSort("tsMs")}>Timestamp {sortIcon("tsMs")}</span>
                  <button
                    className={`col-filter-btn${(dateFrom || dateTo) ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("timestamp"); }}
                    title="Filter by date"
                  >▼</button>
                </div>
                {activeFilterCol === "timestamp" && (
                  <div className="col-filter-popover" onClick={(e) => e.stopPropagation()}>
                    <label style={{ fontSize: 11, color: "#64748b" }}>From</label>
                    <input autoFocus type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <label style={{ fontSize: 11, color: "#64748b" }}>To</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    {(dateFrom || dateTo) && (
                      <button className="col-filter-clear" onClick={() => { setDateFrom(""); setDateTo(""); setActiveFilterCol(null); }}>
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </th>

              {/* Status */}
              <th style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Status
                  <button
                    className={`col-filter-btn${filterStatuses.size > 0 ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("status"); }}
                    title="Filter by status"
                  >▼</button>
                </div>
                {activeFilterCol === "status" && (
                  <div className="col-filter-popover" onClick={(e) => e.stopPropagation()}>
                    {STATUS_OPTIONS.map(({ key, label }) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={filterStatuses.has(key)}
                          onChange={() => toggleStatus(key)}
                          style={{ width: "auto" }}
                        />
                        {label}
                      </label>
                    ))}
                    {filterStatuses.size > 0 && (
                      <button className="col-filter-clear" onClick={() => { setFilterStatuses(new Set()); setActiveFilterCol(null); }}>
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </th>

              {/* Score columns */}
              {SCORE_COLS.map(({ key: col, label }) => (
                <th key={col} style={{ position: "relative", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span onClick={() => setSort(col)}>{label} {sortIcon(col)}</span>
                    <button
                      className={`col-filter-btn${scoreFilters[col] ? " active" : ""}`}
                      onClick={(e) => { e.stopPropagation(); toggleFilterCol(col); }}
                      title={`Filter ${label}`}
                    >▼</button>
                  </div>
                  {activeFilterCol === col && (
                    <div className="col-filter-popover" onClick={(e) => e.stopPropagation()} style={{ left: "auto", right: 0 }}>
                      <NumericFilter
                        value={scoreFilters[col]}
                        onChange={(v) => setScoreFilter(col, v)}
                      />
                      {scoreFilters[col] && (
                        <button className="col-filter-clear" onClick={() => { clearScoreFilter(col); setActiveFilterCol(null); }}>
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </th>
              ))}

              {/* Comments */}
              <th style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Comments
                  <button
                    className={`col-filter-btn${filterComment ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("comments"); }}
                    title="Filter by comments"
                  >▼</button>
                </div>
                {activeFilterCol === "comments" && (
                  <div className="col-filter-popover" onClick={(e) => e.stopPropagation()} style={{ left: "auto", right: 0 }}>
                    <input
                      autoFocus
                      placeholder="Search comments…"
                      value={filterComment}
                      onChange={(e) => setFilterComment(e.target.value)}
                    />
                    {filterComment && (
                      <button className="col-filter-clear" onClick={() => { setFilterComment(""); setActiveFilterCol(null); }}>
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
                  No matching rows.
                </td>
              </tr>
            )}
            {rows.map((row, i) => {
              const grp = PROJECT_LIST.find((p) => p.id === row.projectId);
              const isIP = row.status === "in_progress";
              return (
                <tr
                  key={`${rowKey(row)}-${row.projectId}-${i}`}
                  className={i % 2 === 1 ? "row-even" : ""}
                >
                  <td>{row.juryName}</td>
                  <td style={{ fontSize: 12, color: "#475569" }}>{row.juryDept}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div
                      title={grp?.desc ? `Group ${row.projectId} — ${grp.desc}` : `Group ${row.projectId}`}
                      style={{ cursor: "default" }}
                    >
                      <strong>Group {row.projectId}</strong>
                      {grp?.desc && (
                        <span style={{
                          display: "block", fontSize: 11, color: "#94a3b8",
                          fontWeight: 400, maxWidth: 180,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {grp.desc}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                    {formatTs(row.timestamp)}
                  </td>
                  <td><StatusBadge status={row.status} editingFlag={row.editingFlag} /></td>
                  <td style={{ color: isIP ? "#94a3b8" : undefined }}>{displayScore(row.technical)}</td>
                  <td style={{ color: isIP ? "#94a3b8" : undefined }}>{displayScore(row.design)}</td>
                  <td style={{ color: isIP ? "#94a3b8" : undefined }}>{displayScore(row.delivery)}</td>
                  <td style={{ color: isIP ? "#94a3b8" : undefined }}>{displayScore(row.teamwork)}</td>
                  <td style={{ color: isIP ? "#94a3b8" : undefined }}>
                    <strong>{displayScore(row.total)}</strong>
                  </td>
                  <td className="comment-cell">{row.comments}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

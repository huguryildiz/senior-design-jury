// src/admin/DetailsTab.jsx
// ============================================================
// Sortable details table with Excel-style column header filters.
// ============================================================

import { useState, useMemo } from "react";
import { PROJECTS } from "../config";
import { cmp, exportCSV, exportXLSX, formatTs, tsToMillis } from "./utils";
import { StatusBadge } from "./components";

const PROJECT_LIST = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);

// Show "" for null/undefined/empty/NaN.  0 is a valid score.
function displayScore(val) {
  if (val === "" || val === null || val === undefined) return "";
  if (typeof val === "string" && val.trim() === "") return "";
  const n = Number(val);
  if (!Number.isFinite(n)) return "";
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
  { key: "teamwork",  label: "Teamwork /10"  },
  { key: "total",     label: "Total"         },
];

// ── Inline SVG icons ─────────────────────────────────────────
const SortBothSVG = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M3 4.5L6 1.5L9 4.5"/><path d="M3 7.5L6 10.5L9 7.5"/>
  </svg>
);
const SortAscSVG = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M3 7.5L6 4.5L9 7.5"/>
  </svg>
);
const SortDescSVG = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M3 4.5L6 7.5L9 4.5"/>
  </svg>
);
const ClearSVG = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M2 2L10 10M10 2L2 10"/>
  </svg>
);
const DownloadSVG = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M7 2v7M4 6.5L7 9.5L10 6.5"/><path d="M2 11.5h10"/>
  </svg>
);

// Stable per-row key matching AdminPanel's rowKey.
function rowKey(r) {
  return r.jurorId
    ? r.jurorId
    : `${(r.juryName || "").trim().toLowerCase()}__${(r.juryDept || "").trim().toLowerCase()}`;
}

// jurors prop: { key, name, dept }[]
export default function DetailsTab({ data, jurors }) {
  const [filterJuror,    setFilterJuror]    = useState("ALL");
  const [filterDept,     setFilterDept]     = useState("ALL");
  const [filterGroup,    setFilterGroup]    = useState("ALL");
  const [filterStatuses, setFilterStatuses] = useState(new Set());
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [filterComment,  setFilterComment]  = useState("");
  const [sortKey,        setSortKey]        = useState("tsMs");
  const [sortDir,        setSortDir]        = useState("desc");
  const [activeFilterCol, setActiveFilterCol] = useState(null);

  const groups = useMemo(
    () => PROJECT_LIST.map((p) => ({ id: p.id, label: `Group ${p.id}`, name: p.name }))
      .sort((a, b) => a.id - b.id),
    []
  );
  const deptOptions = useMemo(() => {
    const map = new Map();
    jurors.forEach((j) => {
      const label = String(j?.dept ?? "").trim();
      if (!label) return;
      map.set(label.toLowerCase(), label);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([key, label]) => ({ key, label }));
  }, [jurors]);

  const hasAnyFilter = useMemo(() =>
    filterJuror !== "ALL" || filterDept !== "ALL" || filterGroup !== "ALL" ||
    filterStatuses.size > 0 || dateFrom || dateTo || filterComment,
    [filterJuror, filterDept, filterGroup, filterStatuses, dateFrom, dateTo, filterComment]
  );

  function resetFilters() {
    setFilterJuror("ALL");
    setFilterDept("ALL");
    setFilterGroup("ALL");
    setFilterStatuses(new Set());
    setDateFrom("");
    setDateTo("");
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

  function toggleFilterCol(colId) {
    setActiveFilterCol((prev) => (prev === colId ? null : colId));
  }

  function isMissing(val) {
    if (val === "" || val === null || val === undefined) return true;
    if (typeof val === "string" && val.trim() === "") return true;
    if (typeof val === "number") return !Number.isFinite(val);
    return false;
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
    if (filterDept !== "ALL") {
      const q = filterDept.toLowerCase();
      list = list.filter((r) => String(r.juryDept ?? "").trim().toLowerCase() === q);
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
    if (filterComment) {
      const q = filterComment.toLowerCase();
      list = list.filter((r) => (r.comments || "").toLowerCase().includes(q));
    }

    // Missing values always sink to bottom regardless of sort direction.
    list.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const aMiss = isMissing(av);
      const bMiss = isMissing(bv);
      if (aMiss && bMiss) return 0;
      if (aMiss) return 1;
      if (bMiss) return -1;
      return sortDir === "asc" ? cmp(av, bv) : cmp(bv, av);
    });
    return list;
  }, [data, filterJuror, filterGroup, filterDept, filterStatuses, dateFrom, dateTo,
      filterComment, sortKey, sortDir]);

  function setSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }
  const sortIcon = (key) =>
    sortKey !== key ? <SortBothSVG /> : sortDir === "asc" ? <SortAscSVG /> : <SortDescSVG />;

  return (
    <>
      {/* Compact toolbar: row count + clear + export */}
      <div className="detail-table-toolbar">
        <span className="filter-count">
          Showing <strong>{rows.length}</strong> row{rows.length !== 1 ? "s" : ""}
        </span>
        {hasAnyFilter && (
          <button className="filter-reset" onClick={resetFilters}>
            <ClearSVG /> Clear Filters
          </button>
        )}
        <button className="xlsx-export-btn" onClick={() => exportXLSX(rows)}>
          <DownloadSVG />
          <span className="export-label-long">Export Excel</span>
          <span className="export-label-short">Excel</span>
        </button>
        <button className="csv-export-btn" onClick={() => exportCSV(rows)}>
          <DownloadSVG />
          <span className="export-label-long">Export CSV</span>
          <span className="export-label-short">CSV</span>
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
              {/* Juror — sort label + filter hotspot */}
              <th style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <span className="col-sort-label" onClick={() => setSort("juryName")}>
                    Juror <span className="sort-icon">{sortIcon("juryName")}</span>
                  </span>
                  <div
                    className={`col-filter-hotspot${filterJuror !== "ALL" ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("juror"); }}
                    title="Filter by juror"
                  />
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
              <th style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <span className="col-sort-label" onClick={() => setSort("juryDept")}>
                    Department <span className="sort-icon">{sortIcon("juryDept")}</span>
                  </span>
                  <div
                    className={`col-filter-hotspot${filterDept ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("dept"); }}
                    title="Filter by department"
                  />
                </div>
                {activeFilterCol === "dept" && (
                  <div className="col-filter-popover" onClick={(e) => e.stopPropagation()}>
                    <select
                      autoFocus
                      value={filterDept}
                      onChange={(e) => { setFilterDept(e.target.value); setActiveFilterCol(null); }}
                    >
                      <option value="ALL">All departments</option>
                      {deptOptions.map((d) => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </select>
                    {filterDept !== "ALL" && (
                      <button className="col-filter-clear" onClick={() => { setFilterDept("ALL"); setActiveFilterCol(null); }}>
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </th>

              {/* Group */}
              <th style={{ position: "relative", whiteSpace: "nowrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <span className="col-sort-label" onClick={() => setSort("projectId")}>
                    Group <span className="sort-icon">{sortIcon("projectId")}</span>
                  </span>
                  <div
                    className={`col-filter-hotspot${filterGroup !== "ALL" ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("group"); }}
                    title="Filter by group"
                  />
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
              <th style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <span className="col-sort-label" onClick={() => setSort("tsMs")}>
                    Timestamp <span className="sort-icon">{sortIcon("tsMs")}</span>
                  </span>
                  <div
                    className={`col-filter-hotspot${(dateFrom || dateTo) ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("timestamp"); }}
                    title="Filter by date"
                  />
                </div>
                {activeFilterCol === "timestamp" && (
                  <div className="col-filter-popover" onClick={(e) => e.stopPropagation()}>
                    <label style={{ fontSize: 11 }}>From</label>
                    <input autoFocus type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <label style={{ fontSize: 11 }}>To</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    {(dateFrom || dateTo) && (
                      <button className="col-filter-clear" onClick={() => { setDateFrom(""); setDateTo(""); setActiveFilterCol(null); }}>
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </th>

              {/* Status — filter only (no sort) */}
              <th style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <span>Status</span>
                  <div
                    className={`col-filter-hotspot${filterStatuses.size > 0 ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("status"); }}
                    title="Filter by status"
                  />
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

              {/* Score columns — sort only, no filter */}
              {SCORE_COLS.map(({ key: col, label }) => (
                <th key={col} style={{ cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => setSort(col)}>
                  <span className="col-sort-label">
                    {label} <span className="sort-icon">{sortIcon(col)}</span>
                  </span>
                </th>
              ))}

              {/* Comments — filter only (no sort) */}
              <th style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <span>Comments</span>
                  <div
                    className={`col-filter-hotspot${filterComment ? " active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggleFilterCol("comments"); }}
                    title="Filter by comments"
                  />
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
                  <td className="cell-juror">{row.juryName}</td>
                  <td className="cell-dept" style={{ fontSize: 12, color: "#475569" }}>{row.juryDept}</td>
                  <td className="cell-group" style={{ whiteSpace: "nowrap" }}>
                    <div
                      className="cell-group-wrap"
                      title={grp?.desc ? `Group ${row.projectId} — ${grp.desc}` : `Group ${row.projectId}`}
                      style={{ cursor: "default" }}
                    >
                      <strong className="cell-group-title">Group {row.projectId}</strong>
                      {grp?.desc && (
                        <span className="cell-group-desc" style={{
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
                  <td className="comment-cell cell-comment">{row.comments}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

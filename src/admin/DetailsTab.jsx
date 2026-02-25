// src/admin/DetailsTab.jsx
// ============================================================
// Sortable, filterable details table with CSV export.
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

// Display "—" for genuinely empty/missing scores.
// Note: a score of 0 entered by the juror is also shown as "—" here
// because the sheet stores "" for untouched fields and 0 only arrives
// when the juror explicitly typed 0 — both are treated as "no data" in
// the details view to avoid confusion with actually-scored rows.
function displayScore(val) {
  if (val === "" || val === null || val === undefined) return "—";
  const n = Number(val);
  if (!Number.isFinite(n) || n === 0) return "—";
  return n;
}

const STATUS_PILLS = [
  { key: "in_progress",     label: "In Progress" },
  { key: "group_submitted", label: "Completed"   },
  { key: "all_submitted",   label: "Final"       },
  { key: "editing",         label: "Editing"     },
];

export default function DetailsTab({ data, jurors }) {
  const [filterJuror,    setFilterJuror]    = useState("ALL");
  const [filterGroup,    setFilterGroup]    = useState("ALL");
  const [searchText,     setSearchText]     = useState("");
  const [sortKey,        setSortKey]        = useState("tsMs");
  const [sortDir,        setSortDir]        = useState("desc");
  const [filterStatuses, setFilterStatuses] = useState(new Set());
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");

  const groups = useMemo(
    () => PROJECT_LIST.map((p) => ({ id: p.id, label: `Group ${p.id}`, name: p.name }))
      .sort((a, b) => a.id - b.id),
    []
  );

  function toggleStatus(key) {
    setFilterStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const rows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(dateFrom).getTime()                   : 0;
    const toMs   = dateTo   ? new Date(dateTo + "T23:59:59").getTime()       : Infinity;

    let list = data.slice();
    if (filterJuror !== "ALL") list = list.filter((r) => r.juryName  === filterJuror);
    if (filterGroup !== "ALL") list = list.filter((r) => String(r.projectId) === filterGroup);

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

    if (q) {
      list = list.filter((r) =>
        [r.juryName, r.juryDept, r.timestamp, r.projectName,
         String(r.design), String(r.technical), String(r.delivery),
         String(r.teamwork), String(r.total), r.comments]
          .join(" ").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) =>
      sortDir === "asc" ? cmp(a[sortKey], b[sortKey]) : cmp(b[sortKey], a[sortKey])
    );
    return list;
  }, [data, filterJuror, filterGroup, searchText, sortKey, sortDir, filterStatuses, dateFrom, dateTo]);

  function setSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }
  const sortIcon = (key) =>
    sortKey !== key ? "↕" : sortDir === "asc" ? "↑" : "↓";

  function resetFilters() {
    setFilterJuror("ALL");
    setFilterGroup("ALL");
    setSearchText("");
    setSortKey("tsMs");
    setSortDir("desc");
    setFilterStatuses(new Set());
    setDateFrom("");
    setDateTo("");
  }

  return (
    <>
      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-item">
          <span>Juror</span>
          <select value={filterJuror} onChange={(e) => setFilterJuror(e.target.value)}>
            <option value="ALL">All</option>
            {jurors.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>

        <div className="filter-item">
          <span>Group</span>
          <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
            <option value="ALL">All</option>
            {groups.map((g) => <option key={g.id} value={String(g.id)}>{g.label}</option>)}
          </select>
        </div>

        <div className="filter-item filter-search">
          <span>Search</span>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search juror, group, comments…"
          />
        </div>

        {/* Date range */}
        <div className="filter-item">
          <span>From</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="filter-item">
          <span>To</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>

        <button className="filter-reset" onClick={resetFilters}>Reset</button>
        <span className="filter-count">
          Showing <strong>{rows.length}</strong> row{rows.length !== 1 ? "s" : ""}
        </span>
        <button className="csv-export-btn" onClick={() => exportCSV(rows)}>
          ⬇ Export CSV
        </button>
      </div>

      {/* Status pills */}
      <div className="status-pill-bar">
        <span className="status-pill-label">Status:</span>
        {STATUS_PILLS.map(({ key, label }) => (
          <button
            key={key}
            className={`status-pill${filterStatuses.has(key) ? " active" : ""}`}
            onClick={() => toggleStatus(key)}
          >
            {label}
          </button>
        ))}
        {filterStatuses.size > 0 && (
          <button
            className="status-pill-clear"
            onClick={() => setFilterStatuses(new Set())}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="detail-table-wrap">
        <table className="detail-table">
          <thead>
            <tr>
              <th onClick={() => setSort("juryName")}    style={{ cursor: "pointer" }}>Juror {sortIcon("juryName")}</th>
              <th onClick={() => setSort("juryDept")}    style={{ cursor: "pointer" }}>Department {sortIcon("juryDept")}</th>
              <th onClick={() => setSort("projectId")}   style={{ cursor: "pointer", whiteSpace: "nowrap" }}>Group {sortIcon("projectId")}</th>
              <th onClick={() => setSort("tsMs")}        style={{ cursor: "pointer" }}>Timestamp {sortIcon("tsMs")}</th>
              <th>Status</th>
              <th onClick={() => setSort("technical")}   style={{ cursor: "pointer" }}>Technical /30 {sortIcon("technical")}</th>
              <th onClick={() => setSort("design")}      style={{ cursor: "pointer" }}>Written /30 {sortIcon("design")}</th>
              <th onClick={() => setSort("delivery")}    style={{ cursor: "pointer" }}>Oral /30 {sortIcon("delivery")}</th>
              <th onClick={() => setSort("teamwork")}    style={{ cursor: "pointer" }}>Team /10 {sortIcon("teamwork")}</th>
              <th onClick={() => setSort("total")}       style={{ cursor: "pointer" }}>Total {sortIcon("total")}</th>
              <th>Comments</th>
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
                  key={`${row.juryName}-${row.projectId}-${i}`}
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
                  {/* Pass editingFlag so the badge shows "✏️ Editing" when applicable */}
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

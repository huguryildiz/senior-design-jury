// src/admin/DetailsTab.jsx
// ── Sortable details table with CSV export ───────────────────

import { useState, useMemo } from "react";
import { PROJECTS } from "../config";
import { cmp, exportCSV, jurorBg, jurorDot, formatTs } from "./utils";
import { StatusBadge } from "./components";

const PROJECT_LIST = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);

// Show "—" for empty/missing scores instead of 0
function displayScore(val) {
  if (val === "" || val === null || val === undefined) return "—";
  const n = Number(val);
  return Number.isFinite(n) ? n : "—";
}

export default function DetailsTab({ data, jurors, jurorColorMap }) {
  const [detailJuror,  setDetailJuror]  = useState("ALL");
  const [detailGroup,  setDetailGroup]  = useState("ALL");
  const [detailSearch, setDetailSearch] = useState("");
  const [sortKey,      setSortKey]      = useState("tsMs");
  const [sortDir,      setSortDir]      = useState("desc");

  const groups = useMemo(() =>
    PROJECT_LIST.map((p) => ({ id: p.id, label: `Group ${p.id}`, name: p.name }))
      .sort((a, b) => a.id - b.id),
  []);

  const detailRows = useMemo(() => {
    const q = detailSearch.trim().toLowerCase();
    let rows = data.slice();
    if (detailJuror !== "ALL") rows = rows.filter((r) => r.juryName    === detailJuror);
    if (detailGroup !== "ALL") rows = rows.filter((r) => String(r.projectId) === detailGroup);
    if (q) rows = rows.filter((r) =>
      [r.juryName, r.juryDept, r.timestamp, r.projectName,
       String(r.design), String(r.technical), String(r.delivery),
       String(r.teamwork), String(r.total), r.comments]
        .join(" ").toLowerCase().includes(q)
    );
    rows.sort((a, b) => sortDir === "asc" ? cmp(a[sortKey], b[sortKey]) : cmp(b[sortKey], a[sortKey]));
    return rows;
  }, [data, detailJuror, detailGroup, detailSearch, sortKey, sortDir]);

  const setSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  const si = (key) => sortKey !== key ? "↕" : sortDir === "asc" ? "↑" : "↓";

  return (
    <>
      <div className="filter-bar">
        <div className="filter-item">
          <span>Juror</span>
          <select value={detailJuror} onChange={(e) => setDetailJuror(e.target.value)}>
            <option value="ALL">All</option>
            {jurors.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div className="filter-item">
          <span>Group</span>
          <select value={detailGroup} onChange={(e) => setDetailGroup(e.target.value)}>
            <option value="ALL">All</option>
            {groups.map((g) => <option key={g.id} value={String(g.id)}>{g.label} — {g.name}</option>)}
          </select>
        </div>
        <div className="filter-item filter-search">
          <span>Search</span>
          <input value={detailSearch} onChange={(e) => setDetailSearch(e.target.value)} placeholder="Search juror, group, comments…" />
        </div>
        <button className="filter-reset" onClick={() => { setDetailJuror("ALL"); setDetailGroup("ALL"); setDetailSearch(""); setSortKey("tsMs"); setSortDir("desc"); }}>Reset</button>
        <span className="filter-count">Showing <strong>{detailRows.length}</strong> row{detailRows.length !== 1 ? "s" : ""}</span>
        <button className="csv-export-btn" onClick={() => exportCSV(detailRows)}>⬇ Export CSV</button>
      </div>

      <div className="detail-table-wrap">
        <table className="detail-table">
          <thead>
            <tr>
              <th onClick={() => setSort("juryName")}    style={{ cursor: "pointer" }}>Juror {si("juryName")}</th>
              <th onClick={() => setSort("juryDept")}    style={{ cursor: "pointer" }}>Department {si("juryDept")}</th>
              <th onClick={() => setSort("projectId")}   style={{ cursor: "pointer", whiteSpace: "nowrap" }}>Group {si("projectId")}</th>
              <th onClick={() => setSort("tsMs")}        style={{ cursor: "pointer" }}>Timestamp {si("tsMs")}</th>
              <th>Status</th>
              <th onClick={() => setSort("design")}      style={{ cursor: "pointer" }}>Design /20 {si("design")}</th>
              <th onClick={() => setSort("technical")}   style={{ cursor: "pointer" }}>Tech /40 {si("technical")}</th>
              <th onClick={() => setSort("delivery")}    style={{ cursor: "pointer" }}>Delivery /30 {si("delivery")}</th>
              <th onClick={() => setSort("teamwork")}    style={{ cursor: "pointer" }}>Team /10 {si("teamwork")}</th>
              <th onClick={() => setSort("total")}       style={{ cursor: "pointer" }}>Total {si("total")}</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            {detailRows.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: "center", padding: 32, color: "#64748b" }}>No matching rows.</td></tr>
            )}
            {detailRows.map((row, i) => {
              const isNewBlock = i === 0 || detailRows[i-1].juryName !== row.juryName;
              const bg  = jurorColorMap.get(row.juryName)?.bg  || "transparent";
              const dot = jurorColorMap.get(row.juryName)?.dot || "#64748b";
              const grp = PROJECT_LIST.find((p) => p.id === row.projectId);
              const isIP = row.status === "in_progress";
              return (
                <tr key={`${row.juryName}-${row.projectId}-${i}`}
                  style={{ backgroundColor: bg, borderTop: isNewBlock ? "2px solid #e5e7eb" : undefined }}>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: dot, border: "2px solid #cbd5e1", flexShrink: 0 }} />
                      {row.juryName}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "#475569" }}>{row.juryDept}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div
                      title={grp?.desc ? `Group ${row.projectId} — ${grp.desc}` : `Group ${row.projectId}`}
                      style={{ cursor: "default" }}
                    >
                      <strong>Group {row.projectId}</strong>
                      {grp?.desc && (
                        <span style={{
                          display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 400,
                          maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                        }}>
                          {grp.desc}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{formatTs(row.timestamp)}</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td style={{ color: isIP ? "#94a3b8" : undefined }}>{isIP ? "—" : displayScore(row.design)}</td>
                  <td style={{ color: isIP ? "#94a3b8" : undefined }}>{isIP ? "—" : displayScore(row.technical)}</td>
                  <td style={{ color: isIP ? "#94a3b8" : undefined }}>{isIP ? "—" : displayScore(row.delivery)}</td>
                  <td style={{ color: isIP ? "#94a3b8" : undefined }}>{isIP ? "—" : displayScore(row.teamwork)}</td>
                  <td style={{ color: isIP ? "#94a3b8" : undefined }}><strong>{isIP ? "—" : displayScore(row.total)}</strong></td>
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

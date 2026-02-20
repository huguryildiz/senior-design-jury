import Papa from "papaparse";
import { useEffect, useMemo, useState } from "react";

const PROJECTS = ["Group 1", "Group 2", "Group 3", "Group 4", "Group 5", "Group 6"];
const CRITERIA = [
  { id: "design", label: "Design", max: 20 },
  { id: "technical", label: "Technical", max: 40 },
  { id: "delivery", label: "Delivery", max: 30 },
  { id: "teamwork", label: "Teamwork", max: 10 },
];

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1FjIw9TD8sqZl-WWDS0PZ5WgL6DXNVzqlpBsswJDfDb4/gviz/tq?tqx=out:csv&sheet=Evaluations";

function toNum(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim().replace(/^"+|"+$/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}


function cmp(a, b) {
  // numeric first if possible
  const an = Number(a);
  const bn = Number(b);
  const aNum = Number.isFinite(an);
  const bNum = Number.isFinite(bn);
  if (aNum && bNum) return an - bn;

  const as = (a ?? "").toString().toLowerCase();
  const bs = (b ?? "").toString().toLowerCase();
  if (as < bs) return -1;
  if (as > bs) return 1;
  return 0;
}

function hashStringToInt(str) {
  let h = 2166136261; // FNV-1a style
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function jurorBgColor(name) {
  const seed = hashStringToInt((name || "unknown").toString());
  const hue = seed % 360; // 0..359
  const sat = 55; // pastel
  const light = 95; // very light background for readability
  return hslToHex(hue, sat, light);
}

function jurorDotColor(name) {
  const seed = hashStringToInt((name || "unknown").toString());
  const hue = seed % 360;
  const sat = 65;
  const light = 55; // darker than row background so the dot is visible
  return hslToHex(hue, sat, light);
}

export default function AdminPanel({ onBack }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");

  // Details: filters + sorting
  const [detailJuror, setDetailJuror] = useState("ALL");
  const [detailGroup, setDetailGroup] = useState("ALL");
  const [detailSearch, setDetailSearch] = useState("");
  const [sortKey, setSortKey] = useState("timestamp"); // default sort
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const text = await res.text();
      if (text.toLowerCase().includes("<html")) {
        throw new Error(
          "Received HTML instead of CSV. Make the sheet public: Anyone with the link (Viewer)."
        );
      }

      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      });

      if (result.errors?.length) {
        console.warn("CSV parse warnings:", result.errors);
      }

      const parsed = (result.data || []).map((row) => ({
        juryName: row["Your Name"] || row["Juror Name"] || "",
        juryDept: row["Department / In"] || "",
        timestamp: row["Timestamp"] || "",
        projectId: toNum(row["Group No"]),
        projectName: row["Group Name"] || "",
        design: toNum(row["Design (20)"]),
        technical: toNum(row["Technical (40)"]),
        delivery: toNum(row["Delivery (30)"]),
        teamwork: toNum(row["Teamwork (10)"]),
        total: toNum(row["Total (100)"]),
        comments: row["Comments"] || "",
      }));

      // remove empty rows
      const cleaned = parsed.filter((r) => r.juryName || r.projectName || r.total > 0);
      setData(cleaned);
    } catch (e) {
      setError("Could not load data: " + e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Unique jurors + groups for dropdowns
  const jurors = useMemo(
    () => [...new Set(data.map((d) => d.juryName).filter(Boolean))].sort((a, b) => cmp(a, b)),
    [data]
  );

  const groups = useMemo(() => {
    // Use actual projectName values from data if present; fallback to PROJECTS
    const fromData = [...new Set(data.map((d) => d.projectName).filter(Boolean))];
    const base = fromData.length ? fromData : PROJECTS;
    return base.slice().sort((a, b) => cmp(a, b));
  }, [data]);

  // Juror row colors (deterministic + scalable)
  // Each juror gets a stable pastel color derived from their name.
  const jurorColorMap = useMemo(() => {
    const m = new Map();
    jurors.forEach((name) =>
      m.set(name, { bg: jurorBgColor(name), dot: jurorDotColor(name) })
    );
    return m;
  }, [jurors]);

  // Project stats for summary
  const projectStats = useMemo(() => {
    return PROJECTS.map((name, idx) => {
      const rows = data.filter((d) => d.projectId === idx + 1);
      if (rows.length === 0) return { name, count: 0, avg: {}, totalAvg: 0 };

      const avg = {};
      CRITERIA.forEach((c) => {
        avg[c.id] = rows.reduce((s, r) => s + (r[c.id] || 0), 0) / rows.length;
      });
      const totalAvg = rows.reduce((s, r) => s + (r.total || 0), 0) / rows.length;

      return { name, count: rows.length, avg, totalAvg };
    });
  }, [data]);

  const ranked = useMemo(() => [...projectStats].sort((a, b) => b.totalAvg - a.totalAvg), [projectStats]);

  // Rank badge theme: gold, silver, bronze, then slate/gray for 4+
  const rankBadgeTheme = (rankIdx) => {
    // rankIdx: 0-based
    if (rankIdx === 0) return { bg: "#F59E0B", fg: "#0B1220", ring: "#FCD34D" }; // gold
    if (rankIdx === 1) return { bg: "#94A3B8", fg: "#0B1220", ring: "#CBD5E1" }; // silver
    if (rankIdx === 2) return { bg: "#B45309", fg: "#FFF7ED", ring: "#FDBA74" }; // bronze

    // 4+ all slate grey (neutral, elegant)
    return {
      bg: "#475569",      // slate-600
      fg: "#F1F5F9",      // very light text
      ring: "#94A3B8",    // soft slate ring
    };
  };

  // Details filtered + sorted data
  const detailRows = useMemo(() => {
    const q = detailSearch.trim().toLowerCase();

    let rows = data.slice();

    if (detailJuror !== "ALL") rows = rows.filter((r) => r.juryName === detailJuror);
    if (detailGroup !== "ALL") rows = rows.filter((r) => r.projectName === detailGroup);

    if (q) {
      rows = rows.filter((r) => {
        const hay = [
          r.juryName,
          r.juryDept,
          r.timestamp,
          r.projectName,
          String(r.projectId),
          String(r.design),
          String(r.technical),
          String(r.delivery),
          String(r.teamwork),
          String(r.total),
          r.comments,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const c = cmp(av, bv);
      return sortDir === "asc" ? c : -c;
    });

    return rows;
  }, [data, detailJuror, detailGroup, detailSearch, sortKey, sortDir]);

  const setSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortIcon = (key) => {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };


  const rankBadgeContent = (rankIdx) => {
    if (rankIdx === 0) return "🥇";
    if (rankIdx === 1) return "🥈";
    if (rankIdx === 2) return "🥉";
    return String(rankIdx + 1);
  };

  return (
    <div className="admin-screen">
      <div className="form-header">
        <button className="back-btn" onClick={onBack}>←</button>

        <div>
          <h2>Results Panel</h2>
          <p>
            {jurors.length} juror{jurors.length !== 1 ? "s" : ""} · {data.length} evaluation{data.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
      </div>

      <div className="tab-bar">
        {["summary", "detail", "jurors"].map((t) => (
          <button
            key={t}
            className={`tab ${activeTab === t ? "active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t === "summary" ? "📊 Summary" : t === "detail" ? "📋 Details" : "👤 Jurors"}
          </button>
        ))}
      </div>

      {loading && <div className="loading">Loading data...</div>}
      {error && <div className="error-msg">{error}</div>}

      {/* SUMMARY */}
      {!loading && !error && activeTab === "summary" && (
        <div className="admin-body">
          {data.length === 0 && <div className="empty-msg">No evaluation data yet.</div>}

          <div className="rank-list">
            {ranked.map((p, i) => (
              <div
                key={p.name}
                className="rank-card"
                style={
                  i < 3
                    ? {
                        background: "#ECFDF5",
                        boxShadow:
                          "0 0 0 1px #BBF7D0, 0 10px 40px rgba(34,197,94,0.35), 0 0 60px rgba(34,197,94,0.25)",
                        border: "1px solid #86EFAC",
                        transition: "all 0.3s ease",
                      }
                    : undefined
                }
              >
                <div
                  className="rank-num"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    fontSize: i < 3 ? 22 : 18,
                    fontWeight: 800,
                    background: rankBadgeTheme(i).bg,
                    color: rankBadgeTheme(i).fg,
                    boxShadow:
                      i < 3
                        ? "0 0 0 6px rgba(34,197,94,0.35), 0 0 30px rgba(34,197,94,0.6), 0 0 60px rgba(34,197,94,0.35)"
                        : "0 6px 18px rgba(15, 23, 42, 0.12)",
                    border: `3px solid ${rankBadgeTheme(i).ring}`,
                  }}
                  title={i < 3 ? "Top 3" : `Rank ${i + 1}`}
                >
                  {rankBadgeContent(i)}
                </div>

                <div className="rank-info">
                  <div className="rank-name">
                    {i < 3 && (
                      <span style={{ marginRight: 8, fontSize: 14, opacity: 0.9 }}>
                        {rankBadgeContent(i)}
                      </span>
                    )}
                    {p.name}{" "}
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
                      ({p.count} evaluation{p.count !== 1 ? "s" : ""})
                    </span>
                  </div>

                  <div className="rank-bars">
                    {CRITERIA.map((c) => (
                      <div key={c.id} className="mini-bar-row">
                        <span className="mini-label">{c.label}</span>
                        <div className="mini-bar-track">
                          <div
                            className="mini-bar-fill"
                            style={{ width: `${((p.avg[c.id] || 0) / c.max) * 100}%` }}
                          />
                        </div>
                        <span className="mini-val">{(p.avg[c.id] || 0).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rank-total">
                  <span>{p.totalAvg.toFixed(1)}</span>
                  <small>avg.</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAILS */}
      {!loading && !error && activeTab === "detail" && (
        <div className="admin-body">
          {/* Filters */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 12,
              padding: "10px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#475569" }}>Juror</span>
              <select
                value={detailJuror}
                onChange={(e) => setDetailJuror(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
              >
                <option value="ALL">All</option>
                {jurors.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#475569" }}>Group</span>
              <select
                value={detailGroup}
                onChange={(e) => setDetailGroup(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
              >
                <option value="ALL">All</option>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 220 }}>
              <span style={{ fontSize: 13, color: "#475569" }}>Search</span>
              <input
                value={detailSearch}
                onChange={(e) => setDetailSearch(e.target.value)}
                placeholder="Type to search (juror, group, comments...)"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                }}
              />
            </div>

            <button
              onClick={() => {
                setDetailJuror("ALL");
                setDetailGroup("ALL");
                setDetailSearch("");
                setSortKey("timestamp");
                setSortDir("desc");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                cursor: "pointer",
              }}
            >
              Reset
            </button>

            <div style={{ marginLeft: "auto", fontSize: 13, color: "#64748b" }}>
              Showing <strong>{detailRows.length}</strong> row{detailRows.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="detail-table-wrap">
            <table className="detail-table">
              <thead>
                <tr>
                  <th style={{ cursor: "pointer" }} onClick={() => setSort("juryName")}>
                    Juror {sortIcon("juryName")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => setSort("projectName")}>
                    Group {sortIcon("projectName")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => setSort("design")}>
                    Design /20 {sortIcon("design")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => setSort("technical")}>
                    Technical /40 {sortIcon("technical")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => setSort("delivery")}>
                    Delivery /30 {sortIcon("delivery")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => setSort("teamwork")}>
                    Teamwork /10 {sortIcon("teamwork")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => setSort("total")}>
                    Total {sortIcon("total")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => setSort("comments")}>
                    Comments {sortIcon("comments")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {detailRows.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                      No matching rows.
                    </td>
                  </tr>
                )}

                {detailRows.map((row, i) => {
                  const prevJuror = i > 0 ? detailRows[i - 1].juryName : null;
                  const isNewJurorBlock = row.juryName !== prevJuror;

                  return (
                    <tr
                      key={`${row.juryName}-${row.projectId}-${row.timestamp}-${i}`}
                      style={{
                        backgroundColor: jurorColorMap.get(row.juryName)?.bg || "transparent",
                        borderTop: isNewJurorBlock ? "2px solid #e5e7eb" : undefined,
                      }}
                    >
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 999,
                              background: jurorColorMap.get(row.juryName)?.dot || "#64748b",
                              border: "2px solid #cbd5e1",
                            }}
                          />
                          {row.juryName}
                        </span>
                      </td>
                      <td><strong>{row.projectName}</strong></td>
                      <td>{row.design}</td>
                      <td>{row.technical}</td>
                      <td>{row.delivery}</td>
                      <td>{row.teamwork}</td>
                      <td><strong>{row.total}</strong></td>
                      <td className="comment-cell">{row.comments}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JURORS */}
      {!loading && !error && activeTab === "jurors" && (
        <div className="admin-body">
          {jurors.length === 0 && <div className="empty-msg">No juror submissions yet.</div>}

          {jurors.map((jury) => {
            const juryData = data.filter((d) => d.juryName === jury);
            return (
              <div key={jury} className="juror-card">
                <div className="juror-name">👤 {jury}</div>
                <div className="juror-dept">{juryData[0]?.juryDept}</div>

                <div className="juror-projects">
                  {juryData
                    .slice()
                    .sort((a, b) => a.projectId - b.projectId)
                    .map((d) => (
                      <div key={`${jury}-${d.projectId}-${d.timestamp}`} className="juror-row">
                        <span>{d.projectName}</span>
                        <span className="juror-score">{d.total} / 100</span>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
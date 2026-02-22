// src/AdminPanel.jsx
// ============================================================
// Admin results dashboard.
// Charts are imported from Charts.jsx (separate file).
// Auto-refresh every 30 seconds.
//
// Tabs (in order): Summary → Dashboard → Details → Jurors → Matrix
//
// Status values from Evaluations sheet:
//   "in_progress"      – juror started, group not scored yet
//   "group_submitted"  – group fully scored, not final-submitted
//   "all_submitted"    – final submit done
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "./config";
import {
  GroupBarChart, ClusteredBarChart, RadarChart,
  JurorStrictnessChart, ScoreDotPlot,
} from "./Charts";

// ── Normalize config ──────────────────────────────────────────
const PROJECT_LIST = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);
const CRITERIA_LIST = CRITERIA.map((c) => ({ id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max }));
const TOTAL_GROUPS  = PROJECT_LIST.length;
const SCRIPT_URL    = APP_CONFIG?.scriptUrl;
const AUTO_REFRESH  = 30 * 1000; // 30 seconds

// ── Utilities ─────────────────────────────────────────────────
function toNum(v) {
  const n = Number(String(v ?? "").trim().replace(/^"+|"+$/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function tsToMillis(ts) {
  if (!ts) return 0;
  const s = String(ts).trim().replace(/\s*,\s*/g, ", ");
  const native = Date.parse(s);
  if (Number.isFinite(native)) return native;
  const eu = s.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4}),?\s*([0-2]?\d):([0-5]\d)(?::([0-5]\d))?$/);
  if (eu) return new Date(+eu[3], +eu[2]-1, +eu[1], +eu[4], +eu[5], +(eu[6]||0)).getTime() || 0;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
  if (!us) return 0;
  let h = +(us[4]||0); const ap = (us[7]||"").toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return new Date(+us[3], +us[1]-1, +us[2], h, +(us[5]||0), +(us[6]||0)).getTime() || 0;
}

function formatTs(ts) {
  if (!ts) return "—";
  const ms = tsToMillis(ts);
  if (!ms) return String(ts);
  const d = new Date(ms), pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function cmp(a, b) {
  const an = Number(a), bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return String(a??"").toLowerCase() < String(b??"").toLowerCase() ? -1 : 1;
}

// Deterministic pastel bg + dot color from a name string
function hashInt(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function hsl2hex(h, s, l) {
  s/=100; l/=100;
  const k=(n)=>(n+h/30)%12, a=s*Math.min(l,1-l);
  const f=(n)=>Math.round(255*(l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1))))).toString(16).padStart(2,"0");
  return `#${f(0)}${f(8)}${f(4)}`;
}
const jurorBg  = (n) => hsl2hex(hashInt(n||"?") % 360, 55, 95);
const jurorDot = (n) => hsl2hex(hashInt(n||"?") % 360, 65, 55);

// CSV export — UTF-8 BOM fixes Turkish characters in Excel
function exportCSV(rows) {
  const hdrs = ["Juror","Department","Group","Design/20","Technical/40","Delivery/30","Teamwork/10","Total/100","Timestamp","Comments"];
  const esc  = (v) => { const s=String(v??""); return (s.includes(",")||s.includes('"')||s.includes("\n")) ? `"${s.replace(/"/g,'""')}"` : s; };
  const lines = [hdrs.map(esc).join(","), ...rows.map((r) =>
    [r.juryName,r.juryDept,r.projectName,r.design,r.technical,r.delivery,r.teamwork,r.total,r.timestamp,r.comments].map(esc).join(",")
  )];
  const blob = new Blob(["\uFEFF"+lines.join("\n")], {type:"text/csv;charset=utf-8;"});
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), {href:url, download:`jury_results_${new Date().toISOString().slice(0,10)}.csv`}).click();
  URL.revokeObjectURL(url);
}

// ── SVG Home icon ─────────────────────────────────────────────
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

// ── Status badge ──────────────────────────────────────────────
// group_submitted = group scores saved → show green "Submitted"
// all_submitted   = all groups done    → also green "Submitted"
// in_progress     = started but not scored yet → yellow
function StatusBadge({ status }) {
  if (status === "all_submitted")   return <span className="status-badge submitted">✓ Submitted</span>;
  if (status === "group_submitted") return <span className="status-badge submitted">✓ Submitted</span>;
  if (status === "in_progress")     return <span className="status-badge in-progress">● In Progress</span>;
  return null;
}

// ── Matrix tab ────────────────────────────────────────────────
// Color logic: green = all_submitted, blue = group_submitted,
//              yellow = in_progress, grey = not started
function MatrixTab({ data, jurors, groups, jurorDeptMap }) {
  const lookup = {};
  data.forEach((r) => {
    if (!lookup[r.juryName]) lookup[r.juryName] = {};
    lookup[r.juryName][r.projectId] = { total: r.total, status: r.status };
  });
  if (!jurors.length) return <div className="empty-msg">No data yet.</div>;

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

  return (
    <div className="matrix-wrap">
      <p className="matrix-subtitle">
        <span className="matrix-legend-item"><span className="matrix-legend-dot submitted-dot"/>Submitted</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot progress-dot"/>In Progress</span>
        <span className="matrix-legend-item"><span className="matrix-legend-dot empty-dot"/>Not Started</span>
      </p>
      <div className="matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="matrix-corner">Juror / Group</th>
              {groups.map((g) => (
                <th key={g.id}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, lineHeight: 1.15 }}>
                    <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{g.label}</span>
                    {g.desc && (
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
                        {g.desc}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th>Done</th>
            </tr>
          </thead>
          <tbody>
            {jurors.map((juror) => {
              const dept      = jurorDeptMap.get(juror) || "";
              const submitted = groups.filter((g) => lookup[juror]?.[g.id]?.status === "all_submitted").length;
              return (
                <tr key={juror}>
                  <td className="matrix-juror">
                    {juror}
                    {dept && <span className="matrix-juror-dept"> ({dept})</span>}
                  </td>
                  {groups.map((g) => {
                    const entry = lookup[juror]?.[g.id] ?? null;
                    return (
                      <td key={g.id} style={cellStyle(entry)}>
                        {cellText(entry)}
                      </td>
                    );
                  })}
                  <td className="matrix-progress-cell">
                    <div className="matrix-progress-bar-wrap">
                      <div className="matrix-progress-bar" style={{ width: `${(submitted/TOTAL_GROUPS)*100}%` }} />
                    </div>
                    <span className="matrix-progress-label">{submitted}/{TOTAL_GROUPS}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Main AdminPanel component
// ════════════════════════════════════════════════════════════
export default function AdminPanel({ onBack, adminPass: adminPassProp }) {
  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [authError,   setAuthError]   = useState(null);
  const [activeTab,   setActiveTab]   = useState("summary");
  const [lastRefresh, setLastRefresh] = useState(null);

  // Details tab
  const [detailJuror,  setDetailJuror]  = useState("ALL");
  const [detailGroup,  setDetailGroup]  = useState("ALL");
  const [detailSearch, setDetailSearch] = useState("");
  const [sortKey,      setSortKey]      = useState("tsMs");
  const [sortDir,      setSortDir]      = useState("desc");

  // Jurors tab filters
  const [jurorDropdown, setJurorDropdown] = useState("ALL");
  const [jurorSearch,   setJurorSearch]   = useState("");

  const [adminPass, setAdminPass] = useState(() => {
    if (typeof adminPassProp === "string" && adminPassProp.trim()) return adminPassProp.trim();
    try { return sessionStorage.getItem("ee492_admin_pass") || ""; } catch { return ""; }
  });

  useEffect(() => {
    if (typeof adminPassProp === "string" && adminPassProp.trim()) {
      setAdminPass(adminPassProp.trim());
      try { sessionStorage.setItem("ee492_admin_pass", adminPassProp.trim()); } catch {}
    }
  }, [adminPassProp]);

  // ── Fetch from Apps Script ──────────────────────────────────
  const fetchData = async () => {
    setLoading(true); setError(null); setAuthError(null);
    try {
      if (!SCRIPT_URL) throw new Error("Missing APP_CONFIG.scriptUrl");
      const pass = (adminPass || "").trim();
      if (!pass) { setData([]); setAuthError("Enter the admin password to load results."); return; }

      const res = await fetch(`${SCRIPT_URL}?action=export&pass=${encodeURIComponent(pass)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.text()).trim();
      if (raw.toLowerCase().includes("<html")) throw new Error("Received HTML — check Apps Script deployment.");
      let json;
      try { json = JSON.parse(raw); } catch { throw new Error("Apps Script returned invalid JSON."); }

      if (json?.status === "unauthorized") { setData([]); setAuthError("Incorrect password."); return; }
      if (json?.status !== "ok" || !Array.isArray(json?.rows)) throw new Error("Unexpected response.");

      try { sessionStorage.setItem("ee492_admin_pass", pass); } catch {}

      const parsed = json.rows.map((row) => ({
        juryName:    String(row["Juror Name"]  ?? row["Your Name"] ?? ""),
        juryDept:    String(row["Department / Institution"] ?? row["Department"] ?? ""),
        timestamp:   row["Timestamp"] || "",
        tsMs:        tsToMillis(row["Timestamp"] || ""),
        projectId:   toNum(row["Group No"]),
        projectName: String(row["Group Name"] ?? ""),
        design:      toNum(row["Design (20)"]),
        technical:   toNum(row["Technical (40)"]),
        delivery:    toNum(row["Delivery (30)"]),
        teamwork:    toNum(row["Teamwork (10)"]),
        total:       toNum(row["Total (100)"]),
        comments:    row["Comments"] || "",
        status:      String(row["Status"] ?? "all_submitted"),
      }));

      setData(dedupeAndSort(parsed));
      setLastRefresh(new Date());
    } catch (e) {
      setError("Could not load data: " + e.message); setData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const id = setInterval(fetchData, AUTO_REFRESH);
    return () => clearInterval(id);
  }, [adminPass]);

  // ── Deduplicate rows: keep best status per (juror, group) ───
  // Priority: all_submitted > group_submitted > in_progress
  function dedupeAndSort(rows) {
    const priority = { "all_submitted": 3, "group_submitted": 2, "in_progress": 1 };
    const cleaned  = rows.filter((r) => r.juryName || r.projectName || r.total > 0);
    const byKey    = new Map();

    for (const r of cleaned) {
      const jur = String(r.juryName ?? "").trim().toLowerCase();
      const grp = r.projectId ? String(r.projectId) : String(r.projectName ?? "").trim().toLowerCase();
      if (!jur || !grp) continue;
      const key  = `${jur}__${grp}`;
      const prev = byKey.get(key);
      if (!prev) { byKey.set(key, r); continue; }
      const prevPri = priority[prev.status] || 0;
      const curPri  = priority[r.status]    || 0;
      // Prefer higher status; on tie prefer newer timestamp
      if (curPri > prevPri || (curPri === prevPri && r.tsMs >= (prev.tsMs || 0))) {
        byKey.set(key, r);
      }
    }

    const deduped = [...byKey.values()];
    deduped.sort((a, b) => (b.tsMs || 0) - (a.tsMs || 0));
    return deduped;
  }

  // ── Derived lists ─────────────────────────────────────────────
  const jurors = useMemo(
    () => [...new Set(data.map((d) => d.juryName).filter(Boolean))].sort(cmp), [data]
  );
  const groups = useMemo(
    () =>
      PROJECT_LIST
        .map((p) => ({
          id: p.id,
          label: `Group ${p.id}`,
          desc: p.desc || "",
        }))
        .sort((a, b) => a.id - b.id),
    []
  );

  // Map juror name → department (for matrix display)
  const jurorDeptMap = useMemo(() => {
    const m = new Map();
    data.forEach((r) => { if (r.juryName && r.juryDept && !m.has(r.juryName)) m.set(r.juryName, r.juryDept); });
    return m;
  }, [data]);

  const jurorColorMap = useMemo(() => {
    const m = new Map();
    jurors.forEach((n) => m.set(n, { bg: jurorBg(n), dot: jurorDot(n) }));
    return m;
  }, [jurors]);

  // Only submitted rows (group_submitted or all_submitted) for scoring/ranking
  const submittedData = useMemo(() => data.filter((r) => r.status === "all_submitted" || r.status === "group_submitted"), [data]);

  // Per-project stats (all_submitted only) — includes min/max for bar chart
  const projectStats = useMemo(() => {
    return PROJECT_LIST.map((p) => {
      const rows = submittedData.filter((d) => d.projectId === p.id);
      if (!rows.length) return { id: p.id, name: p.name, desc: p.desc, students: p.students, count: 0, avg: {}, totalAvg: 0, totalMin: 0, totalMax: 0 };
      const avg = {};
      CRITERIA_LIST.forEach((c) => { avg[c.id] = rows.reduce((s, r) => s + (r[c.id] || 0), 0) / rows.length; });
      const totals = rows.map((r) => r.total);
      return {
        id: p.id, name: p.name, desc: p.desc, students: p.students,
        count: rows.length, avg,
        totalAvg: totals.reduce((a, b) => a + b, 0) / totals.length,
        totalMin: Math.min(...totals),
        totalMax: Math.max(...totals),
      };
    });
  }, [submittedData]);

  // Dashboard charts should use short group labels (Group 1, Group 2, …)
  // so long project titles from Google Sheets do not wrap on mobile.
  const dashboardStats = useMemo(
    () => projectStats.map((s) => ({ ...s, name: `Group ${s.id}` })),
    [projectStats]
  );

  const ranked = useMemo(() => [...projectStats].sort((a, b) => b.totalAvg - a.totalAvg), [projectStats]);

  // Per-juror stats
  const jurorStats = useMemo(() => {
    return jurors.map((jury) => {
      const rows       = data.filter((d) => d.juryName === jury);
      const submitted  = rows.filter((r) => r.status === "all_submitted" || r.status === "group_submitted");
      const inProgress = rows.filter((r) => r.status === "in_progress");
      const latestTs   = rows.reduce((mx, r) => r.tsMs > mx ? r.tsMs : mx, 0);
      const latestRow  = rows.find((r) => r.tsMs === latestTs) || rows[0];
      const overall    = submitted.length === TOTAL_GROUPS ? "all_submitted"
                       : submitted.length > 0 || inProgress.length > 0 ? "in_progress" : "not_started";
      return { jury, rows, submitted, inProgress, latestTs, latestRow, overall };
    });
  }, [jurors, data]);

  // Filtered juror stats for Jurors tab
  const filteredJurorStats = useMemo(() => {
    let list = jurorStats;
    if (jurorDropdown !== "ALL") list = list.filter((s) => s.jury === jurorDropdown);
    const q = jurorSearch.trim().toLowerCase();
    if (q) list = list.filter((s) =>
      s.jury.toLowerCase().includes(q) || (s.latestRow?.juryDept || "").toLowerCase().includes(q)
    );
    return list;
  }, [jurorStats, jurorDropdown, jurorSearch]);

  // Rank badge helpers
  const rankTheme = (i) => [
    { bg: "#F59E0B", fg: "#0B1220", ring: "#FCD34D" },
    { bg: "#94A3B8", fg: "#0B1220", ring: "#CBD5E1" },
    { bg: "#B45309", fg: "#FFF7ED", ring: "#FDBA74" },
  ][i] ?? { bg: "#475569", fg: "#F1F5F9", ring: "#94A3B8" };
  const rankEmoji = (i) => ["🥇", "🥈", "🥉"][i] ?? String(i + 1);

  // Details rows: filter + sort
  const detailRows = useMemo(() => {
    const q = detailSearch.trim().toLowerCase();
    let rows = data.slice();
    if (detailJuror !== "ALL") rows = rows.filter((r) => r.juryName    === detailJuror);
    if (detailGroup !== "ALL") rows = rows.filter((r) => r.projectName === detailGroup);
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

  const inProgressCount = data.filter((r) => r.status === "in_progress").length;

  const TABS = [
    { id: "summary",   label: "🏆 Summary"   },
    { id: "dashboard", label: "📈 Dashboard"  },
    { id: "detail",    label: "📋 Details"    },
    { id: "jurors",    label: "👤 Jurors"     },
    { id: "matrix",    label: "🔢 Matrix"     },
  ];

  return (
    <div className="admin-screen">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="form-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">
          <HomeIcon />
        </button>
        <div>
          <h2>Results Panel</h2>
          <p>
            {jurors.length} juror{jurors.length !== 1 ? "s" : ""} · {submittedData.length} submitted
            {inProgressCount > 0 && <span className="live-indicator"> · {inProgressCount} in progress</span>}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
          {lastRefresh && (
            <span style={{ fontSize: 10, color: "#94a3b8" }}>
              {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* ── Tab bar (scrollable on mobile) ────────────────── */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading   && <div className="loading">Loading data…</div>}
      {error     && <div className="error-msg">{error}</div>}
      {authError && <div className="error-msg">{authError}</div>}

      {/* ════════════════════════════════════════════════════
          SUMMARY — ranking only
      ════════════════════════════════════════════════════ */}
      {!loading && !error && !authError && activeTab === "summary" && (
        <div className="admin-body">
          {submittedData.length === 0 && <div className="empty-msg">No submitted evaluations yet.</div>}
          <div className="rank-list">
            {ranked.map((p, i) => (
              <div key={p.name} className="rank-card" style={i < 3 ? {
                background: "#ECFDF5",
                boxShadow: "0 0 0 1px #BBF7D0, 0 10px 40px rgba(34,197,94,0.35)",
                border: "1px solid #86EFAC",
              } : undefined}>
                <div className="rank-num" style={{
                  width: 52, height: 52, borderRadius: 999, display: "grid", placeItems: "center",
                  fontSize: i < 3 ? 22 : 18, fontWeight: 800,
                  background: rankTheme(i).bg, color: rankTheme(i).fg,
                  boxShadow: i < 3 ? "0 0 0 6px rgba(34,197,94,0.35)" : "0 6px 18px rgba(15,23,42,0.12)",
                  border: `3px solid ${rankTheme(i).ring}`,
                }}>
                  {rankEmoji(i)}
                </div>
                <div className="rank-info">
                  {/* Multi-line: name / description / students / count */}
                  <div className="rank-name-block">
                    <span className="rank-group-name">{p.name}</span>
                    {p.desc     && <span className="rank-desc-line">{p.desc}</span>}
                    {APP_CONFIG.showStudents && p.students?.length > 0 && (
                      <span className="rank-students-line">👥 {p.students.join(" · ")}</span>
                    )}
                    <span className="rank-eval-count">({p.count} evaluation{p.count !== 1 ? "s" : ""})</span>
                  </div>
                  <div className="rank-bars">
                    {CRITERIA_LIST.map((c) => (
                      <div key={c.id} className="mini-bar-row">
                        <span className="mini-label">{c.shortLabel || c.label}</span>
                        <div className="mini-bar-track">
                          <div className="mini-bar-fill" style={{ width: `${((p.avg[c.id] || 0) / c.max) * 100}%` }} />
                        </div>
                        <span className="mini-val">{(p.avg[c.id] || 0).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rank-total"><span>{p.totalAvg.toFixed(1)}</span><small>avg.</small></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          DASHBOARD — 5 charts in a responsive grid
      ════════════════════════════════════════════════════ */}
      {!loading && !error && !authError && activeTab === "dashboard" && (
        <div className="admin-body">
          {submittedData.length === 0 && <div className="empty-msg">No submitted evaluations yet.</div>}
          {submittedData.length > 0 && (
            <>
              <div className="dashboard-grid">
                <GroupBarChart     stats={dashboardStats} />
                <JurorStrictnessChart data={submittedData} />
              </div>
              <div className="dashboard-grid">
                <ClusteredBarChart stats={dashboardStats} />
                <RadarChart        stats={dashboardStats} />
              </div>
              <ScoreDotPlot data={submittedData} />
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          DETAILS — sortable table + CSV export
      ════════════════════════════════════════════════════ */}
      {!loading && !error && !authError && activeTab === "detail" && (
        <div className="admin-body">
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
                {groups.map((g) => <option key={g} value={g}>{g}</option>)}
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
                  <th onClick={() => setSort("projectName")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>Group {si("projectName")}</th>
                  <th style={{ whiteSpace: "nowrap" }}>Group Description</th>
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
                  <tr><td colSpan={12} style={{ textAlign: "center", padding: 32, color: "#64748b" }}>No matching rows.</td></tr>
                )}
                {detailRows.map((row, i) => {
                  const isNewBlock = i === 0 || detailRows[i-1].juryName !== row.juryName;
                  return (
                    <tr key={`${row.juryName}-${row.projectId}-${i}`}
                      style={{ backgroundColor: jurorColorMap.get(row.juryName)?.bg || "transparent", borderTop: isNewBlock ? "2px solid #e5e7eb" : undefined }}>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: jurorColorMap.get(row.juryName)?.dot || "#64748b", border: "2px solid #cbd5e1", flexShrink: 0 }} />
                          {row.juryName}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "#475569" }}>{row.juryDept}</td>
                      {/* nowrap prevents "Group 1" wrapping across lines */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        <strong>{`Group ${row.projectId}`}</strong>
                      </td>
                      <td style={{ fontSize: 12, color: "#475569", minWidth: 220 }}>
                        {PROJECT_LIST.find((p) => p.id === row.projectId)?.desc || ""}
                      </td>
                      <td style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{formatTs(row.timestamp)}</td>
                      <td><StatusBadge status={row.status} /></td>
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

      {/* ════════════════════════════════════════════════════
          JURORS — dropdown + text search, progress per juror
      ════════════════════════════════════════════════════ */}
      {!loading && !error && !authError && activeTab === "jurors" && (
        <div className="admin-body">
          {/* Filter bar: dropdown + text search */}
          <div className="juror-filter-bar">
            <select
              className="juror-filter-select"
              value={jurorDropdown}
              onChange={(e) => setJurorDropdown(e.target.value)}
            >
              <option value="ALL">All jurors</option>
              {jurors.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
            <div className="juror-search-wrap">
              <input
                className="juror-search-input"
                value={jurorSearch}
                onChange={(e) => setJurorSearch(e.target.value)}
                placeholder="🔍 Search by name or department…"
              />
              {jurorSearch && (
                <button className="juror-search-clear" onClick={() => setJurorSearch("")}>✕</button>
              )}
            </div>
          </div>

          {filteredJurorStats.length === 0 && <div className="empty-msg">No jurors found.</div>}

          {filteredJurorStats.map(({ jury, rows, submitted, overall, latestTs, latestRow }) => {
            const pct = Math.round((submitted.length / TOTAL_GROUPS) * 100);
            // Progress bar color mirrors jury form gradient
            const barColor = pct === 100 ? "#22c55e"
              : pct > 66 ? "#84cc16"
              : pct > 33 ? "#eab308"
              : pct > 0  ? "#f97316"
              : "#e2e8f0";

            return (
              <div key={jury} className="juror-card">
                <div className="juror-card-header">
                  <div>
                    <div className="juror-name">
                      👤 {jury}
                      {latestRow?.juryDept && (
                        <span className="juror-dept-inline"> ({latestRow.juryDept})</span>
                      )}
                    </div>
                    <StatusBadge status={overall} />
                  </div>
                  <div className="juror-meta">
                    {latestTs > 0 && (
                      <div className="juror-last-submit">
                        <span className="juror-last-submit-label">Last activity</span>
                        <span className="juror-last-submit-time">{formatTs(latestRow?.timestamp)}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: submitted.length < TOTAL_GROUPS ? "#b45309" : "#166534", fontWeight: 600 }}>
                      {submitted.length === TOTAL_GROUPS ? "✓ All submitted" : `${submitted.length}/${TOTAL_GROUPS} submitted`}
                    </div>
                  </div>
                </div>

                {/* Progress bar with gradient color */}
                <div className="juror-progress-wrap">
                  <div className="juror-progress-bar-bg">
                    <div className="juror-progress-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <span className="juror-progress-label">{pct}%</span>
                </div>

                {/* Per-group detail rows */}
                <div className="juror-projects">
                  {rows.slice().sort((a, b) => a.projectId - b.projectId).map((d) => {
                    const grp = PROJECT_LIST.find((p) => p.id === d.projectId);
                    return (
                      <div key={`${jury}-${d.projectId}-${d.timestamp}`} className="juror-row">
                        <div className="juror-row-main">
                          <span className="juror-row-name">{`Group ${d.projectId}`}</span>
                          {grp?.desc && <span className="juror-row-desc">{grp.desc}</span>}
                        </div>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{formatTs(d.timestamp)}</span>
                        <StatusBadge status={d.status} />
                        {(d.status === "all_submitted" || d.status === "group_submitted") && (
                          <span className="juror-score">{d.total} / 100</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MATRIX — status-based color table
      ════════════════════════════════════════════════════ */}
      {!loading && !error && !authError && activeTab === "matrix" && (
        <div className="admin-body">
          <MatrixTab data={data} jurors={jurors} groups={groups} jurorDeptMap={jurorDeptMap} />
        </div>
      )}
    </div>
  );
}

// src/AdminPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "./config";

const PROJECT_LIST = (Array.isArray(PROJECTS) ? PROJECTS : []).map((p, idx) =>
  typeof p === "string"
    ? { id: idx + 1, name: p }
    : { id: p.id ?? idx + 1, name: p.name ?? `Group ${idx + 1}` }
);

const CRITERIA_LIST = (Array.isArray(CRITERIA) ? CRITERIA : []).map((c) => ({
  id: c.id,
  label: c.label,
  shortLabel: c.shortLabel,
  max: c.max,
}));

const SCRIPT_URL = APP_CONFIG?.scriptUrl;
const TOTAL_GROUPS = PROJECT_LIST.length;

function toNum(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim().replace(/^\"+|\"+$/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function tsToMillis(ts) {
  if (!ts) return 0;
  const s = String(ts).trim().replace(/\s*,\s*/g, ", ");
  const native = Date.parse(s);
  if (Number.isFinite(native)) return native;
  const eu = s.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4}),\s*([0-2]?\d):([0-5]\d)(?::([0-5]\d))?$/);
  if (eu) {
    const d = new Date(Number(eu[3]), Number(eu[2]) - 1, Number(eu[1]), Number(eu[4]), Number(eu[5]), Number(eu[6] || 0));
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?)?$/);
  if (!m) return 0;
  let hour = Number(m[4] || 0);
  const ampm = (m[7] || "").toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]), hour, Number(m[5] || 0), Number(m[6] || 0));
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function formatTs(ts) {
  if (!ts) return "—";
  const ms = tsToMillis(ts);
  if (!ms) return String(ts);
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function cmp(a, b) {
  const an = Number(a), bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  const as = (a ?? "").toString().toLowerCase();
  const bs = (b ?? "").toString().toLowerCase();
  return as < bs ? -1 : as > bs ? 1 : 0;
}

function hashStringToInt(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function jurorBgColor(name) {
  const hue = hashStringToInt((name || "unknown").toString()) % 360;
  return hslToHex(hue, 55, 95);
}
function jurorDotColor(name) {
  const hue = hashStringToInt((name || "unknown").toString()) % 360;
  return hslToHex(hue, 65, 55);
}

// ── CSV Export ──────────────────────────────────────────────
function exportCSV(rows) {
  const headers = ["Juror", "Department", "Group", "Design/20", "Technical/40", "Delivery/30", "Teamwork/10", "Total/100", "Timestamp", "Comments"];
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) =>
      [r.juryName, r.juryDept, r.projectName, r.design, r.technical, r.delivery, r.teamwork, r.total, r.timestamp, r.comments]
        .map(escape).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jury_results_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Radar / Spider Chart (pure SVG, no lib needed) ──────────
function RadarChart({ stats }) {
  const criteria = CRITERIA_LIST;
  const N = criteria.length;
  if (N < 3) return null;

  const cx = 120, cy = 120, R = 90;
  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2;

  const spokePoint = (i, r) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });

  const rings = [0.25, 0.5, 0.75, 1.0];

  // Overall averages across all groups
  const avgs = criteria.map((c) => {
    const vals = stats.filter((s) => s.count > 0).map((s) => s.avg[c.id] || 0);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });

  const dataPoints = criteria.map((c, i) => {
    const maxVal = c.max;
    const avg = avgs[i];
    const pct = maxVal > 0 ? avg / maxVal : 0;
    return spokePoint(i, pct * R);
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  return (
    <div className="radar-wrap">
      <div className="radar-title">Criteria Overview (All Groups Avg.)</div>
      <svg viewBox="0 0 240 240" className="radar-svg">
        {/* Rings */}
        {rings.map((r) => {
          const pts = criteria.map((_, i) => spokePoint(i, r * R));
          const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
          return <path key={r} d={path} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {/* Spokes */}
        {criteria.map((_, i) => {
          const end = spokePoint(i, R);
          return <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="#cbd5e1" strokeWidth="1" />;
        })}
        {/* Data polygon */}
        <path d={dataPath} fill="rgba(59,130,246,0.18)" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
        {/* Data dots */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />
        ))}
        {/* Labels */}
        {criteria.map((c, i) => {
          const lp = spokePoint(i, R + 18);
          return (
            <text key={i} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)} textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fill="#475569" fontWeight="600">
              {c.shortLabel || c.label}
            </text>
          );
        })}
        {/* Avg value labels */}
        {dataPoints.map((p, i) => (
          <text key={`v${i}`} x={(p.x + (p.x > cx ? 6 : p.x < cx ? -6 : 0)).toFixed(1)}
            y={(p.y + (p.y > cy ? 8 : -8)).toFixed(1)} textAnchor="middle"
            fontSize="8" fill="#1e40af" fontWeight="700">
            {avgs[i].toFixed(1)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Matrix Tab ───────────────────────────────────────────────
function MatrixTab({ data, jurors, groups }) {
  const cellColor = (val) => {
    if (val === null) return { bg: "#f8fafc", color: "#94a3b8" };
    const pct = val / 100;
    if (pct >= 0.8) return { bg: "#dcfce7", color: "#166534" };
    if (pct >= 0.6) return { bg: "#fef9c3", color: "#854d0e" };
    return { bg: "#fee2e2", color: "#991b1b" };
  };

  // Build lookup: jurorName -> projectName -> total
  const lookup = {};
  data.forEach((r) => {
    if (!lookup[r.juryName]) lookup[r.juryName] = {};
    lookup[r.juryName][r.projectName] = r.total;
  });

  if (!jurors.length) return <div className="empty-msg">No data yet.</div>;

  return (
    <div className="matrix-wrap">
      <p className="matrix-subtitle">Each cell shows the total score (—  = not yet submitted)</p>
      <div className="matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="matrix-corner">Juror ↓ / Group →</th>
              {groups.map((g) => <th key={g}>{g}</th>)}
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {jurors.map((juror) => {
              const submitted = groups.filter((g) => lookup[juror]?.[g] !== undefined).length;
              return (
                <tr key={juror}>
                  <td className="matrix-juror">{juror}</td>
                  {groups.map((g) => {
                    const val = lookup[juror]?.[g] ?? null;
                    const { bg, color } = cellColor(val);
                    return (
                      <td key={g} style={{ background: bg, color, fontWeight: val !== null ? 700 : 400 }}>
                        {val !== null ? val : "—"}
                      </td>
                    );
                  })}
                  <td className="matrix-progress-cell">
                    <div className="matrix-progress-bar-wrap">
                      <div className="matrix-progress-bar" style={{ width: `${(submitted / TOTAL_GROUPS) * 100}%` }} />
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

// ── Main Component ───────────────────────────────────────────
export default function AdminPanel({ onBack, adminPass: adminPassProp }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");

  const [detailJuror, setDetailJuror] = useState("ALL");
  const [detailGroup, setDetailGroup] = useState("ALL");
  const [detailSearch, setDetailSearch] = useState("");
  const [sortKey, setSortKey] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");

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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError(null); setAuthError(null);
    try {
      if (!SCRIPT_URL) throw new Error("Missing APP_CONFIG.scriptUrl in src/config.js");
      const pass = (adminPass || "").trim();
      if (!pass) { setData([]); setAuthError("Enter the admin password to load results."); return; }

      const url = `${SCRIPT_URL}?action=export&pass=${encodeURIComponent(pass)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const raw = await res.text();
      const trimmed = (raw || "").trim();
      if (trimmed.toLowerCase().includes("<html"))
        throw new Error("Received HTML from Apps Script. Check deployment access and Web App URL.");

      let json;
      try { json = JSON.parse(trimmed); } catch { throw new Error("Apps Script did not return valid JSON."); }

      const msg = (json?.message || "").toString();
      if (json?.status === "unauthorized" || (json?.status === "error" && /unauthorized/i.test(msg))) {
        setData([]); setAuthError("Incorrect password."); return;
      }
      if (json?.status !== "ok" || !Array.isArray(json?.rows))
        throw new Error("Unexpected response from Apps Script export.");

      try { sessionStorage.setItem("ee492_admin_pass", pass); } catch {}

      const parsed = (json.rows || []).map((row) => ({
        juryName: String(row["Your Name"] ?? row["Juror Name"] ?? ""),
        juryDept: String(row["Department / Institution"] ?? row["Department"] ?? row["Institution"] ?? ""),
        timestamp: row["Timestamp"] || "",
        tsMs: tsToMillis(row["Timestamp"] || ""),
        projectId: toNum(row["Group No"]),
        projectName: String(row["Group Name"] ?? ""),
        design: toNum(row["Design (20)"]),
        technical: toNum(row["Technical (40)"]),
        delivery: toNum(row["Delivery (30)"]),
        teamwork: toNum(row["Teamwork (10)"]),
        total: toNum(row["Total (100)"]),
        comments: row["Comments"] || "",
      }));

      setData(dedupeAndSort(parsed));
    } catch (e) {
      setError("Could not load data: " + e.message); setData([]);
    } finally { setLoading(false); }
  };

  function dedupeAndSort(rows) {
    const cleaned = (rows || []).filter((r) => r.juryName || r.projectName || r.total > 0);
    const byKey = new Map();
    for (const r of cleaned) {
      const jur = String(r.juryName ?? "").trim().toLowerCase();
      const grp = r.projectId ? String(r.projectId) : String(r.projectName ?? "").trim().toLowerCase();
      if (!jur || !grp) continue;
      const key = `${jur}__${grp}`;
      const prev = byKey.get(key);
      if (!prev || r.tsMs >= (prev.tsMs || 0)) byKey.set(key, r);
    }
    const unkeyed = cleaned.filter((r) => {
      const jur = String(r.juryName ?? "").trim().toLowerCase();
      const grp = r.projectId ? String(r.projectId) : String(r.projectName ?? "").trim().toLowerCase();
      return !(jur && grp);
    });
    const deduped = [...byKey.values(), ...unkeyed];
    deduped.sort((a, b) => (b.tsMs || 0) - (a.tsMs || 0));
    return deduped;
  }

  const jurors = useMemo(
    () => [...new Set(data.map((d) => d.juryName).filter(Boolean))].sort((a, b) => cmp(a, b)),
    [data]
  );

  const groups = useMemo(() => {
    const fromData = [...new Set(data.map((d) => d.projectName).filter(Boolean))];
    const base = fromData.length ? fromData : PROJECT_LIST.map((p) => p.name);
    return base.slice().sort((a, b) => cmp(a, b));
  }, [data]);

  const jurorColorMap = useMemo(() => {
    const m = new Map();
    jurors.forEach((name) => m.set(name, { bg: jurorBgColor(name), dot: jurorDotColor(name) }));
    return m;
  }, [jurors]);

  const projectStats = useMemo(() => {
    return PROJECT_LIST.map((p) => {
      const rows = data.filter((d) => d.projectId === p.id);
      if (rows.length === 0) return { id: p.id, name: p.name, count: 0, avg: {}, totalAvg: 0 };
      const avg = {};
      CRITERIA_LIST.forEach((c) => { avg[c.id] = rows.reduce((s, r) => s + (r[c.id] || 0), 0) / rows.length; });
      return { id: p.id, name: p.name, count: rows.length, avg, totalAvg: rows.reduce((s, r) => s + (r.total || 0), 0) / rows.length };
    });
  }, [data]);

  const ranked = useMemo(() => [...projectStats].sort((a, b) => b.totalAvg - a.totalAvg), [projectStats]);

  const rankBadgeTheme = (i) => {
    if (i === 0) return { bg: "#F59E0B", fg: "#0B1220", ring: "#FCD34D" };
    if (i === 1) return { bg: "#94A3B8", fg: "#0B1220", ring: "#CBD5E1" };
    if (i === 2) return { bg: "#B45309", fg: "#FFF7ED", ring: "#FDBA74" };
    return { bg: "#475569", fg: "#F1F5F9", ring: "#94A3B8" };
  };
  const rankBadgeContent = (i) => ["🥇","🥈","🥉"][i] ?? String(i + 1);

  // Details filtering
  const detailRows = useMemo(() => {
    const q = detailSearch.trim().toLowerCase();
    let rows = data.slice();
    if (detailJuror !== "ALL") rows = rows.filter((r) => r.juryName === detailJuror);
    if (detailGroup !== "ALL") rows = rows.filter((r) => r.projectName === detailGroup);
    if (q) {
      rows = rows.filter((r) =>
        [r.juryName, r.juryDept, r.timestamp, r.projectName, String(r.projectId),
         String(r.design), String(r.technical), String(r.delivery), String(r.teamwork),
         String(r.total), r.comments].join(" ").toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const av = sortKey === "tsMs" ? a.tsMs : a[sortKey];
      const bv = sortKey === "tsMs" ? b.tsMs : b[sortKey];
      const c = cmp(av, bv);
      return sortDir === "asc" ? c : -c;
    });
    return rows;
  }, [data, detailJuror, detailGroup, detailSearch, sortKey, sortDir]);

  const setSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };
  const sortIcon = (key) => sortKey !== key ? "↕" : sortDir === "asc" ? "↑" : "↓";

  // Juror stats for Jurors tab
  const jurorStats = useMemo(() => {
    return jurors.map((jury) => {
      const juryRows = data.filter((d) => d.juryName === jury);
      const submittedGroups = juryRows.length;
      const latestTs = juryRows.reduce((max, r) => (r.tsMs > max ? r.tsMs : max), 0);
      const latestRow = juryRows.find((r) => r.tsMs === latestTs) || juryRows[0];
      return { jury, juryRows, submittedGroups, latestTs, latestRow };
    });
  }, [jurors, data]);

  const tabs = ["summary", "detail", "jurors", "matrix"];

  return (
    <div className="admin-screen">
      <div className="form-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div>
          <h2>Results Panel</h2>
          <p>{jurors.length} juror{jurors.length !== 1 ? "s" : ""} · {data.length} evaluation{data.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
      </div>

      <div className="tab-bar">
        {tabs.map((t) => (
          <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t === "summary" ? "📊 Summary" : t === "detail" ? "📋 Details" : t === "jurors" ? "👤 Jurors" : "🔢 Matrix"}
          </button>
        ))}
      </div>

      {loading && <div className="loading">Loading data...</div>}
      {error && <div className="error-msg">{error}</div>}
      {authError && <div className="error-msg">{authError}</div>}

      {/* ── SUMMARY ── */}
      {!loading && !error && !authError && activeTab === "summary" && (
        <div className="admin-body">
          {data.length === 0 && <div className="empty-msg">No evaluation data yet.</div>}

          {data.length > 0 && <RadarChart stats={projectStats} />}

          {/* Completion status */}
          {data.length > 0 && (
            <div className="completion-summary">
              {jurorStats.map(({ jury, submittedGroups }) => (
                <div key={jury} className="completion-row">
                  <span className="completion-name">{jury}</span>
                  <div className="completion-bar-wrap">
                    <div className="completion-bar" style={{ width: `${(submittedGroups / TOTAL_GROUPS) * 100}%` }} />
                  </div>
                  <span className="completion-count">{submittedGroups}/{TOTAL_GROUPS}</span>
                  {submittedGroups < TOTAL_GROUPS && (
                    <span className="completion-warn">⚠️</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="rank-list">
            {ranked.map((p, i) => (
              <div
                key={p.name}
                className="rank-card"
                style={i < 3 ? {
                  background: "#ECFDF5",
                  boxShadow: "0 0 0 1px #BBF7D0, 0 10px 40px rgba(34,197,94,0.35), 0 0 60px rgba(34,197,94,0.25)",
                  border: "1px solid #86EFAC",
                } : undefined}
              >
                <div className="rank-num" style={{
                  width: 52, height: 52, borderRadius: 999, display: "grid", placeItems: "center",
                  fontSize: i < 3 ? 22 : 18, fontWeight: 800,
                  background: rankBadgeTheme(i).bg, color: rankBadgeTheme(i).fg,
                  boxShadow: i < 3
                    ? "0 0 0 6px rgba(34,197,94,0.35), 0 0 30px rgba(34,197,94,0.6), 0 0 60px rgba(34,197,94,0.35)"
                    : "0 6px 18px rgba(15,23,42,0.12)",
                  border: `3px solid ${rankBadgeTheme(i).ring}`,
                }}>
                  {rankBadgeContent(i)}
                </div>
                <div className="rank-info">
                  <div className="rank-name">
                    {i < 3 && <span style={{ marginRight: 8, fontSize: 14 }}>{rankBadgeContent(i)}</span>}
                    {p.name}{" "}
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
                      ({p.count} evaluation{p.count !== 1 ? "s" : ""})
                    </span>
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
                <div className="rank-total">
                  <span>{p.totalAvg.toFixed(1)}</span>
                  <small>avg.</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DETAILS ── */}
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
              <input value={detailSearch} onChange={(e) => setDetailSearch(e.target.value)} placeholder="Search juror, group, comments..." />
            </div>
            <button className="filter-reset" onClick={() => { setDetailJuror("ALL"); setDetailGroup("ALL"); setDetailSearch(""); setSortKey("timestamp"); setSortDir("desc"); }}>
              Reset
            </button>
            <span className="filter-count">Showing <strong>{detailRows.length}</strong> row{detailRows.length !== 1 ? "s" : ""}</span>
            <button className="csv-export-btn" onClick={() => exportCSV(detailRows)} title="Export visible rows as CSV">
              ⬇ Export CSV
            </button>
          </div>

          <div className="detail-table-wrap">
            <table className="detail-table">
              <thead>
                <tr>
                  <th onClick={() => setSort("juryName")} style={{ cursor: "pointer" }}>Juror {sortIcon("juryName")}</th>
                  <th onClick={() => setSort("projectName")} style={{ cursor: "pointer" }}>Group {sortIcon("projectName")}</th>
                  <th onClick={() => setSort("tsMs")} style={{ cursor: "pointer" }}>Submitted {sortIcon("tsMs")}</th>
                  <th onClick={() => setSort("design")} style={{ cursor: "pointer" }}>Design /20 {sortIcon("design")}</th>
                  <th onClick={() => setSort("technical")} style={{ cursor: "pointer" }}>Technical /40 {sortIcon("technical")}</th>
                  <th onClick={() => setSort("delivery")} style={{ cursor: "pointer" }}>Delivery /30 {sortIcon("delivery")}</th>
                  <th onClick={() => setSort("teamwork")} style={{ cursor: "pointer" }}>Teamwork /10 {sortIcon("teamwork")}</th>
                  <th onClick={() => setSort("total")} style={{ cursor: "pointer" }}>Total {sortIcon("total")}</th>
                  <th onClick={() => setSort("comments")} style={{ cursor: "pointer" }}>Comments {sortIcon("comments")}</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#64748b" }}>No matching rows.</td></tr>
                )}
                {detailRows.map((row, i) => {
                  const prevJuror = i > 0 ? detailRows[i - 1].juryName : null;
                  const isNewBlock = row.juryName !== prevJuror;
                  return (
                    <tr key={`${row.juryName}-${row.projectId}-${row.timestamp}-${i}`}
                      style={{ backgroundColor: jurorColorMap.get(row.juryName)?.bg || "transparent", borderTop: isNewBlock ? "2px solid #e5e7eb" : undefined }}>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 999, background: jurorColorMap.get(row.juryName)?.dot || "#64748b", border: "2px solid #cbd5e1", flexShrink: 0 }} />
                          {row.juryName}
                        </span>
                      </td>
                      <td><strong>{row.projectName}</strong></td>
                      <td style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{formatTs(row.timestamp)}</td>
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

      {/* ── JURORS ── */}
      {!loading && !error && !authError && activeTab === "jurors" && (
        <div className="admin-body">
          {jurors.length === 0 && <div className="empty-msg">No juror submissions yet.</div>}
          {jurorStats.map(({ jury, juryRows, submittedGroups, latestTs, latestRow }) => {
            const completionPct = Math.round((submittedGroups / TOTAL_GROUPS) * 100);
            return (
              <div key={jury} className="juror-card">
                <div className="juror-card-header">
                  <div>
                    <div className="juror-name">👤 {jury}</div>
                    <div className="juror-dept">{latestRow?.juryDept}</div>
                  </div>
                  <div className="juror-meta">
                    {latestTs > 0 && (
                      <div className="juror-last-submit">
                        <span className="juror-last-submit-label">Last submitted</span>
                        <span className="juror-last-submit-time">{formatTs(latestRow?.timestamp)}</span>
                      </div>
                    )}
                    <div className="juror-completion">
                      <span style={{ fontSize: 13, color: submittedGroups < TOTAL_GROUPS ? "#b45309" : "#166534", fontWeight: 600 }}>
                        {submittedGroups === TOTAL_GROUPS ? "✓ Complete" : `⚠️ ${submittedGroups}/${TOTAL_GROUPS} groups`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="juror-progress-wrap">
                  <div className="juror-progress-bar-bg">
                    <div className="juror-progress-bar-fill"
                      style={{ width: `${completionPct}%`, background: completionPct === 100 ? "#22c55e" : "#f59e0b" }} />
                  </div>
                  <span className="juror-progress-label">{completionPct}%</span>
                </div>

                <div className="juror-projects">
                  {juryRows.slice().sort((a, b) => a.projectId - b.projectId).map((d) => (
                    <div key={`${jury}-${d.projectId}-${d.timestamp}`} className="juror-row">
                      <span>{d.projectName}</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{formatTs(d.timestamp)}</span>
                      <span className="juror-score">{d.total} / 100</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MATRIX ── */}
      {!loading && !error && !authError && activeTab === "matrix" && (
        <div className="admin-body">
          <MatrixTab data={data} jurors={jurors} groups={groups} />
        </div>
      )}
    </div>
  );
}

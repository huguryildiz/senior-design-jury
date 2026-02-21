// src/AdminPanel.jsx
// ============================================================
// Admin results dashboard.
// Tabs: Summary → Dashboard → Details → Jurors → Matrix
// Features:
//   - Auto-refresh every 5 minutes
//   - in_progress / submitted status badges
//   - Summary: ranking only
//   - Dashboard: 5 charts (Group Bar, Clustered Bar, Radar per group,
//                           Juror Strictness, Score Dot Plot)
//   - Details: dept column, timestamp, status, CSV export (UTF-8 BOM)
//   - Jurors: search filter, progress bar, per-group desc, timestamps
//   - Matrix: status-based coloring (green=submitted, yellow=in_progress, grey=not started)
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { PROJECTS, CRITERIA, APP_CONFIG } from "./config";

// ── Normalize PROJECTS / CRITERIA from config ─────────────────
const PROJECT_LIST = PROJECTS.map((p, i) =>
  typeof p === "string"
    ? { id: i + 1, name: p, desc: "", students: [] }
    : { id: p.id ?? i + 1, name: p.name ?? `Group ${i + 1}`, desc: p.desc ?? "", students: p.students ?? [] }
);
const CRITERIA_LIST = CRITERIA.map((c) => ({ id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max }));
const TOTAL_GROUPS  = PROJECT_LIST.length;
const SCRIPT_URL    = APP_CONFIG?.scriptUrl;
const AUTO_REFRESH  = 5 * 60 * 1000; // 5 minutes

// ── Utility: coerce any value to a finite number ──────────────
function toNum(v) {
  const n = Number(String(v ?? "").trim().replace(/^"+|"+$/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// ── Utility: parse various timestamp formats → ms ─────────────
function tsToMillis(ts) {
  if (!ts) return 0;
  const s = String(ts).trim().replace(/\s*,\s*/g, ", ");
  const native = Date.parse(s);
  if (Number.isFinite(native)) return native;
  // EU: DD/MM/YYYY, HH:MM:SS
  const eu = s.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4}),\s*([0-2]?\d):([0-5]\d)(?::([0-5]\d))?$/);
  if (eu) {
    return new Date(+eu[3], +eu[2]-1, +eu[1], +eu[4], +eu[5], +(eu[6]||0)).getTime() || 0;
  }
  // US: M/D/YYYY H:MM:SS AM/PM
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
  if (!us) return 0;
  let h = +(us[4]||0);
  const ap = (us[7]||"").toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return new Date(+us[3], +us[1]-1, +us[2], h, +(us[5]||0), +(us[6]||0)).getTime() || 0;
}

// ── Utility: format ms → DD/MM/YYYY HH:MM ─────────────────────
function formatTs(ts) {
  if (!ts) return "—";
  const ms = tsToMillis(ts);
  if (!ms) return String(ts);
  const d = new Date(ms), pad = (n) => String(n).padStart(2,"0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Utility: generic sort comparator ─────────────────────────
function cmp(a, b) {
  const an = Number(a), bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return String(a??"").toLowerCase() < String(b??"").toLowerCase() ? -1 : 1;
}

// ── Utility: deterministic pastel color from string hash ──────
function hashInt(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h,16777619); }
  return h >>> 0;
}
function hsl2hex(h, s, l) {
  s/=100; l/=100;
  const k=(n)=>(n+h/30)%12, a=s*Math.min(l,1-l);
  const f=(n)=>Math.round(255*(l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1))))).toString(16).padStart(2,"0");
  return `#${f(0)}${f(8)}${f(4)}`;
}
const jurorBg  = (n) => hsl2hex(hashInt((n||"?")) % 360, 55, 95);
const jurorDot = (n) => hsl2hex(hashInt((n||"?")) % 360, 65, 55);

// ── CSV export with UTF-8 BOM (fixes Turkish chars in Excel) ──
function exportCSV(rows) {
  const hdrs = ["Juror","Department","Group","Design/20","Technical/40","Delivery/30","Teamwork/10","Total/100","Timestamp","Status","Comments"];
  const esc  = (v) => { const s=String(v??""); return (s.includes(",")||s.includes('"')||s.includes("\n")) ? `"${s.replace(/"/g,'""')}"` : s; };
  const lines = [hdrs.map(esc).join(","), ...rows.map((r) =>
    [r.juryName,r.juryDept,r.projectName,r.design,r.technical,r.delivery,r.teamwork,r.total,r.timestamp,r.status||"",r.comments].map(esc).join(",")
  )];
  const blob = new Blob(["\uFEFF"+lines.join("\n")], {type:"text/csv;charset=utf-8;"});
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {href:url, download:`jury_results_${new Date().toISOString().slice(0,10)}.csv`});
  a.click(); URL.revokeObjectURL(url);
}

// ── Standard deviation helper ─────────────────────────────────
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
  return Math.sqrt(arr.reduce((s,v)=>s+(v-mean)**2,0)/arr.length);
}

// ════════════════════════════════════════════════════════════
// CHART 1: Group Average Total Score — horizontal bar + min/max
// ════════════════════════════════════════════════════════════
function GroupBarChart({ stats }) {
  const data = stats.filter((s) => s.count > 0);
  if (!data.length) return <div className="chart-empty">Not enough data yet.</div>;
  return (
    <div className="chart-card">
      <div className="chart-title">Group Average Total Score</div>
      <div className="chart-subtitle">Bar = average · Line = min–max range</div>
      {data.map((p) => {
        const pct    = (p.totalAvg / 100) * 100;
        const pctMin = (p.totalMin / 100) * 100;
        const pctMax = (p.totalMax / 100) * 100;
        return (
          <div key={p.id} className="hbar-row">
            <span className="hbar-label" title={p.desc}>{p.name}</span>
            <div className="hbar-track">
              {/* Average bar */}
              <div className="hbar-fill" style={{ width: `${pct}%` }} />
              {/* Min–max range line */}
              <div className="hbar-range" style={{ left:`${pctMin}%`, width:`${pctMax-pctMin}%` }} />
              {/* Min/max tick marks */}
              <div className="hbar-tick" style={{ left:`${pctMin}%` }} />
              <div className="hbar-tick" style={{ left:`${pctMax}%` }} />
            </div>
            <span className="hbar-val">{p.totalAvg.toFixed(1)}</span>
          </div>
        );
      })}
      <div className="hbar-axis">
        {[0,20,40,60,80,100].map((v) => (
          <span key={v} style={{ left:`${v}%` }}>{v}</span>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 2: Criterion-Based Clustered Bar Chart
// ════════════════════════════════════════════════════════════
const CRIT_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444"];

function ClusteredBarChart({ stats }) {
  const data = stats.filter((s) => s.count > 0);
  if (!data.length) return <div className="chart-empty">Not enough data yet.</div>;

  // Normalize each criterion score to 0–100% of its max
  const normalized = data.map((p) => ({
    name: p.name,
    vals: CRITERIA_LIST.map((c) => ({ id: c.id, label: c.shortLabel||c.label, pct: ((p.avg[c.id]||0)/c.max)*100 })),
  }));

  const barW   = 14; // px per bar
  const gap    = 4;  // px between bars in a cluster
  const groupW = CRITERIA_LIST.length * (barW + gap) + 10; // total cluster width
  const chartH = 140;
  const totalW = data.length * groupW + 40;

  return (
    <div className="chart-card">
      <div className="chart-title">Criterion Performance by Group</div>
      <div className="chart-subtitle">Normalized score (% of max per criterion)</div>
      <div className="clustered-scroll">
        <svg viewBox={`0 0 ${totalW} ${chartH + 40}`} style={{ width: Math.max(totalW, 300), height: chartH + 40 }}>
          {/* Y grid lines */}
          {[0,25,50,75,100].map((v) => {
            const y = chartH - (v/100)*chartH;
            return (
              <g key={v}>
                <line x1={30} y1={y} x2={totalW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={24} y={y+4} fontSize="8" textAnchor="end" fill="#94a3b8">{v}</text>
              </g>
            );
          })}
          {/* Clusters */}
          {normalized.map((group, gi) => {
            const gx = 34 + gi * groupW;
            return (
              <g key={group.name}>
                {group.vals.map((v, ci) => {
                  const bh = (v.pct / 100) * chartH;
                  const bx = gx + ci * (barW + gap);
                  const by = chartH - bh;
                  return (
                    <g key={v.id}>
                      <rect x={bx} y={by} width={barW} height={bh} fill={CRIT_COLORS[ci]} rx="2" opacity="0.85" />
                      <title>{group.name} · {v.label}: {v.pct.toFixed(1)}%</title>
                    </g>
                  );
                })}
                {/* Group label */}
                <text
                  x={gx + (CRITERIA_LIST.length * (barW+gap)) / 2 - gap}
                  y={chartH + 14}
                  fontSize="9" textAnchor="middle" fill="#475569" fontWeight="600"
                >{group.name}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="chart-legend">
        {CRITERIA_LIST.map((c, i) => (
          <span key={c.id} className="legend-item">
            <span className="legend-dot" style={{ background: CRIT_COLORS[i] }} />
            {c.shortLabel||c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 3: Radar — per-group selector, normalized 0–100%
// ════════════════════════════════════════════════════════════
function RadarChart({ stats }) {
  const [selectedId, setSelectedId] = useState(null);
  const N  = CRITERIA_LIST.length;
  if (N < 3) return null;

  // Available groups with data
  const available = stats.filter((s) => s.count > 0);
  const effectiveId = selectedId ?? available[0]?.id;
  const group = available.find((s) => s.id === effectiveId) ?? available[0];

  const cx=150, cy=150, R=105;
  const angle  = (i) => (Math.PI*2*i)/N - Math.PI/2;
  const spoke  = (i, r) => ({ x: cx+r*Math.cos(angle(i)), y: cy+r*Math.sin(angle(i)) });

  const avgs = CRITERIA_LIST.map((c) => group ? ((group.avg[c.id]||0)/c.max)*100 : 0);
  const pts  = CRITERIA_LIST.map((_, i) => spoke(i, (avgs[i]/100)*R));
  const path = pts.map((p,i) => `${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+" Z";

  return (
    <div className="chart-card radar-chart-card">
      <div className="chart-title">Performance Radar</div>
      <div className="chart-subtitle">Normalized per criterion (% of max)</div>
      {available.length > 1 && (
        <select className="radar-group-select" value={effectiveId} onChange={(e) => setSelectedId(Number(e.target.value))}>
          {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      <svg viewBox="0 0 300 300" className="radar-svg">
        {/* Rings at 25/50/75/100% */}
        {[0.25,0.5,0.75,1].map((r) => {
          const ring = CRITERIA_LIST.map((_,i) => spoke(i,r*R));
          const rpath = ring.map((p,i) => `${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+" Z";
          return <path key={r} d={rpath} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {/* Spokes */}
        {CRITERIA_LIST.map((_,i) => {
          const end = spoke(i, R);
          return <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke="#cbd5e1" strokeWidth="1" />;
        })}
        {/* Data polygon */}
        <path d={path} fill="rgba(59,130,246,0.18)" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
        {/* Dots */}
        {pts.map((p,i) => <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />)}
        {/* Labels — placed further out with two-line support */}
        {CRITERIA_LIST.map((c,i) => {
          const lp   = spoke(i, R+28);
          const label = c.shortLabel || c.label;
          return (
            <text key={i} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fill="#334155" fontWeight="700">
              {label}
            </text>
          );
        })}
        {/* Value labels */}
        {pts.map((p,i) => (
          <text key={`v${i}`}
            x={(p.x+(p.x>cx?9:p.x<cx-2?-9:0)).toFixed(1)}
            y={(p.y+(p.y>cy?11:-11)).toFixed(1)}
            textAnchor="middle" fontSize="9" fill="#1e40af" fontWeight="700">
            {avgs[i].toFixed(1)}%
          </text>
        ))}
      </svg>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 4: Juror Strictness — mean ± std dev bar chart
// ════════════════════════════════════════════════════════════
function JurorStrictnessChart({ data }) {
  // Only use submitted rows
  const submitted = data.filter((r) => r.status === "submitted");
  const jurors = [...new Set(submitted.map((r) => r.juryName).filter(Boolean))];
  if (jurors.length < 2) return <div className="chart-empty">Need at least 2 jurors with submitted evaluations.</div>;

  const jurorStats = jurors.map((j) => {
    const vals = submitted.filter((r) => r.juryName === j).map((r) => r.total);
    const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
    const sd   = stdDev(vals);
    return { name: j, mean, sd, min: mean-sd, max: mean+sd };
  }).sort((a,b) => b.mean - a.mean);

  const globalMean = submitted.reduce((s,r)=>s+r.total,0)/submitted.length;

  return (
    <div className="chart-card">
      <div className="chart-title">Juror Scoring Tendencies</div>
      <div className="chart-subtitle">Average total score per juror · Error bar = ±1 std dev · Dashed = overall mean</div>
      {jurorStats.map((j) => {
        const pct    = (j.mean / 100) * 100;
        const pctMin = Math.max(0, (j.min  / 100) * 100);
        const pctMax = Math.min(100,(j.max  / 100) * 100);
        const gmPct  = (globalMean / 100) * 100;
        return (
          <div key={j.name} className="hbar-row">
            <span className="hbar-label strictness-label" title={j.name}>{j.name.split(" ").slice(-1)[0]}</span>
            <div className="hbar-track">
              <div className="hbar-fill strictness-fill" style={{ width:`${pct}%` }} />
              <div className="hbar-range" style={{ left:`${pctMin}%`, width:`${pctMax-pctMin}%` }} />
              <div className="hbar-tick" style={{ left:`${pctMin}%` }} />
              <div className="hbar-tick" style={{ left:`${pctMax}%` }} />
              {/* Global mean dashed line */}
              <div className="hbar-mean-line" style={{ left:`${gmPct}%` }} />
            </div>
            <span className="hbar-val">{j.mean.toFixed(1)}<span style={{fontSize:10,color:"#94a3b8"}}>±{j.sd.toFixed(1)}</span></span>
          </div>
        );
      })}
      <div className="hbar-axis">
        {[0,20,40,60,80,100].map((v) => <span key={v} style={{left:`${v}%`}}>{v}</span>)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CHART 5: Score Distribution — dot plot
// ════════════════════════════════════════════════════════════
function ScoreDotPlot({ data }) {
  const submitted = data.filter((r) => r.status === "submitted");
  if (submitted.length < 3) return <div className="chart-empty">Need at least 3 submitted evaluations.</div>;

  // Group dots by score value, offset overlapping dots vertically
  const dotMap = {};
  submitted.forEach((r) => {
    const key = r.total;
    dotMap[key] = (dotMap[key] || 0) + 1;
  });

  const W = 320, H = 80, PAD = 20;
  const dots = submitted.map((r) => ({ x: PAD + (r.total/100)*(W-PAD*2), score: r.total, name: r.juryName, group: r.projectName }));

  // Stack dots at same x
  const stacked = {};
  dots.forEach((d) => {
    const key = Math.round(d.x);
    stacked[key] = (stacked[key] || 0) + 1;
    d.y = H - 10 - (stacked[key]-1)*14;
  });

  const mean = submitted.reduce((s,r)=>s+r.total,0)/submitted.length;
  const meanX = PAD + (mean/100)*(W-PAD*2);

  return (
    <div className="chart-card">
      <div className="chart-title">Score Distribution</div>
      <div className="chart-subtitle">Each dot = one evaluation · Dashed = mean ({mean.toFixed(1)})</div>
      <div style={{overflowX:"auto"}}>
        <svg viewBox={`0 0 ${W} ${H+20}`} style={{width:"100%",minWidth:260}}>
          {/* Axis */}
          <line x1={PAD} y1={H} x2={W-PAD} y2={H} stroke="#e2e8f0" strokeWidth="1" />
          {[0,20,40,60,80,100].map((v) => {
            const x = PAD+(v/100)*(W-PAD*2);
            return (
              <g key={v}>
                <line x1={x} y1={H-2} x2={x} y2={H+2} stroke="#94a3b8" strokeWidth="1" />
                <text x={x} y={H+12} textAnchor="middle" fontSize="8" fill="#94a3b8">{v}</text>
              </g>
            );
          })}
          {/* Mean line */}
          <line x1={meanX} y1={0} x2={meanX} y2={H} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,3" />
          {/* Dots */}
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r="5" fill="#3b82f6" opacity="0.7" stroke="#fff" strokeWidth="1">
              <title>{d.group} · {d.name} · {d.score}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STATUS BADGE component
// ════════════════════════════════════════════════════════════
function StatusBadge({ status }) {
  if (status === "in_progress") return <span className="status-badge in-progress">● In Progress</span>;
  if (status === "submitted")   return <span className="status-badge submitted">✓ Submitted</span>;
  return null;
}

// ════════════════════════════════════════════════════════════
// MATRIX TAB
// Color logic: green = submitted, yellow = in_progress, grey = not started
// ════════════════════════════════════════════════════════════
function MatrixTab({ data, jurors, groups }) {
  // Build lookup: jurorName → projectName → { total, status }
  const lookup = {};
  data.forEach((r) => {
    if (!lookup[r.juryName]) lookup[r.juryName] = {};
    lookup[r.juryName][r.projectName] = { total: r.total, status: r.status };
  });

  if (!jurors.length) return <div className="empty-msg">No data yet.</div>;

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
              <th className="matrix-corner">Juror ↓ / Group →</th>
              {groups.map((g) => <th key={g}>{g}</th>)}
              <th>Done</th>
            </tr>
          </thead>
          <tbody>
            {jurors.map((juror) => {
              const submittedCount = groups.filter((g) => lookup[juror]?.[g]?.status === "submitted").length;
              return (
                <tr key={juror}>
                  <td className="matrix-juror">{juror}</td>
                  {groups.map((g) => {
                    const entry  = lookup[juror]?.[g];
                    const status = entry?.status;
                    // Color by status, not by score
                    const style = status === "submitted"
                      ? { background:"#dcfce7", color:"#166534", fontWeight:700 }
                      : status === "in_progress"
                      ? { background:"#fef9c3", color:"#92400e", fontWeight:600 }
                      : { background:"#f8fafc", color:"#94a3b8" };
                    return (
                      <td key={g} style={style}>
                        {status === "submitted"   ? entry.total
                         : status === "in_progress" ? "…"
                         : "—"}
                      </td>
                    );
                  })}
                  <td className="matrix-progress-cell">
                    <div className="matrix-progress-bar-wrap">
                      <div className="matrix-progress-bar" style={{ width:`${(submittedCount/TOTAL_GROUPS)*100}%` }} />
                    </div>
                    <span className="matrix-progress-label">{submittedCount}/{TOTAL_GROUPS}</span>
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
// MAIN AdminPanel component
// ════════════════════════════════════════════════════════════
export default function AdminPanel({ onBack, adminPass: adminPassProp }) {
  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [authError,   setAuthError]   = useState(null);
  const [activeTab,   setActiveTab]   = useState("summary");
  const [lastRefresh, setLastRefresh] = useState(null);

  // Details tab state
  const [detailJuror,  setDetailJuror]  = useState("ALL");
  const [detailGroup,  setDetailGroup]  = useState("ALL");
  const [detailSearch, setDetailSearch] = useState("");
  const [sortKey,      setSortKey]      = useState("tsMs");
  const [sortDir,      setSortDir]      = useState("desc");

  // Jurors tab filter
  const [jurorSearch, setJurorSearch] = useState("");

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

  // ── Fetch from Apps Script ───────────────────────────────────
  const fetchData = async () => {
    setLoading(true); setError(null); setAuthError(null);
    try {
      if (!SCRIPT_URL) throw new Error("Missing APP_CONFIG.scriptUrl");
      const pass = (adminPass || "").trim();
      if (!pass) { setData([]); setAuthError("Enter the admin password to load results."); return; }

      const res = await fetch(`${SCRIPT_URL}?action=export&pass=${encodeURIComponent(pass)}`, { cache:"no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.text()).trim();
      if (raw.toLowerCase().includes("<html")) throw new Error("Received HTML from Apps Script. Check deployment settings.");

      let json;
      try { json = JSON.parse(raw); } catch { throw new Error("Apps Script did not return valid JSON."); }

      const msg = (json?.message||"").toString();
      if (json?.status==="unauthorized"||(json?.status==="error"&&/unauthorized/i.test(msg))) {
        setData([]); setAuthError("Incorrect password."); return;
      }
      if (json?.status!=="ok"||!Array.isArray(json?.rows)) throw new Error("Unexpected response from Apps Script.");

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
        status:      String(row["Status"] ?? "submitted"),
      }));

      setData(dedupeAndSort(parsed));
      setLastRefresh(new Date());
    } catch (e) {
      setError("Could not load data: " + e.message); setData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(fetchData, AUTO_REFRESH);
    return () => clearInterval(id);
  }, [adminPass]);

  // ── Deduplicate: latest row wins per (juror, group) ──────────
  // "submitted" rows are never replaced by "in_progress" rows
  function dedupeAndSort(rows) {
    const cleaned = rows.filter((r) => r.juryName || r.projectName || r.total > 0);
    const byKey   = new Map();
    for (const r of cleaned) {
      const jur = String(r.juryName??"").trim().toLowerCase();
      const grp = r.projectId ? String(r.projectId) : String(r.projectName??"").trim().toLowerCase();
      if (!jur || !grp) continue;
      const key  = `${jur}__${grp}`;
      const prev = byKey.get(key);
      if (!prev) { byKey.set(key, r); continue; }
      // Never overwrite "submitted" with "in_progress"
      if (prev.status === "submitted" && r.status === "in_progress") continue;
      if (r.status === "submitted" && prev.status !== "submitted") { byKey.set(key, r); continue; }
      if (r.tsMs >= (prev.tsMs || 0)) byKey.set(key, r);
    }
    const deduped = [...byKey.values()];
    deduped.sort((a, b) => (b.tsMs||0) - (a.tsMs||0));
    return deduped;
  }

  // ── Derived lists ─────────────────────────────────────────────
  const jurors = useMemo(
    () => [...new Set(data.map((d) => d.juryName).filter(Boolean))].sort(cmp),
    [data]
  );
  const groups = useMemo(() => {
    const fromData = [...new Set(data.map((d) => d.projectName).filter(Boolean))];
    return (fromData.length ? fromData : PROJECT_LIST.map((p) => p.name)).sort(cmp);
  }, [data]);

  const jurorColorMap = useMemo(() => {
    const m = new Map();
    jurors.forEach((n) => m.set(n, { bg: jurorBg(n), dot: jurorDot(n) }));
    return m;
  }, [jurors]);

  // Only "submitted" rows are used for scoring/ranking
  const submittedData = useMemo(() => data.filter((r) => r.status !== "in_progress"), [data]);

  // Per-project stats (submitted only) — includes min/max for bar chart
  const projectStats = useMemo(() => {
    return PROJECT_LIST.map((p) => {
      const rows = submittedData.filter((d) => d.projectId === p.id);
      if (!rows.length) return { id:p.id, name:p.name, desc:p.desc, students:p.students, count:0, avg:{}, totalAvg:0, totalMin:0, totalMax:0 };
      const avg = {};
      CRITERIA_LIST.forEach((c) => { avg[c.id] = rows.reduce((s,r)=>s+(r[c.id]||0),0)/rows.length; });
      const totals = rows.map((r) => r.total);
      return {
        id: p.id, name: p.name, desc: p.desc, students: p.students,
        count: rows.length, avg,
        totalAvg: totals.reduce((a,b)=>a+b,0)/totals.length,
        totalMin: Math.min(...totals),
        totalMax: Math.max(...totals),
      };
    });
  }, [submittedData]);

  const ranked = useMemo(() => [...projectStats].sort((a,b) => b.totalAvg - a.totalAvg), [projectStats]);

  // Per-juror stats for Jurors tab
  const jurorStats = useMemo(() => {
    return jurors.map((jury) => {
      const rows       = data.filter((d) => d.juryName === jury);
      const submitted  = rows.filter((r) => r.status === "submitted");
      const inProgress = rows.filter((r) => r.status === "in_progress");
      const latestTs   = rows.reduce((mx,r) => r.tsMs > mx ? r.tsMs : mx, 0);
      const latestRow  = rows.find((r) => r.tsMs === latestTs) || rows[0];
      const overall    = submitted.length === TOTAL_GROUPS ? "submitted"
                       : inProgress.length > 0            ? "in_progress" : "not_started";
      return { jury, rows, submitted, inProgress, latestTs, latestRow, overall };
    });
  }, [jurors, data]);

  // Filtered juror stats for Jurors tab search
  const filteredJurorStats = useMemo(() => {
    const q = jurorSearch.trim().toLowerCase();
    if (!q) return jurorStats;
    return jurorStats.filter((s) => s.jury.toLowerCase().includes(q) || (s.latestRow?.juryDept||"").toLowerCase().includes(q));
  }, [jurorStats, jurorSearch]);

  // Rank badge helpers
  const rankTheme = (i) => [
    {bg:"#F59E0B",fg:"#0B1220",ring:"#FCD34D"},
    {bg:"#94A3B8",fg:"#0B1220",ring:"#CBD5E1"},
    {bg:"#B45309",fg:"#FFF7ED",ring:"#FDBA74"},
  ][i] ?? {bg:"#475569",fg:"#F1F5F9",ring:"#94A3B8"};
  const rankEmoji = (i) => ["🥇","🥈","🥉"][i] ?? String(i+1);

  // Details filtering + sorting
  const detailRows = useMemo(() => {
    const q = detailSearch.trim().toLowerCase();
    let rows = data.slice();
    if (detailJuror !== "ALL") rows = rows.filter((r) => r.juryName    === detailJuror);
    if (detailGroup !== "ALL") rows = rows.filter((r) => r.projectName === detailGroup);
    if (q) rows = rows.filter((r) =>
      [r.juryName,r.juryDept,r.timestamp,r.projectName,String(r.projectId),
       String(r.design),String(r.technical),String(r.delivery),String(r.teamwork),
       String(r.total),r.comments].join(" ").toLowerCase().includes(q)
    );
    rows.sort((a,b) => {
      const av = a[sortKey], bv = b[sortKey];
      return sortDir === "asc" ? cmp(av,bv) : cmp(bv,av);
    });
    return rows;
  }, [data, detailJuror, detailGroup, detailSearch, sortKey, sortDir]);

  const setSort = (key) => {
    if (sortKey === key) setSortDir((d) => d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  const si = (key) => sortKey!==key?"↕":sortDir==="asc"?"↑":"↓";

  // Tab order: Summary → Dashboard → Details → Jurors → Matrix
  const TABS = [
    { id:"summary",   label:"🏆 Summary"   },
    { id:"dashboard", label:"📈 Dashboard"  },
    { id:"detail",    label:"📋 Details"    },
    { id:"jurors",    label:"👤 Jurors"     },
    { id:"matrix",    label:"🔢 Matrix"     },
  ];

  const inProgressCount = data.filter((r) => r.status === "in_progress").length;

  return (
    <div className="admin-screen">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="form-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div>
          <h2>Results Panel</h2>
          <p>
            {jurors.length} juror{jurors.length!==1?"s":""} · {submittedData.length} submitted
            {inProgressCount > 0 && <span className="live-indicator"> · {inProgressCount} in progress</span>}
          </p>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
          <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
          {lastRefresh && (
            <span style={{fontSize:10,color:"#94a3b8"}}>
              {lastRefresh.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
            </span>
          )}
        </div>
      </div>

      {/* ── Tab bar (scrollable on mobile) ────────────────── */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${activeTab===t.id?"active":""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading   && <div className="loading">Loading data…</div>}
      {error     && <div className="error-msg">{error}</div>}
      {authError && <div className="error-msg">{authError}</div>}

      {/* ════════════════════════════════════════════════════
          SUMMARY TAB — ranking only
      ════════════════════════════════════════════════════ */}
      {!loading && !error && !authError && activeTab === "summary" && (
        <div className="admin-body">
          {submittedData.length === 0 && <div className="empty-msg">No submitted evaluations yet.</div>}
          <div className="rank-list">
            {ranked.map((p, i) => (
              <div key={p.name} className="rank-card" style={i<3?{
                background:"#ECFDF5",
                boxShadow:"0 0 0 1px #BBF7D0, 0 10px 40px rgba(34,197,94,0.35)",
                border:"1px solid #86EFAC",
              }:undefined}>
                <div className="rank-num" style={{
                  width:52,height:52,borderRadius:999,display:"grid",placeItems:"center",
                  fontSize:i<3?22:18,fontWeight:800,
                  background:rankTheme(i).bg,color:rankTheme(i).fg,
                  boxShadow:i<3?"0 0 0 6px rgba(34,197,94,0.35), 0 0 30px rgba(34,197,94,0.6)":"0 6px 18px rgba(15,23,42,0.12)",
                  border:`3px solid ${rankTheme(i).ring}`,
                }}>
                  {rankEmoji(i)}
                </div>
                <div className="rank-info">
                  {/* Multi-line rank card: name / desc / students / count */}
                  <div className="rank-name-block">
                    <span className="rank-group-name">{p.name}</span>
                    {p.desc && <span className="rank-desc-line">{p.desc}</span>}
                    {APP_CONFIG.showStudents && p.students?.length > 0 && (
                      <span className="rank-students-line">👥 {p.students.join(" · ")}</span>
                    )}
                    <span className="rank-eval-count">({p.count} evaluation{p.count!==1?"s":""})</span>
                  </div>
                  <div className="rank-bars">
                    {CRITERIA_LIST.map((c) => (
                      <div key={c.id} className="mini-bar-row">
                        <span className="mini-label">{c.shortLabel||c.label}</span>
                        <div className="mini-bar-track">
                          <div className="mini-bar-fill" style={{width:`${((p.avg[c.id]||0)/c.max)*100}%`}} />
                        </div>
                        <span className="mini-val">{(p.avg[c.id]||0).toFixed(1)}</span>
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

      {/* ════════════════════════════════════════════════════
          DASHBOARD TAB — 5 charts
      ════════════════════════════════════════════════════ */}
      {!loading && !error && !authError && activeTab === "dashboard" && (
        <div className="admin-body">
          {submittedData.length === 0 && <div className="empty-msg">No submitted evaluations yet.</div>}
          {submittedData.length > 0 && (
            <>
              <div className="dashboard-grid">
                <GroupBarChart      stats={projectStats} />
                <JurorStrictnessChart data={submittedData} />
              </div>
              <div className="dashboard-grid">
                <ClusteredBarChart  stats={projectStats} />
                <RadarChart         stats={projectStats} />
              </div>
              <ScoreDotPlot data={submittedData} />
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          DETAILS TAB
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
            <span className="filter-count">Showing <strong>{detailRows.length}</strong> row{detailRows.length!==1?"s":""}</span>
            <button className="csv-export-btn" onClick={() => exportCSV(detailRows)}>⬇ Export CSV</button>
          </div>

          <div className="detail-table-wrap">
            <table className="detail-table">
              <thead>
                <tr>
                  <th onClick={()=>setSort("juryName")}    style={{cursor:"pointer"}}>Juror {si("juryName")}</th>
                  <th onClick={()=>setSort("juryDept")}    style={{cursor:"pointer"}}>Department {si("juryDept")}</th>
                  <th onClick={()=>setSort("projectName")} style={{cursor:"pointer",whiteSpace:"nowrap"}}>Group {si("projectName")}</th>
                  <th onClick={()=>setSort("tsMs")}        style={{cursor:"pointer"}}>Submitted {si("tsMs")}</th>
                  <th>Status</th>
                  <th onClick={()=>setSort("design")}      style={{cursor:"pointer"}}>Design /20 {si("design")}</th>
                  <th onClick={()=>setSort("technical")}   style={{cursor:"pointer"}}>Technical /40 {si("technical")}</th>
                  <th onClick={()=>setSort("delivery")}    style={{cursor:"pointer"}}>Delivery /30 {si("delivery")}</th>
                  <th onClick={()=>setSort("teamwork")}    style={{cursor:"pointer"}}>Teamwork /10 {si("teamwork")}</th>
                  <th onClick={()=>setSort("total")}       style={{cursor:"pointer"}}>Total {si("total")}</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.length === 0 && (
                  <tr><td colSpan={11} style={{textAlign:"center",padding:32,color:"#64748b"}}>No matching rows.</td></tr>
                )}
                {detailRows.map((row, i) => {
                  const isNewBlock = i===0 || detailRows[i-1].juryName !== row.juryName;
                  return (
                    <tr key={`${row.juryName}-${row.projectId}-${i}`}
                      style={{backgroundColor:jurorColorMap.get(row.juryName)?.bg||"transparent", borderTop:isNewBlock?"2px solid #e5e7eb":undefined}}>
                      <td>
                        <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                          <span style={{width:10,height:10,borderRadius:999,background:jurorColorMap.get(row.juryName)?.dot||"#64748b",border:"2px solid #cbd5e1",flexShrink:0}} />
                          {row.juryName}
                        </span>
                      </td>
                      <td style={{fontSize:12,color:"#475569"}}>{row.juryDept}</td>
                      {/* nowrap prevents "Group 1" from breaking across lines */}
                      <td style={{whiteSpace:"nowrap"}}><strong>{row.projectName}</strong></td>
                      <td style={{fontSize:12,color:"#475569",whiteSpace:"nowrap"}}>{formatTs(row.timestamp)}</td>
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
          JURORS TAB
      ════════════════════════════════════════════════════ */}
      {!loading && !error && !authError && activeTab === "jurors" && (
        <div className="admin-body">
          {/* Search filter */}
          <div className="juror-search-bar">
            <input
              value={jurorSearch}
              onChange={(e) => setJurorSearch(e.target.value)}
              placeholder="🔍 Search jurors by name or department…"
            />
            {jurorSearch && (
              <button onClick={() => setJurorSearch("")} className="juror-search-clear">✕</button>
            )}
          </div>

          {filteredJurorStats.length === 0 && <div className="empty-msg">No jurors found.</div>}

          {filteredJurorStats.map(({ jury, rows, submitted, inProgress, overall, latestTs, latestRow }) => {
            const pct  = Math.round((submitted.length / TOTAL_GROUPS) * 100);
            const proj = PROJECT_LIST.find((p) => p.id === latestRow?.projectId);
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
                    <div style={{fontSize:13,color:submitted.length<TOTAL_GROUPS?"#b45309":"#166534",fontWeight:600}}>
                      {submitted.length===TOTAL_GROUPS?"✓ All submitted":`${submitted.length}/${TOTAL_GROUPS} submitted`}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="juror-progress-wrap">
                  <div className="juror-progress-bar-bg">
                    <div className="juror-progress-bar-fill" style={{
                      width:`${pct}%`,
                      background: pct===100?"#22c55e":overall==="in_progress"?"#f59e0b":"#94a3b8",
                    }} />
                  </div>
                  <span className="juror-progress-label">{pct}%</span>
                </div>

                {/* Per-group rows */}
                <div className="juror-projects">
                  {rows.slice().sort((a,b) => a.projectId - b.projectId).map((d) => {
                    const grp = PROJECT_LIST.find((p) => p.id === d.projectId);
                    return (
                      <div key={`${jury}-${d.projectId}-${d.timestamp}`} className="juror-row">
                        <div className="juror-row-main">
                          <span className="juror-row-name">{d.projectName}</span>
                          {grp?.desc && <span className="juror-row-desc">{grp.desc}</span>}
                        </div>
                        <span style={{fontSize:11,color:"#94a3b8"}}>{formatTs(d.timestamp)}</span>
                        {d.status === "in_progress"
                          ? <span className="status-badge in-progress" style={{fontSize:11}}>● In Progress</span>
                          : <span className="juror-score">{d.total} / 100</span>}
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
          MATRIX TAB
      ════════════════════════════════════════════════════ */}
      {!loading && !error && !authError && activeTab === "matrix" && (
        <div className="admin-body">
          <MatrixTab data={data} jurors={jurors} groups={groups} />
        </div>
      )}
    </div>
  );
}

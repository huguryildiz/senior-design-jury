// src/admin/utils.js
// ── Shared utility functions for AdminPanel modules ───────────

export function toNum(v) {
  const n = Number(String(v ?? "").trim().replace(/^"+|"+$/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function tsToMillis(ts) {
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

export function formatTs(ts) {
  if (!ts) return "—";
  const ms = tsToMillis(ts);
  if (!ms) return String(ts);
  const d = new Date(ms), pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function cmp(a, b) {
  const an = Number(a), bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return String(a??"").toLowerCase() < String(b??"").toLowerCase() ? -1 : 1;
}

// Deterministic pastel bg + dot color from a name string
export function hashInt(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function hsl2hex(h, s, l) {
  s/=100; l/=100;
  const k=(n)=>(n+h/30)%12, a=s*Math.min(l,1-l);
  const f=(n)=>Math.round(255*(l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1))))).toString(16).padStart(2,"0");
  return `#${f(0)}${f(8)}${f(4)}`;
}
export const jurorBg  = (n) => hsl2hex(hashInt(n||"?") % 360, 55, 95);
export const jurorDot = (n) => hsl2hex(hashInt(n||"?") % 360, 65, 55);

// CSV export — UTF-8 BOM fixes Turkish characters in Excel
export function exportCSV(rows) {
  const hdrs = ["Juror","Department","Group No","Group Name","Design/20","Technical/40","Delivery/30","Teamwork/10","Total/100","Timestamp","Comments","Status"];
  const esc  = (v) => { const s=String(v??""); return (s.includes(",")||s.includes('"')||s.includes("\n")) ? `"${s.replace(/"/g,'""')}"` : s; };
  const lines = [hdrs.map(esc).join(","), ...rows.map((r) =>
    [r.juryName,r.juryDept,r.projectId,r.projectName,r.design,r.technical,r.delivery,r.teamwork,r.total,r.timestamp,r.comments,r.status].map(esc).join(",")
  )];
  const blob = new Blob(["\uFEFF"+lines.join("\n")], {type:"text/csv;charset=utf-8;"});
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), {href:url, download:`jury_results_${new Date().toISOString().slice(0,10)}.csv`}).click();
  URL.revokeObjectURL(url);
}

// Deduplicate rows: keep best status per (juror, group)
// Priority: all_submitted > group_submitted > in_progress
export function dedupeAndSort(rows) {
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
    if (curPri > prevPri || (curPri === prevPri && r.tsMs >= (prev.tsMs || 0))) {
      byKey.set(key, r);
    }
  }

  const deduped = [...byKey.values()];
  deduped.sort((a, b) => (b.tsMs || 0) - (a.tsMs || 0));
  return deduped;
}

export function StatusBadge({ status }) {
  if (status === "all_submitted")   return <span className="status-badge submitted">✓ Submitted</span>;
  if (status === "group_submitted") return <span className="status-badge submitted">✓ Submitted</span>;
  if (status === "in_progress")     return <span className="status-badge in-progress">● In Progress</span>;
  return null;
}

export function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

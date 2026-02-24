// src/admin/SummaryTab.jsx
// ── Ranking summary with medal badges ────────────────────────

import { APP_CONFIG, CRITERIA } from "../config";

const CRITERIA_LIST = CRITERIA.map((c) => ({ id: c.id, label: c.label, shortLabel: c.shortLabel, max: c.max }));

const rankTheme = (i) => [
  { bg: "#F59E0B", fg: "#0B1220", ring: "#FCD34D" },
  { bg: "#94A3B8", fg: "#0B1220", ring: "#CBD5E1" },
  { bg: "#B45309", fg: "#FFF7ED", ring: "#FDBA74" },
][i] ?? { bg: "#475569", fg: "#F1F5F9", ring: "#94A3B8" };

const rankEmoji = (i) => ["🥇", "🥈", "🥉"][i] ?? String(i + 1);

export default function SummaryTab({ ranked, submittedData }) {
  if (submittedData.length === 0) {
    return <div className="empty-msg">No submitted evaluations yet.</div>;
  }
  return (
    <>
      <div className="summary-note" style={{
        marginBottom: 16,
        padding: "10px 14px",
        borderRadius: 12,
        background: "#EFF6FF",
        border: "1px solid #BFDBFE",
        color: "#1E3A8A",
        fontSize: 13,
        fontWeight: 500
      }}>
        ℹ️ Averages and rankings include only <strong>final submissions</strong>.
      </div>
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
    </>
  );
}

// src/admin/OverviewPage.jsx — Phase 2
// Prototype source: #page-overview (docs/concepts/vera-premium-prototype.html ~lines 11758–11982)
// Single-file overview page: KPIs, juror table, right stack, live feed, completion, charts, top projects.
import { useMemo, useState } from "react";
import JurorBadge from "../components/JurorBadge";
import { SubmissionTimelineChart } from "@/charts/SubmissionTimelineChart";
import { ScoreDistributionChart } from "@/charts/ScoreDistributionChart";

// ── Helpers ───────────────────────────────────────────────────

function relativeTime(ms) {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `${hrs}h ago`;
  return `${hrs}h ${rem}m ago`;
}

function jurorStatus(j) {
  if (j.finalSubmitted && !j.editEnabled) return "completed";
  if (j.editEnabled) return "editing";
  const done = j.completedProjects || 0;
  const total = j.totalProjects || 0;
  if (done > 0 && done < total) return "in_progress";
  if (done >= total && total > 0) return "partial";
  return "not_started";
}

function barColor(pct, status) {
  if (status === "completed" || pct === 100) return "var(--success)";
  if (pct > 0) return "var(--warning)";
  return "var(--surface-2)";
}

function completionFillColor(pct) {
  if (pct >= 70) return "var(--success)";
  if (pct >= 40) return "var(--warning)";
  return "var(--danger)";
}

function StatusBadge({ status }) {
  if (status === "completed") {
    return (
      <span className="badge badge-success">
        <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M9.2 12.4 11.3 14.5 15 10.8" />
        </svg>
        Completed
      </span>
    );
  }
  if (status === "editing") {
    return (
      <span className="badge badge-editing">
        <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Editing
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="badge badge-warning">
        <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 1.8" />
        </svg>
        In Progress
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="badge badge-warning">
        <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" strokeDasharray="2.5 2.5" /><circle cx="12" cy="12" r="1.3" />
        </svg>
        Partial
      </span>
    );
  }
  return (
    <span className="badge badge-neutral">
      <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
      </svg>
      Not Started
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────

export default function OverviewPage({
  rawScores = [],
  summaryData = [],
  allJurors = [],
  selectedPeriod = null,
  criteriaConfig = [],
  loading = false,
  onNavigate,
  isDemoMode = false,
}) {
  const [jurorTableExpanded, setJurorTableExpanded] = useState(false);

  // ── KPIs ──────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalJ = allJurors.length;
    const completed = allJurors.filter((j) => j.finalSubmitted).length;
    const inProg = allJurors.filter((j) => !j.finalSubmitted && (j.completedProjects || 0) > 0).length;
    const notStarted = allJurors.filter((j) => !j.finalSubmitted && !(j.completedProjects > 0));
    const pct = totalJ > 0 ? Math.round((completed / totalJ) * 100) : 0;
    const validScores = rawScores.filter((r) => r.total != null);
    const avg =
      validScores.length > 0
        ? (validScores.reduce((s, r) => s + r.total, 0) / validScores.length).toFixed(1)
        : null;
    return { totalJ, completed, inProg, notStarted, pct, avg };
  }, [allJurors, rawScores]);

  // ── Per-juror average map ─────────────────────────────────────
  const jurorAvgMap = useMemo(() => {
    const byJuror = new Map();
    for (const r of rawScores) {
      if (r.total == null || !r.jurorId) continue;
      if (!byJuror.has(r.jurorId)) byJuror.set(r.jurorId, []);
      byJuror.get(r.jurorId).push(r.total);
    }
    const result = new Map();
    for (const [id, totals] of byJuror) {
      result.set(id, (totals.reduce((s, v) => s + v, 0) / totals.length).toFixed(1));
    }
    return result;
  }, [rawScores]);

  // ── Juror table rows ──────────────────────────────────────────
  const sortedJurors = useMemo(
    () => [...allJurors].sort((a, b) => (b.lastSeenMs || 0) - (a.lastSeenMs || 0)),
    [allJurors]
  );
  const displayedJurors = jurorTableExpanded ? sortedJurors : sortedJurors.slice(0, 5);

  // ── Group completion bars ─────────────────────────────────────
  const groupCompletion = useMemo(() => {
    return summaryData
      .map((p) => {
        const scored = rawScores.filter((r) => r.projectId === p.id && r.total != null).length;
        const pct = kpi.totalJ > 0 ? Math.round((scored / kpi.totalJ) * 100) : 0;
        return { id: p.id, title: p.title, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [summaryData, rawScores, kpi.totalJ]);

  // ── Live feed (most recently active jurors) ───────────────────
  const recentActivity = useMemo(
    () =>
      [...allJurors]
        .filter((j) => (j.lastSeenMs || 0) > 0)
        .sort((a, b) => (b.lastSeenMs || 0) - (a.lastSeenMs || 0))
        .slice(0, 5),
    [allJurors]
  );

  // ── Top projects ──────────────────────────────────────────────
  const topProjects = useMemo(
    () =>
      [...summaryData]
        .filter((p) => p.totalAvg != null)
        .sort((a, b) => (b.totalAvg || 0) - (a.totalAvg || 0))
        .slice(0, 5),
    [summaryData]
  );

  // ── Period snapshot ───────────────────────────────────────────
  const criteriaLabel = useMemo(() => {
    if (!criteriaConfig || criteriaConfig.length === 0) return "No criteria configured";
    const names = criteriaConfig.map((c) => c.shortLabel || c.label || c.id).join(", ");
    return `${criteriaConfig.length} (${names})`;
  }, [criteriaConfig]);

  // ── Needs attention items ─────────────────────────────────────
  const attentionItems = useMemo(() => {
    const items = [];
    if (kpi.notStarted.length > 0) {
      const n = kpi.notStarted.length;
      items.push({ type: "warn", text: `${n} juror${n > 1 ? "s have" : " has"} not started scoring` });
    }
    if (kpi.inProg > 0) {
      const n = kpi.inProg;
      items.push({ type: "warn", text: `${n} juror${n > 1 ? "s are" : " is"} in progress` });
    }
    if (kpi.completed > 0) {
      items.push({ type: "ok", text: `${kpi.completed} of ${kpi.totalJ} jurors completed all evaluations` });
    }
    if (items.length === 0) {
      items.push({ type: "ok", text: "No issues detected" });
    }
    return items;
  }, [kpi]);

  return (
    <div className="admin-page" id="page-overview">


      {/* Page title */}
      <div className="overview-heading-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div className="page-title">Overview</div>
          <div className="page-desc">Real-time evaluation progress and jury activity</div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid">
        <div className="card kpi">
          <div className="kpi-label">Active Jurors</div>
          <div className="kpi-value">{kpi.totalJ || "—"}</div>
          <div className="kpi-sub">
            <span className="up">{kpi.completed} completed</span>
            {" · "}
            {kpi.inProg} in progress
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Projects / Groups</div>
          <div className="kpi-value">{summaryData.length || "—"}</div>
          <div className="kpi-sub">{selectedPeriod?.semester_name || "—"}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Completion</div>
          <div className="kpi-value">{kpi.totalJ > 0 ? `${kpi.pct}%` : "—"}</div>
          <div className="kpi-sub">{kpi.completed} of {kpi.totalJ} submitted</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Average Score</div>
          <div className="kpi-value">{kpi.avg ?? "—"}</div>
          <div className="kpi-sub">of 100</div>
        </div>
      </div>

      {/* Jury Activity + Needs Attention */}
      <div className="grid-2" style={{ marginBottom: 20 }}>

        {/* Juror table */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 6 }}>
                <circle cx="12" cy="8" r="4" /><path d="M20 20c0-4.4-3.6-8-8-8s-8 3.6-8 8" />
              </svg>
              Live Jury Activity
            </div>
            <span className="text-xs text-muted">
              {jurorTableExpanded ? kpi.totalJ : Math.min(5, kpi.totalJ)} of {kpi.totalJ} jurors shown
            </span>
          </div>

          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table id="overview-juror-table" className={jurorTableExpanded ? "expanded" : ""}>
              <thead>
                <tr>
                  <th>Juror</th>
                  <th>Status</th>
                  <th className="text-center">Progress</th>
                  <th className="text-right">Avg</th>
                  <th className="text-right">Active</th>
                </tr>
              </thead>
              <tbody>
                {displayedJurors.map((j) => {
                  const status = jurorStatus(j);
                  const avg = jurorAvgMap.get(j.jurorId);
                  const done = j.completedProjects || 0;
                  const total = j.totalProjects || 0;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <tr key={j.jurorId || j.juryName}>
                      <td>
                        <JurorBadge name={j.juryName} affiliation={j.affiliation} size="sm" />
                      </td>
                      <td><StatusBadge status={status} /></td>
                      <td className="text-center">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: "var(--surface-2)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: barColor(pct, status), borderRadius: 99 }} />
                          </div>
                          <span className="mono text-xs">{done}/{total}</span>
                        </div>
                      </td>
                      <td className="mono text-right">
                        {avg != null ? avg : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-xs text-muted text-right">{relativeTime(j.lastSeenMs)}</td>
                    </tr>
                  );
                })}
                {kpi.totalJ === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted" style={{ padding: "24px 16px" }}>
                      {loading ? "Loading…" : "No jurors assigned"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {kpi.totalJ > 5 && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                className="form-link text-xs overview-juror-toggle"
                onClick={() => setJurorTableExpanded((v) => !v)}
              >
                {jurorTableExpanded ? (
                  <>View fewer jurors <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign: "-1px", marginLeft: 2 }}><path d="m18 15-6-6-6 6" /></svg></>
                ) : (
                  <>View all {kpi.totalJ} jurors <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign: "-1px", marginLeft: 2 }}><path d="m6 9 6 6 6-6" /></svg></>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right stack */}
        <div className="overview-right-stack">

          {/* Needs Attention */}
          <div className="card" id="needs-attention">
            <div className="card-header">
              <div className="card-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 6 }}>
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Needs Attention
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {attentionItems.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12 }}>
                  <span style={{ color: item.type === "ok" ? "var(--success)" : "var(--warning)", fontSize: 14, lineHeight: 1 }}>●</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn btn-sm btn-outline" onClick={() => onNavigate?.("jurors")}>Review jurors</button>
              <button className="btn btn-sm btn-outline" onClick={() => onNavigate?.("scores")}>Open scores</button>
            </div>
          </div>

          {/* Period Snapshot */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 6 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                Period Snapshot
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
              <div className="text-muted">Period</div>
              <div style={{ fontWeight: 500 }}>{selectedPeriod?.semester_name || "—"}</div>
              <div className="text-muted">Criteria</div>
              <div style={{ fontWeight: 500 }}>{criteriaLabel}</div>
              <div className="text-muted">Jurors</div>
              <div style={{ fontWeight: 500 }}>{kpi.totalJ} assigned</div>
              <div className="text-muted">Projects</div>
              <div style={{ fontWeight: 500 }}>{summaryData.length} projects</div>
              <div className="text-muted">Status</div>
              <div>
                {selectedPeriod?.eval_locked ? (
                  <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                    <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Locked
                  </span>
                ) : selectedPeriod ? (
                  <span className="badge badge-success" style={{ fontSize: 10 }}>
                    <svg className="badge-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Active · Unlocked
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Live Feed + Completion */}
      <div className="grid-2" style={{ marginBottom: 20 }}>

        <div className="card live-feed-card">
          <div className="live-feed-head">
            <div className="card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 6 }}>
                <path d="M22 12h-4l-3 9-6-18-3 9H2" />
              </svg>
              Live Feed
            </div>
            <span className="live-feed-dot" aria-hidden="true" />
          </div>
          <div className="live-feed-list">
            {recentActivity.length === 0 ? (
              <div className="live-feed-item">
                <div className="live-feed-main">
                  <div className="live-feed-text text-muted">{loading ? "Loading…" : "No recent activity"}</div>
                </div>
              </div>
            ) : (
              recentActivity.map((j) => {
                const status = jurorStatus(j);
                const iconType = status === "completed" ? "done" : status === "editing" || status === "in_progress" ? "score" : "start";
                return (
                  <div className="live-feed-item" key={j.jurorId || j.juryName}>
                    <div className={`live-feed-icon ${iconType}`} aria-hidden="true">
                      {iconType === "done" ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v6" /><path d="M12 22v-2" /><path d="M6.2 6.2 7.6 7.6" /><path d="m16.4 16.4 1.4 1.4" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.2 17.8 1.4-1.4" /><path d="m16.4 7.6 1.4-1.4" /><circle cx="12" cy="12" r="4" />
                        </svg>
                      ) : iconType === "score" ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="m12 2.7 2.75 5.57 6.15.9-4.45 4.34 1.05 6.14L12 16.8l-5.5 2.9 1.05-6.14L3.1 9.17l6.15-.9Z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7Z" /></svg>
                      )}
                    </div>
                    <div className="live-feed-main">
                      <div className="live-feed-text">
                        <strong>{j.juryName}</strong>{" "}
                        {status === "completed"
                          ? "completed all evaluations"
                          : status === "editing"
                          ? "is editing scores"
                          : status === "in_progress"
                          ? `scored ${j.completedProjects} of ${j.totalProjects} projects`
                          : "was recently active"}
                      </div>
                      <div className="live-feed-time">{relativeTime(j.lastSeenMs)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card completion-card">
          <div className="completion-head">
            <div className="card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 6 }}>
                <path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 7v5l3 3" />
              </svg>
              Completion
            </div>
          </div>
          <div className="completion-list">
            {groupCompletion.length === 0 ? (
              <div className="text-muted text-xs" style={{ padding: "16px 0" }}>
                {loading ? "Loading…" : "No projects"}
              </div>
            ) : (
              groupCompletion.map((g) => (
                <div className="completion-row" key={g.id}>
                  <div className="completion-row-top">
                    <span className="completion-name">{g.title}</span>
                    <span className="completion-val">{g.pct}%</span>
                  </div>
                  <div className="completion-bar">
                    <div className="completion-fill" style={{ width: `${g.pct}%`, background: completionFillColor(g.pct) }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Charts — Phase 15: SubmissionTimelineChart + ScoreDistributionChart */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card chart-card">
          <div className="card-header">
            <div className="card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 6 }}>
                <path d="M3 3v18h18" /><path d="m7 14 4-4 4 4 6-6" />
              </svg>
              Submission Timeline
            </div>
          </div>
          <SubmissionTimelineChart allJurors={allJurors} />
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>Juror activity by hour — current period</div>
        </div>
        <div className="card chart-card">
          <div className="card-header">
            <div className="card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 6 }}>
                <path d="M3 3v18h18" />
                <rect x="7" y="10" width="3" height="8" rx="1" />
                <rect x="14" y="6" width="3" height="12" rx="1" />
              </svg>
              Score Distribution
            </div>
          </div>
          <ScoreDistributionChart rawScores={rawScores} />
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>Score range distribution across all evaluations</div>
        </div>
      </div>

      {/* Top Projects */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 6 }}>
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 12 7s5-3 7.5-3a2.5 2.5 0 0 1 0 5H18" />
              <path d="M18 14v-3H6v3" /><path d="M6 14a6 6 0 0 0 12 0" />
            </svg>
            Top Projects
          </div>
          <a className="form-link text-xs" style={{ cursor: "pointer" }} onClick={() => onNavigate?.("scores")}>
            Open rankings →
          </a>
        </div>
        <div className="table-wrap" style={{ border: "none" }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}>#</th>
                <th>Project</th>
                <th className="text-right">Avg Score</th>
                <th>Highlight</th>
              </tr>
            </thead>
            <tbody>
              {topProjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted" style={{ padding: "24px 16px" }}>
                    {loading ? "Loading…" : "No score data yet"}
                  </td>
                </tr>
              ) : (
                topProjects.map((p, i) => (
                  <tr key={p.id}>
                    <td className="mono text-center" style={{ fontWeight: 700, color: i === 0 ? "var(--accent)" : undefined }}>
                      {i + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {p.title}
                      {p.members && <><br /><span className="text-xs text-muted">{p.members}</span></>}
                    </td>
                    <td className="mono text-right" style={{ fontWeight: 700 }}>
                      {typeof p.totalAvg === "number" ? p.totalAvg.toFixed(1) : "—"}
                    </td>
                    <td className="text-xs text-muted">
                      {p.count != null ? `Scored by ${p.count} juror${p.count !== 1 ? "s" : ""}` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

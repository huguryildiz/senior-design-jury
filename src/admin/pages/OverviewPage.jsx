// src/admin/OverviewPage.jsx — Phase 2
// Prototype source: #page-overview (docs/concepts/vera-premium-prototype.html ~lines 11758–11982)
// Single-file overview page: KPIs, juror table, right stack, live feed, completion, charts, top projects.
import { useMemo, useState, useRef, useEffect } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { useAdminContext } from "../hooks/useAdminContext";
import useCardSelection from "@/shared/hooks/useCardSelection";
import JurorBadge from "../components/JurorBadge";
import JurorStatusPill from "../components/JurorStatusPill";
import { SubmissionTimelineChart } from "@/charts/SubmissionTimelineChart";
import { ScoreDistributionChart } from "@/charts/ScoreDistributionChart";
import { getProjectHighlight } from "../utils/scoreHelpers";
import {
  UsersLucideIcon,
  TriangleAlertIcon,
  CalendarRangeIcon,
  ActivityIcon,
  ClockIcon,
  ChartIcon,
  BarChart2Icon,
  TrophyIcon,
  CheckCircle2Icon,
  PencilIcon,
  StarIcon,
  PlayIcon,
  LockIcon,
  CheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@/shared/ui/Icons";
import { StudentNames } from "@/shared/ui/EntityMeta";
import "../../styles/pages/setup-wizard.css";

// ── Helpers ───────────────────────────────────────────────────

function relativeTime(ms) {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  const remMonths = Math.floor((days % 365) / 30);
  if (remMonths === 0) return `${years}y ago`;
  return `${years}y ${remMonths}mo ago`;
}

function jurorStatus(j) {
  if (j.finalSubmitted && !j.editEnabled) return "completed";
  if (j.editEnabled) return "editing";
  const done = j.completedProjects || 0;
  const total = j.totalProjects || 0;
  if (total > 0 && done >= total) return "ready_to_submit";
  if (done > 0) return "in_progress";
  return "not_started";
}

function barColor(pct, status) {
  if (status === "completed") return "var(--success)";
  if (status === "ready_to_submit") return "var(--accent)";
  if (pct > 0) return "var(--warning)";
  return "var(--surface-2)";
}

function completionFillColor(pct) {
  if (pct >= 70) return "var(--success)";
  if (pct >= 40) return "var(--warning)";
  return "var(--danger)";
}

function SortIcon({ colKey, sortKey, sortDir }) {
  if (sortKey !== colKey) {
    return <span className="sort-icon sort-icon-inactive">▲</span>;
  }
  return (
    <span className="sort-icon sort-icon-active">
      {sortDir === "asc" ? "▲" : "▼"}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────

export default function OverviewPage() {
  const {
    rawScores = [],
    summaryData = [],
    allJurors = [],
    selectedPeriod = null,
    criteriaConfig = [],
    frameworks = [],
    sortedPeriods = [],
    loading = false,
    onNavigate,
  } = useAdminContext();
  const topProjectsScopeRef = useCardSelection();
  const [jurorTableExpanded, setJurorTableExpanded] = useState(false);
  const [avgPopoverOpen, setAvgPopoverOpen] = useState(false);
  const [avgPopoverPos, setAvgPopoverPos] = useState({ top: 0, left: 0 });
  const avgIconRef = useRef(null);
  const avgPopoverRef = useRef(null);
  const [setupBannerDismissed, setSetupBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("setupBannerDismissed") === "true";
    } catch {
      return false;
    }
  });

  function openAvgPopover(e) {
    e.stopPropagation();
    if (avgPopoverOpen) { setAvgPopoverOpen(false); return; }
    const rect = avgIconRef.current?.getBoundingClientRect();
    if (rect) {
      const popoverWidth = 260;
      let left = rect.right - popoverWidth;
      if (left < 8) left = 8;
      if (left + popoverWidth > window.innerWidth - 8) left = window.innerWidth - popoverWidth - 8;
      setAvgPopoverPos({ top: rect.bottom + 6, left });
    }
    setAvgPopoverOpen(true);
  }

  useEffect(() => {
    if (!avgPopoverOpen) return;
    function handleClick(e) {
      if (
        avgPopoverRef.current && !avgPopoverRef.current.contains(e.target) &&
        avgIconRef.current && !avgIconRef.current.contains(e.target)
      ) {
        setAvgPopoverOpen(false);
      }
    }
    const close = () => setAvgPopoverOpen(false);
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [avgPopoverOpen]);

  // ── KPIs ──────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalJ = allJurors.length;
    const completed = allJurors.filter((j) => j.finalSubmitted && !j.editEnabled).length;
    const editing = allJurors.filter((j) => j.editEnabled).length;
    const readyToSubmit = allJurors.filter((j) => {
      if (j.finalSubmitted || j.editEnabled) return false;
      const done = j.completedProjects || 0;
      const total = j.totalProjects || 0;
      return total > 0 && done >= total;
    }).length;
    const inProg = allJurors.filter((j) => {
      if (j.finalSubmitted || j.editEnabled) return false;
      const done = j.completedProjects || 0;
      const total = j.totalProjects || 0;
      return done > 0 && done < total;
    }).length;
    const notStarted = allJurors.filter((j) => !j.finalSubmitted && !j.editEnabled && !(j.completedProjects > 0)).length;
    const pct = totalJ > 0 ? Math.round((completed / totalJ) * 100) : 0;
    const completedJurorIds = new Set(
      allJurors.filter((j) => j.finalSubmitted && !j.editEnabled).map((j) => j.jurorId)
    );
    const completedScores = rawScores.filter(
      (r) => r.total != null && completedJurorIds.has(r.jurorId)
    );
    const avg =
      completedScores.length > 0
        ? (completedScores.reduce((s, r) => s + r.total, 0) / completedScores.length).toFixed(1)
        : null;
    return { totalJ, completed, editing, readyToSubmit, inProg, notStarted, pct, avg };
  }, [allJurors, rawScores]);

  // ── Setup progress steps ──────────────────────────────────────
  const setupSteps = useMemo(() => [
    { id: "period", label: "Evaluation Period", done: (sortedPeriods?.length || 0) > 0 },
    { id: "criteria", label: "Evaluation Criteria", done: (criteriaConfig?.length || 0) > 0 },
    { id: "outcomes", label: "Accreditation Framework", done: (frameworks?.length || 0) > 0 },
    { id: "jurors", label: "Add Jurors", done: (allJurors?.length || 0) > 0 },
    { id: "projects", label: "Import Projects", done: (summaryData?.length || 0) > 0 },
    { id: "token", label: "Entry Token", done: false }, // TODO: implement
    { id: "launch", label: "Launch", done: false }, // all above
  ], [sortedPeriods?.length, summaryData?.length, criteriaConfig?.length, frameworks?.length, allJurors?.length]);

  const completedSteps = useMemo(() => setupSteps.filter((s) => s.done).length, [setupSteps]);
  const setupProgress = Math.round((completedSteps / setupSteps.length) * 100);
  const setupIncomplete = completedSteps < setupSteps.length;

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

  // ── Juror table sort ──────────────────────────────────────────
  const [tableSort, setTableSort] = useState({ col: "active", dir: "desc" });

  const STATUS_ORDER = { completed: 0, editing: 1, ready_to_submit: 2, in_progress: 3, not_started: 4 };

  function toggleSort(col) {
    setTableSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === "desc" ? "asc" : "desc" } : { col, dir: "desc" }
    );
  }

  // ── Juror table rows ──────────────────────────────────────────
  const sortedJurors = useMemo(() => {
    const { col, dir } = tableSort;
    const mult = dir === "asc" ? 1 : -1;
    return [...allJurors].sort((a, b) => {
      if (col === "name")     return mult * (a.juryName || "").localeCompare(b.juryName || "");
      if (col === "status")   return mult * ((STATUS_ORDER[jurorStatus(a)] ?? 9) - (STATUS_ORDER[jurorStatus(b)] ?? 9));
      if (col === "progress") return mult * ((a.completedProjects || 0) - (b.completedProjects || 0));
      if (col === "avg")      return mult * ((parseFloat(jurorAvgMap.get(a.jurorId)) || 0) - (parseFloat(jurorAvgMap.get(b.jurorId)) || 0));
      if (col === "active")   return mult * ((a.lastSeenMs || 0) - (b.lastSeenMs || 0));
      return 0;
    });
  }, [allJurors, tableSort, jurorAvgMap]);

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

  // ── Live feed (most recently active first) ────────────────────
  const recentActivity = useMemo(
    () =>
      [...allJurors]
        .sort((a, b) => (b.lastSeenMs || 0) - (a.lastSeenMs || 0))
        .slice(0, 7),
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
  // types: "critical" (red) | "warn" (yellow) | "ready" (blue) | "editing" (purple) | "ok" (green)
  const attentionItems = useMemo(() => {
    const items = [];
    if (kpi.notStarted > 0) {
      const n = kpi.notStarted;
      items.push({ type: "critical", text: `${n} juror${n > 1 ? "s haven't" : " hasn't"} started scoring yet` });
    }
    if (kpi.editing > 0) {
      const n = kpi.editing;
      items.push({ type: "editing", text: `${n} juror${n > 1 ? "s are" : " is"} editing a submitted evaluation` });
    }
    if (kpi.readyToSubmit > 0) {
      const n = kpi.readyToSubmit;
      items.push({ type: "ready", text: `${n} juror${n > 1 ? "s have" : " has"} scored all projects but haven't submitted yet` });
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
    <>
    <div className="admin-page" id="page-overview">

      {/* Setup Progress Banner */}
      {setupIncomplete && !setupBannerDismissed && (
        <div className="sw-progress-banner">
          <div className="sw-banner-top">
            <div className="sw-banner-title">
              Setup Progress: {completedSteps} of {setupSteps.length} steps
            </div>
            <button
              className="sw-banner-dismiss"
              onClick={() => {
                try {
                  sessionStorage.setItem("setupBannerDismissed", "true");
                } catch {}
                setSetupBannerDismissed(true);
              }}
              aria-label="Dismiss for now"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
          <div className="sw-progress-bar">
            <div className="sw-progress-fill" style={{ width: `${setupProgress}%` }} />
          </div>
          <div className="sw-checklist">
            {setupSteps.map((step) => (
              <div key={step.id} className={`sw-check-item ${step.done ? "done" : "pending"}`}>
                {step.done ? (
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                ) : (
                  <Circle size={16} strokeWidth={1.5} />
                )}
                <span>{step.label}</span>
              </div>
            ))}
          </div>
          <div className="sw-banner-bottom">
            <div className="sw-next-action">
              {!setupSteps[0].done && "Next: Create an evaluation period"}
              {setupSteps[0].done && !setupSteps[1].done && "Next: Define evaluation criteria"}
              {setupSteps[0].done && setupSteps[1].done && !setupSteps[3].done && "Next: Add jurors"}
              {setupSteps[0].done && setupSteps[1].done && setupSteps[3].done && "Next: Import projects"}
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate?.("setup")}
            >
              Continue Setup
            </button>
          </div>
        </div>
      )}

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
          <div className="kpi-sub" style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px" }}>
            <span style={{ color: "var(--success)" }}>{kpi.completed} completed</span>
            {kpi.editing > 0 && <span style={{ color: "#8b5cf6" }}>{kpi.editing} editing</span>}
            {kpi.readyToSubmit > 0 && <span style={{ color: "var(--accent)" }}>{kpi.readyToSubmit} ready to submit</span>}
            {kpi.inProg > 0 && <span style={{ color: "var(--warning)" }}>{kpi.inProg} in progress</span>}
            {kpi.notStarted > 0 && <span style={{ color: "var(--text-secondary)" }}>{kpi.notStarted} not started</span>}
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Projects / Groups</div>
          <div className="kpi-value">{summaryData.length || "—"}</div>
          <div className="kpi-sub">{selectedPeriod?.name || selectedPeriod?.semester_name || "—"}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Completion</div>
          <div className="kpi-value">{kpi.totalJ > 0 ? `${kpi.pct}%` : "—"}</div>
          <div className="kpi-sub">{kpi.completed} of {kpi.totalJ} completed</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Average Score</div>
          <div className="kpi-value">{kpi.avg ?? "—"}</div>
          <div className="kpi-sub">of 100 · completed jurors only</div>
        </div>
      </div>

      {/* Jury Activity + Needs Attention */}
      <div className="grid-2" style={{ marginBottom: 20 }}>

        {/* Juror table */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="card-title">
              <UsersLucideIcon size={14} style={{ verticalAlign: "-1px", marginRight: 6, color: "var(--accent)" }} />
              Live Jury Activity
            </div>
            <span className="text-xs text-muted">
              {jurorTableExpanded ? kpi.totalJ : Math.min(5, kpi.totalJ)} of {kpi.totalJ} jurors shown
            </span>
          </div>

          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table id="overview-juror-table" className={`table-standard table-pill-balance${jurorTableExpanded ? " expanded" : ""}`}>
              <thead>
                <tr>
                  {[
                    { col: "name",     label: "Juror",    cls: "" },
                    { col: "status",   label: "Status",   cls: "" },
                    { col: "progress", label: "Progress", cls: "text-center" },
                    { col: "avg",      label: "Avg",      cls: "text-right" },
                    { col: "active",   label: "Active",   cls: "text-right" },
                  ].map(({ col, label, cls }) => (
                    <th
                      key={col}
                      className={`${cls ? `${cls} ` : ""}sortable${tableSort.col === col ? " sorted" : ""}`}
                      onClick={() => toggleSort(col)}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {label} <SortIcon colKey={col} sortKey={tableSort.col} sortDir={tableSort.dir} />
                    </th>
                  ))}
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
                      <td><JurorStatusPill status={status} /></td>
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
                      <td className="text-right vera-datetime-text">{relativeTime(j.lastSeenMs)}</td>
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
                  <>View fewer jurors <ChevronUpIcon size={10} style={{ verticalAlign: "-1px", marginLeft: 2 }} /></>
                ) : (
                  <>View all {kpi.totalJ} jurors <ChevronDownIcon size={10} style={{ verticalAlign: "-1px", marginLeft: 2 }} /></>
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
                <TriangleAlertIcon size={14} style={{ verticalAlign: "-1px", marginRight: 6, color: "var(--accent)" }} />
                Needs Attention
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {attentionItems.map((item, i) => {
                const bulletColor =
                  item.type === "ok"       ? "var(--success)" :
                  item.type === "editing"  ? "#8b5cf6" :
                  item.type === "ready"    ? "var(--accent)" :
                  item.type === "critical" ? "var(--danger, #ef4444)" :
                                             "var(--warning)";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12 }}>
                    <span style={{ color: bulletColor, fontSize: 14, lineHeight: 1, flexShrink: 0 }}>●</span>
                    <span>{item.text}</span>
                  </div>
                );
              })}
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
                <CalendarRangeIcon size={14} style={{ verticalAlign: "-1px", marginRight: 6, color: "var(--accent)" }} />
                Period Snapshot
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
              <div className="text-muted">Period</div>
              <div style={{ fontWeight: 500 }}>{selectedPeriod?.name || selectedPeriod?.semester_name || "—"}</div>
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
                    <LockIcon size={10} className="badge-ico" />
                    Locked
                  </span>
                ) : selectedPeriod ? (
                  <span className="badge badge-success" style={{ fontSize: 10 }}>
                    <CheckIcon size={10} className="badge-ico" />
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
              <ActivityIcon size={14} style={{ verticalAlign: "-1px", marginRight: 6, color: "var(--accent)" }} />
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
                const iconType =
                  status === "completed"        ? "done"  :
                  status === "editing"          ? "edit"  :
                  status === "ready_to_submit"  ? "score" :
                  status === "in_progress"      ? "score" :
                                                  "start";
                const feedText =
                  status === "completed"        ? "completed all evaluations" :
                  status === "editing"          ? "is editing a submitted evaluation" :
                  status === "ready_to_submit"  ? "scored all projects — awaiting submission" :
                  status === "in_progress"      ? `scored ${j.completedProjects} of ${j.totalProjects} projects` :
                                                  "hasn't started scoring yet";
                return (
                  <div className="live-feed-item" key={j.jurorId || j.juryName}>
                    <div className={`live-feed-icon ${iconType}`} aria-hidden="true">
                      {iconType === "done"  ? <CheckCircle2Icon size={14} /> :
                       iconType === "edit"  ? <PencilIcon size={14} /> :
                       iconType === "score" ? <StarIcon size={14} /> :
                                              <PlayIcon size={14} />}
                    </div>
                    <div className="live-feed-main">
                      <div className="live-feed-text">
                        <strong>{j.juryName}</strong>{" "}{feedText}
                      </div>
                      <div className="live-feed-time vera-datetime-text">{j.lastSeenMs ? relativeTime(j.lastSeenMs) : "Never seen"}</div>
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
              <ClockIcon size={14} style={{ verticalAlign: "-1px", marginRight: 6, color: "var(--accent)" }} />
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
              <ChartIcon size={14} style={{ verticalAlign: "-1px", marginRight: 6, color: "var(--accent)" }} />
              Submission Timeline
            </div>
          </div>
          <SubmissionTimelineChart allJurors={allJurors} />
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>Final submissions by hour — current period</div>
        </div>
        <div className="card chart-card">
          <div className="card-header">
            <div className="card-title">
              <BarChart2Icon size={14} style={{ verticalAlign: "-1px", marginRight: 6, color: "var(--accent)" }} />
              Score Distribution
            </div>
          </div>
          <ScoreDistributionChart rawScores={rawScores} />
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>Score range distribution — one data point per juror × project pair</div>
        </div>
      </div>

      {/* Top Projects */}
      <div className="card overview-top-projects-card">
        <div className="card-header">
          <div className="card-title">
            <TrophyIcon size={14} style={{ verticalAlign: "-1px", marginRight: 6, color: "var(--accent)" }} />
            Top Projects
          </div>
          <a className="form-link text-xs" style={{ cursor: "pointer" }} onClick={() => onNavigate?.("scores")}>
            Open rankings →
          </a>
        </div>
        <div className="table-wrap overview-top-projects-wrap" style={{ border: "none" }}>
          <table className="overview-top-projects-table table-standard table-pill-balance">
            <thead>
              <tr>
                <th style={{ width: 32 }}>#</th>
                <th>Project</th>
                <th className="text-right">
                  <div className="col-info" style={{ justifyContent: "flex-end" }}>
                    Avg Score
                    <span ref={avgIconRef} className="col-info-icon" onClick={openAvgPopover}>?</span>
                  </div>
                </th>
                <th>Highlight</th>
              </tr>
            </thead>
            <tbody ref={topProjectsScopeRef}>
              {topProjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted" style={{ padding: "24px 16px" }}>
                    {loading ? "Loading…" : "No score data yet"}
                  </td>
                </tr>
              ) : (
                topProjects.map((p, i) => (
                  <tr key={p.id} data-card-selectable="">
                    <td className="mono text-center" style={{ fontWeight: 700, color: i === 0 ? "var(--accent)" : undefined }}>
                      <span className="overview-top-rank">{i + 1}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {p.title}
                      {p.members && (
                        <>
                          <br />
                          <StudentNames names={p.members} />
                        </>
                      )}
                    </td>
                    <td className="mono text-right" style={{ fontWeight: 700 }}>
                      <span className="overview-top-avg">{typeof p.totalAvg === "number" ? p.totalAvg.toFixed(1) : "—"}</span>
                    </td>
                    <td className="text-xs text-muted overview-top-highlight">
                      {getProjectHighlight(p, criteriaConfig) ?? (p.count != null ? `Scored by ${p.count} juror${p.count !== 1 ? "s" : ""}` : "—")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>

    {avgPopoverOpen && (
      <div
        ref={avgPopoverRef}
        className="col-info-popover show"
        style={{ position: "fixed", top: avgPopoverPos.top, left: avgPopoverPos.left, zIndex: 9999 }}
      >
        <h5>Average Score</h5>
        <p>Calculated from <strong>completed jurors only</strong> — jurors who have submitted their final evaluation.</p>
        <p style={{ marginTop: 8, fontSize: 10, color: "var(--text-tertiary)" }}>
          In-progress and editing evaluations are excluded to ensure score integrity.
        </p>
      </div>
    )}
    </>
  );
}

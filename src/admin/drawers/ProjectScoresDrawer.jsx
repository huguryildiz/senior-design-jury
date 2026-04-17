// src/admin/drawers/ProjectScoresDrawer.jsx
// Read-only drawer showing a single project's jury scores:
// KPI strip, per-criterion averages, juror breakdown, feedback.
//
// Props:
//   open          — boolean
//   onClose       — () => void
//   project       — { id, title, advisor, members[], group_no }
//   periodId      — string
//   periodLabel   — string
//   rawScores     — all score_sheets for the period (from useAdminContext)
//   summaryData   — per-project aggregates (from useAdminContext)
//   allJurors     — period juror summaries (from useAdminContext)
//   onOpenReviews — () => void (navigate to Reviews page scoped to this project)

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, X, ArrowRight, FileText, AlertTriangle } from "lucide-react";
import Drawer from "@/shared/ui/Drawer";
import { TeamMembersInline } from "@/shared/ui/EntityMeta";
import JurorBadge from "@/admin/components/JurorBadge";
import JurorStatusPill from "@/admin/components/JurorStatusPill";
import { listPeriodCriteria } from "@/shared/api";
import { CRITERION_COLORS } from "@/admin/criteria/criteriaFormHelpers";
import { jurorInitials, jurorAvatarBg, jurorAvatarFg } from "@/admin/utils/jurorIdentity";

function bandFor(pct) {
  if (pct >= 85) return { key: "excel", label: "Excellent" };
  if (pct >= 70) return { key: "good", label: "Good" };
  if (pct >= 55) return { key: "fair", label: "Fair" };
  return { key: "poor", label: "Poor" };
}

function stdDev(nums) {
  if (!nums.length) return null;
  const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
  const variance = nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function CritBar({ label, color, val, maxScore }) {
  const pct = val != null && maxScore > 0 ? Math.min(100, (val / maxScore) * 100) : 0;
  return (
    <div className="jsd-crit-bar-row">
      <div className="jsd-crit-bar-label">{label}</div>
      <div className="jsd-bar-track">
        {val != null && (
          <div className="jsd-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
        )}
      </div>
      <div className="jsd-crit-bar-score">
        {val != null ? (
          <>
            <span className="jsd-score-val" style={{ color }}>{val}</span>
            <span className="jsd-score-max">/{maxScore}</span>
          </>
        ) : (
          <span className="jsd-score-empty">—</span>
        )}
      </div>
    </div>
  );
}

export default function ProjectScoresDrawer({
  open,
  onClose,
  project,
  periodId,
  periodLabel,
  rawScores = [],
  summaryData = [],
  allJurors = [],
  onOpenReviews,
}) {
  const [criteria, setCriteria] = useState([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!open || !periodId) return undefined;
    setLoadingCriteria(true);
    listPeriodCriteria(periodId)
      .then((rows) => { if (!cancelled) setCriteria(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (!cancelled) setCriteria([]); })
      .finally(() => { if (!cancelled) setLoadingCriteria(false); });
    return () => { cancelled = true; };
  }, [open, periodId]);

  const projectId = project?.id || null;

  const criteriaWithColor = useMemo(() =>
    criteria.map((c, i) => ({
      ...c,
      resolvedColor: c.color || CRITERION_COLORS[i % CRITERION_COLORS.length],
    })),
    [criteria]
  );

  const memberList = useMemo(() => {
    const m = project?.members;
    if (!m) return [];
    if (Array.isArray(m)) {
      return m
        .map((x) => (typeof x === "string" ? x : x?.name || ""))
        .map((s) => String(s).trim())
        .filter(Boolean);
    }
    if (typeof m === "string") return m.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    return [];
  }, [project]);

  // Score sheets for this project
  const sheets = useMemo(() => {
    if (!projectId) return [];
    return rawScores.filter((r) => (r.projectId || r.project_id) === projectId);
  }, [rawScores, projectId]);

  const submittedSheets = useMemo(
    () => sheets.filter((s) => s.status === "submitted"),
    [sheets]
  );

  // Final score, std dev, rank
  const finalScore = useMemo(() => {
    const totals = submittedSheets.map((s) => Number(s.total)).filter(Number.isFinite);
    if (!totals.length) return null;
    return totals.reduce((s, v) => s + v, 0) / totals.length;
  }, [submittedSheets]);

  const sigma = useMemo(() => {
    const totals = submittedSheets.map((s) => Number(s.total)).filter(Number.isFinite);
    return stdDev(totals);
  }, [submittedSheets]);

  const rank = useMemo(() => {
    if (!Array.isArray(summaryData) || !summaryData.length || !projectId) return null;
    const sorted = [...summaryData]
      .filter((r) => Number.isFinite(Number(r.totalAvg)))
      .sort((a, b) => Number(b.totalAvg) - Number(a.totalAvg));
    const idx = sorted.findIndex((r) => r.id === projectId);
    return idx >= 0 ? { rank: idx + 1, total: sorted.length } : null;
  }, [summaryData, projectId]);

  const overallAvg = useMemo(() => {
    if (!Array.isArray(summaryData) || !summaryData.length) return null;
    const vals = summaryData.map((r) => Number(r.totalAvg)).filter(Number.isFinite);
    if (!vals.length) return null;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }, [summaryData]);

  // Per-criterion averages (submitted only)
  const criteriaRows = useMemo(() => {
    if (!criteria.length || !submittedSheets.length) return [];
    return criteria.map((c) => {
      const key = c.key;
      const maxScore = Number(c.max_score) || 20;
      const vals = submittedSheets
        .map((s) => Number(s[key]))
        .filter(Number.isFinite);
      const mean = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
      const pct = mean != null ? (mean / maxScore) * 100 : null;
      const band = pct != null ? bandFor(pct) : null;
      return {
        key,
        label: c.label || c.key,
        group: c.group || null,
        maxScore,
        mean,
        pct,
        band,
      };
    });
  }, [criteria, submittedSheets]);

  // Juror rows
  const jurorRows = useMemo(() => {
    // Group sheets by juror
    const byJuror = new Map();
    for (const s of sheets) {
      const jid = s.jurorId || s.juror_id;
      if (!jid) continue;
      byJuror.set(jid, s);
    }
    const rows = [];
    // Mean/sigma for outlier detection
    const totals = submittedSheets.map((s) => Number(s.total)).filter(Number.isFinite);
    const mean = totals.length ? totals.reduce((s, v) => s + v, 0) / totals.length : 0;
    const sd = stdDev(totals) || 0;
    for (const [jid, s] of byJuror) {
      const total = Number(s.total);
      const isOutlier =
        s.status === "submitted" &&
        sd > 0 &&
        Number.isFinite(total) &&
        Math.abs(total - mean) > 1.5 * sd;
      rows.push({
        jurorId: jid,
        name: s.juryName || s.jury_name || "Unknown juror",
        affiliation: s.affiliation || "",
        status: s.status || "draft",
        total: Number.isFinite(total) ? total : null,
        comments: (s.comments || "").trim(),
        outlier: isOutlier,
        updatedAt: s.updatedAt || s.updated_at || null,
        sheet: s,
      });
    }
    rows.sort((a, b) => {
      if (a.status !== b.status) return a.status === "submitted" ? -1 : 1;
      return (b.total ?? -1) - (a.total ?? -1);
    });
    return rows;
  }, [sheets, submittedSheets]);

  const feedbackRows = jurorRows.filter((j) => j.comments);

  const assignedCount = useMemo(() => {
    // Prefer distinct jurors with any sheet for this project;
    // fall back to all period jurors if sheets are sparse.
    if (jurorRows.length) return jurorRows.length;
    return Array.isArray(allJurors) ? allJurors.length : 0;
  }, [jurorRows, allJurors]);

  const submittedCount = submittedSheets.length;

  const deltaVsAvg = finalScore != null && overallAvg != null
    ? finalScore - overallAvg
    : null;

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="fs-drawer-header">
        <div className="fs-drawer-header-row">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
            <div className="fs-icon identity">
              <ClipboardList size={17} strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="fs-title-eyebrow">Project Scores</div>
              <div className="fs-title" style={{ lineHeight: 1.25 }}>
                {project?.title || "Untitled project"}
              </div>
              {periodLabel && (
                <div className="psd-submeta">
                  <span className="psd-period-pill">{periodLabel}</span>
                </div>
              )}
              {memberList.length > 0 && (
                <div className="psd-members-row">
                  <TeamMembersInline names={memberList} />
                </div>
              )}
            </div>
          </div>
          <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="fs-drawer-body psd-body">
        {/* KPI strip */}
        <div className="psd-kpi-row">
          <div className="psd-kpi">
            <div className="psd-kpi-label">Final Score</div>
            <div className="psd-kpi-value psd-kpi-value--accent">
              {finalScore != null ? finalScore.toFixed(1) : "—"}
            </div>
            <div className={`psd-kpi-delta ${deltaVsAvg != null && deltaVsAvg >= 0 ? "up" : deltaVsAvg != null ? "down" : ""}`}>
              {deltaVsAvg != null
                ? `${deltaVsAvg >= 0 ? "▲" : "▼"} ${Math.abs(deltaVsAvg).toFixed(1)} vs avg`
                : "no data"}
            </div>
          </div>
          <div className="psd-kpi">
            <div className="psd-kpi-label">Submitted</div>
            <div className="psd-kpi-value">
              {submittedCount}
              <span className="psd-kpi-denom">/{assignedCount || "—"}</span>
            </div>
            <div className="psd-kpi-delta">
              {jurorRows.length - submittedCount > 0
                ? `${jurorRows.length - submittedCount} in progress`
                : "complete"}
            </div>
          </div>
          <div className="psd-kpi">
            <div className="psd-kpi-label">Std Dev</div>
            <div className="psd-kpi-value">
              {sigma != null ? sigma.toFixed(1) : "—"}
            </div>
            <div className="psd-kpi-delta">
              {sigma == null ? "—" : sigma < 3 ? "Low variance" : sigma < 6 ? "Moderate" : "High variance"}
            </div>
          </div>
          <div className="psd-kpi">
            <div className="psd-kpi-label">Rank</div>
            <div className="psd-kpi-value">
              {rank ? `#${rank.rank}` : "—"}
              {rank && <span className="psd-kpi-denom">/{rank.total}</span>}
            </div>
            <div className={`psd-kpi-delta ${rank && rank.rank / rank.total <= 0.25 ? "up" : ""}`}>
              {rank ? `Top ${Math.max(1, Math.round((rank.rank / rank.total) * 100))}%` : "—"}
            </div>
          </div>
        </div>

        {/* Criterion averages */}
        <div className="psd-sec">
          <div className="psd-sec-head">
            <div className="psd-sec-title">Criterion Averages</div>
            <div className="psd-sec-hint">
              across {submittedCount} submitted review{submittedCount !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="psd-crit-card">
            {loadingCriteria && (
              <div className="psd-empty">Loading criteria…</div>
            )}
            {!loadingCriteria && criteriaRows.length === 0 && (
              <div className="psd-empty">No submitted scores yet.</div>
            )}
            {!loadingCriteria && criteriaRows.map((c) => (
              <div key={c.key} className="psd-crit-row">
                <div className="psd-crit-name-wrap">
                  <div className="psd-crit-name">{c.label}</div>
                  {c.group && <div className="psd-crit-group">{c.group}</div>}
                </div>
                <div className="psd-bar-track">
                  <div
                    className={`psd-bar-fill ${c.band?.key === "excel" ? "good" : c.band?.key === "fair" || c.band?.key === "poor" ? "warn" : ""}`}
                    style={{ width: `${Math.max(0, Math.min(100, c.pct ?? 0))}%` }}
                  />
                </div>
                <div className="psd-crit-score">
                  {c.mean != null ? c.mean.toFixed(1) : "—"}
                </div>
                {c.band ? (
                  <div className={`psd-crit-band ${c.band.key}`}>{c.band.label}</div>
                ) : (
                  <div className="psd-crit-band muted">—</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Juror breakdown */}
        <div className="psd-sec">
          <div className="psd-sec-head">
            <div className="psd-sec-title">Juror Breakdown</div>
            <div className="psd-sec-hint">
              {jurorRows.length} juror{jurorRows.length !== 1 ? "s" : ""}
            </div>
          </div>
          {jurorRows.length === 0 ? (
            <div className="psd-empty psd-empty-card">No juror activity yet.</div>
          ) : (
            jurorRows.map((j) => (
              <div key={j.jurorId} className="psd-juror-row jsd-proj-row">
                <div className="jsd-group">
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: jurorAvatarBg(j.name), color: jurorAvatarFg(j.name),
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 700, letterSpacing: "-0.3px", flexShrink: 0, lineHeight: 1,
                    }}
                  >
                    {jurorInitials(j.name)}
                  </div>
                </div>
                <div className="jsd-proj-content">
                  <div className="jsd-proj-header">
                    <div className="jsd-proj-name">
                      {j.name}
                      {j.affiliation && (
                        <span style={{ color: "var(--text-tertiary)", fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                          {j.affiliation}
                        </span>
                      )}
                    </div>
                    <div className="jsd-proj-right">
                      <JurorStatusPill status={j.status === "submitted" ? "completed" : "in_progress"} />
                      {j.outlier && (
                        <span className="psd-tag outlier">
                          <AlertTriangle size={10} strokeWidth={2.4} />
                          Outlier
                        </span>
                      )}
                      <span className={`jsd-total-score ${j.total == null ? "muted" : ""}`}>
                        {j.total != null ? j.total.toFixed(1) : "—"}
                      </span>
                    </div>
                  </div>
                  {j.sheet && criteriaWithColor.length > 0 && (
                    <div className="jsd-crit-bars">
                      {criteriaWithColor.map((c) => (
                        <CritBar
                          key={c.key}
                          label={c.label}
                          color={c.resolvedColor}
                          val={j.sheet?.[c.key] ?? null}
                          maxScore={Number(c.max_score) || 20}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Feedback */}
        {feedbackRows.length > 0 && (
          <div className="psd-sec">
            <div className="psd-sec-head">
              <div className="psd-sec-title">Juror Feedback</div>
              <div className="psd-sec-hint">
                {feedbackRows.length} comment{feedbackRows.length !== 1 ? "s" : ""}
              </div>
            </div>
            {feedbackRows.map((j) => (
              <div key={j.jurorId} className="psd-fb">
                <div className="psd-fb-head">
                  <JurorBadge name={j.name} affiliation={j.affiliation} size="sm" nameOnly />
                </div>
                <p className="psd-fb-text">{j.comments}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fs-drawer-footer">
        <button className="fs-btn fs-btn-secondary" type="button" onClick={onClose}>
          Close
        </button>
        <button
          className="fs-btn fs-btn-primary"
          type="button"
          onClick={() => {
            onClose?.();
            onOpenReviews?.(project);
          }}
          disabled={!onOpenReviews}
        >
          <FileText size={13} strokeWidth={2} />
          Open in Reviews
          <ArrowRight size={13} strokeWidth={2} />
        </button>
      </div>
    </Drawer>
  );
}

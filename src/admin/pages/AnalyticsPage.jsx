// src/admin/AnalyticsPage.jsx
// Full Analytics page — Programme Outcome Analytics.
// Wired to props from ScoresTab (data flows from useAdminData).

import { useState, useRef, useEffect } from "react";
import { useAdminContext } from "../hooks/useAdminContext";
import { useAnalyticsData } from "../hooks/useAnalyticsData";
import { outcomeValues } from "@/shared/stats";
import { writeAuditLog } from "@/shared/api";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import SendReportModal from "@/admin/modals/SendReportModal";
import { buildExportFilename } from "../utils/exportXLSX";
import { OutcomeByGroupChart } from "@/charts/OutcomeByGroupChart";
import { RubricAchievementChart, BAND_COLORS } from "@/charts/RubricAchievementChart";
import { ProgrammeAveragesChart } from "@/charts/ProgrammeAveragesChart";
import { OutcomeAttainmentHeatmap } from "@/charts/OutcomeAttainmentHeatmap";
import { buildOutcomeAttainmentTrendDataset } from "../analytics/analyticsDatasets";
import { AttainmentRateChart } from "@/charts/AttainmentRateChart";
import { ThresholdGapChart } from "@/charts/ThresholdGapChart";
import { GroupAttainmentHeatmap } from "@/charts/GroupAttainmentHeatmap";
import { JurorConsistencyHeatmap } from "@/charts/JurorConsistencyHeatmap";
import { CoverageMatrix } from "@/charts/CoverageMatrix";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import "../../styles/pages/analytics.css";

// ── Insight icon ──────────────────────────────────────────────
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

// ── Download icon ─────────────────────────────────────────────
function DownloadIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ── Attainment card computation ────────────────────────────────
// Returns one card per unique MÜDEK outcome code across all criteria.
// deltaRows: [{periodId, criteriaAvgs}] for exactly [currentPeriod, prevPeriod].
// delta is change in avg score % vs the immediately preceding period.
function buildAttainmentCards(submittedData, criteria = [], deltaRows = [], threshold = 70) {
  const rows = submittedData || [];
  // outcomeCode → { criterionId (= criterion key), max }
  const outcomeMap = new Map();
  for (const c of criteria) {
    for (const code of (c.outcomes || [])) {
      if (!outcomeMap.has(code)) {
        outcomeMap.set(code, { criterionId: c.id, max: c.max });
      }
    }
  }

  const [currentTrend, prevTrend] = deltaRows;

  const OUTCOME_LABELS = {
    "1.2": "Knowledge Application",
    "2":   "Problem Analysis",
    "3.1": "Creative Solutions",
    "3.2": "Realistic Design",
    "8.1": "Intra-disciplinary Teams",
    "8.2": "Multi-disciplinary Teams",
    "9.1": "Oral Communication",
    "9.2": "Written Communication",
  };

  const cards = [];
  for (const [code, { criterionId, max }] of outcomeMap) {
    const vals = outcomeValues(rows, criterionId);
    let attRate = null;
    if (vals.length) {
      const above = vals.filter((v) => (v / max) * 100 >= threshold).length;
      attRate = Math.round((above / vals.length) * 100);
    }

    const statusClass =
      attRate == null ? "status-no-data" :
      attRate >= threshold ? "status-met" :
      attRate >= 60 ? "status-borderline" :
      "status-not-met";

    const statusLabel =
      attRate == null ? "No data" :
      attRate >= threshold ? "Met" :
      attRate >= 60 ? "Borderline" :
      "Not Met";

    const statusPrefix =
      attRate == null ? "" :
      attRate >= threshold ? "✓ " :
      attRate >= 60 ? "∼ " :
      "✗ ";

    // Delta: change in average score % vs previous period.
    let delta = null;
    if (currentTrend && prevTrend && max > 0) {
      const curAvg = currentTrend.criteriaAvgs?.[criterionId];
      const prevAvg = prevTrend.criteriaAvgs?.[criterionId];
      if (curAvg != null && prevAvg != null) {
        delta = Math.round(((curAvg - prevAvg) / max) * 100);
      }
    }

    cards.push({
      code,
      label: OUTCOME_LABELS[code] ?? code,
      attRate,
      statusClass,
      statusLabel,
      statusPrefix,
      delta,
    });
  }

  // Sort: met first, then borderline, then not-met, then no-data; within group by attRate desc
  const ORDER = { "status-met": 0, "status-borderline": 1, "status-not-met": 2, "status-no-data": 3 };
  cards.sort((a, b) => {
    const od = ORDER[a.statusClass] - ORDER[b.statusClass];
    if (od !== 0) return od;
    return (b.attRate ?? -1) - (a.attRate ?? -1);
  });

  return cards;
}



// ── Analytics Nav ─────────────────────────────────────────────
function AnalyticsNav({ activeSection }) {
  const items = [
    { id: "ans-attainment", label: "Attainment Status" },
    { id: "ans-analysis",   label: "Analysis" },
    { id: "ans-overview",   label: "Programme Overview" },
    { id: "ans-trends",     label: "Trends" },
    { id: "ans-reliability",label: "Reliability" },
    { id: "ans-coverage",   label: "Coverage" },
  ];

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="analytics-nav" aria-label="Analytics sections">
      {items.map(({ id, label }) => (
        <button
          key={id}
          className={`analytics-nav-item${activeSection === id ? " active" : ""}`}
          onClick={() => scrollTo(id)}
          type="button"
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

// ── Export Panel ──────────────────────────────────────────────
const ANALYTICS_EXPORT_FORMATS = [
  { id: "xlsx", iconLabel: "XLS", label: "Excel (.xlsx)", desc: "Outcome cards, charts, and summary tables", hint: "Best for sharing" },
  { id: "csv",  iconLabel: "CSV", label: "CSV (.csv)",    desc: "Raw analytics datapoints for external analysis", hint: "Best for analysis" },
  { id: "pdf",  iconLabel: "PDF", label: "PDF Report",    desc: "Formatted outcome attainment report", hint: "Best for archival" },
];

function ExportPanel({ onClose, onExport, periodName, organization, department, generateFile }) {
  const [format, setFormat] = useState("xlsx");
  const [sendOpen, setSendOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const _toast = useToast();

  async function handleDownload() {
    setExporting(true);
    try {
      await onExport(format);
    } finally {
      setExporting(false);
    }
  }
  const meta = ANALYTICS_EXPORT_FORMATS.find((f) => f.id === format) || ANALYTICS_EXPORT_FORMATS[0];
  return (
    <>
      <div className="export-panel show" role="region" aria-label="Export analytics">
        <div className="export-panel-header">
          <div>
            <h4><DownloadIcon /> Export Analytics</h4>
            <div className="export-panel-sub">Download outcome attainment data, charts, and trend analysis.</div>
          </div>
          <button className="export-panel-close" onClick={onClose} aria-label="Close export panel">&#215;</button>
        </div>
        <div className="export-options">
          {ANALYTICS_EXPORT_FORMATS.map((fmt) => (
            <div
              key={fmt.id}
              className={`export-option${format === fmt.id ? " selected" : ""}${fmt.disabled ? " disabled" : ""}`}
              onClick={() => { if (!fmt.disabled) setFormat(fmt.id); }}
              style={fmt.disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            >
              {format === fmt.id && <span className="export-option-selected-pill">Selected</span>}
              <div className={`export-option-icon export-option-icon--${fmt.id}`}>
                <span className="file-icon"><span className="file-icon-label">{fmt.iconLabel}</span></span>
              </div>
              <div className="export-option-title">{fmt.label}</div>
              <div className="export-option-desc">{fmt.desc}</div>
              <div className="export-option-hint">{fmt.disabled ? "Coming soon" : fmt.hint}</div>
            </div>
          ))}
        </div>
        <div className="export-footer">
          <div className="export-footer-info">
            <div className="export-footer-format">{meta.label} · Analytics</div>
            <div className="export-footer-meta">{periodName ? `${periodName} · ` : ""}Outcome attainment data</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-outline btn-sm" onClick={() => setSendOpen(true)} type="button" title="Send report via email" style={{ borderRadius: 999, padding: "9px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z" /><path d="m22 2-11 11" /></svg>
              {" "}Send
            </button>
            <button className="btn btn-primary btn-sm export-download-btn" onClick={handleDownload} disabled={exporting} type="button">
              <span className="btn-loading-content">
                <AsyncButtonContent loading={exporting} loadingText="Downloading…">
                  <>
                    <DownloadIcon />
                    {`Download ${format === "xlsx" ? "Excel" : format === "pdf" ? "PDF" : "CSV"}`}
                  </>
                </AsyncButtonContent>
              </span>
            </button>
          </div>
        </div>
      </div>
      <SendReportModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        format={format}
        formatLabel={`${meta.label} · Analytics`}
        meta={`${periodName ? `${periodName} · ` : ""}Outcome attainment data`}
        reportTitle="Analytics"
        periodName={periodName}
        organization={organization}
        department={department}
        generateFile={generateFile}
      />
    </>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function AnalyticsPage() {
  const {
    dashboardStats = [],
    submittedData = [],
    lastRefresh,
    loading,
    error,
    periodName,
    selectedPeriodId,
    semesterOptions,
    criteriaConfig,
    outcomeConfig,
    threshold = 70,
    organizationId,
  } = useAdminContext();

  const {
    trendData,
    outcomeTrendData,
    outcomeTrendLoading,
    outcomeTrendError,
    trendPeriodIds: trendSemesterIds,
    setTrendPeriodIds: onTrendSelectionChange,
  } = useAnalyticsData({
    organizationId,
    periodList: semesterOptions || [],
    sortedPeriods: semesterOptions || [],
    lastRefresh,
  });
  const criteria = criteriaConfig || [];
  const [exportOpen, setExportOpen] = useState(false);
  const [deltaRows, setDeltaRows] = useState([]);
  const _toast = useToast();
  const { activeOrganization } = useAuth();
  const orgName = activeOrganization?.name || "";
  const deptName = activeOrganization?.institution || "";
  const tc = activeOrganization?.code || "";

  // Fetch delta data: current period + immediately previous period, independently
  // of the trend chart selection so the badge is always accurate.
  useEffect(() => {
    if (!selectedPeriodId || !semesterOptions?.length) { setDeltaRows([]); return; }
    const currentIdx = semesterOptions.findIndex((p) => p.id === selectedPeriodId);
    const prevPeriod = currentIdx >= 0 ? semesterOptions[currentIdx + 1] : null;
    if (!prevPeriod) { setDeltaRows([]); return; }
    let cancelled = false;
    import("../../shared/api").then(({ getOutcomeTrends }) =>
      getOutcomeTrends([selectedPeriodId, prevPeriod.id])
    ).then((rows) => {
      if (!cancelled) setDeltaRows(rows);
    }).catch(() => {
      if (!cancelled) setDeltaRows([]);
    });
    return () => { cancelled = true; };
  }, [selectedPeriodId, semesterOptions]);

  async function handleExport(format = "xlsx") {
    try {
      const exportParams = {
        dashboardStats,
        submittedData,
        trendData: trendData || [],
        semesterOptions: semesterOptions || [],
        trendSemesterIds: trendSemesterIds || [],
        activeOutcomes: criteria,
        outcomeLookup: outcomeConfig || [],
      };

      if (format === "pdf") {
        const { buildAnalyticsPDF } = await import("../analytics/analyticsExport");
        const doc = await buildAnalyticsPDF(exportParams, { periodName, organization: orgName, department: deptName });
        doc.save(buildExportFilename("Analytics", periodName || "all", "pdf", tc));
      } else if (format === "csv") {
        const { buildAnalyticsWorkbook } = await import("../analytics/analyticsExport");
        const XLSX = await import("xlsx-js-style");
        const wb = buildAnalyticsWorkbook(exportParams);
        // Combine all sheets into a single CSV
        const BOM = "\uFEFF";
        const sheets = wb.SheetNames.map((name) => {
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
          return `# ${name}\n${csv}`;
        });
        const csvContent = BOM + sheets.join("\n\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = buildExportFilename("Analytics", periodName || "all", "csv", tc);
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const { buildAnalyticsWorkbook } = await import("../analytics/analyticsExport");
        const XLSX = await import("xlsx-js-style");
        const wb = buildAnalyticsWorkbook(exportParams);
        XLSX.writeFile(wb, buildExportFilename("Analytics", periodName || "all", "xlsx", tc));
      }
      writeAuditLog("export.analytics", {
        resourceType: "score_sheets",
        details: { format },
      }).catch((e) => console.warn("Audit write failed:", e?.message));
      const fmtLabel = format === "pdf" ? "PDF" : format === "csv" ? "CSV" : "Excel";
      _toast.success(`Analytics exported · ${fmtLabel}${periodName ? ` · ${periodName}` : ""}`);
      setExportOpen(false);
    } catch (e) {
      _toast.error(e?.message || "Analytics export failed — please try again");
    }
  }

  const generateAnalyticsFile = async (fmt) => {
    const exportParams = {
      dashboardStats,
      submittedData,
      trendData: trendData || [],
      semesterOptions: semesterOptions || [],
      trendSemesterIds: trendSemesterIds || [],
      activeOutcomes: criteria,
      outcomeLookup: outcomeConfig || [],
    };

    if (fmt === "pdf") {
      const { buildAnalyticsPDF } = await import("../analytics/analyticsExport");
      const doc = await buildAnalyticsPDF(exportParams, { periodName, organization: orgName, department: deptName });
      const arrayBuf = doc.output("arraybuffer");
      const blob = new Blob([arrayBuf], { type: "application/pdf" });
      const fileName = buildExportFilename("Analytics", periodName || "all", "pdf", tc);
      return { blob, fileName, mimeType: "application/pdf" };
    } else if (fmt === "csv") {
      const { buildAnalyticsWorkbook } = await import("../analytics/analyticsExport");
      const XLSX = await import("xlsx-js-style");
      const wb = buildAnalyticsWorkbook(exportParams);
      const BOM = "\uFEFF";
      const sheets = wb.SheetNames.map((name) => {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
        return `# ${name}\n${csv}`;
      });
      const blob = new Blob([BOM + sheets.join("\n\n")], { type: "text/csv;charset=utf-8;" });
      const fileName = buildExportFilename("Analytics", periodName || "all", "csv", tc);
      return { blob, fileName, mimeType: "text/csv" };
    } else {
      const { buildAnalyticsWorkbook } = await import("../analytics/analyticsExport");
      const XLSX = await import("xlsx-js-style");
      const wb = buildAnalyticsWorkbook(exportParams);
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const fileName = buildExportFilename("Analytics", periodName || "all", "xlsx", tc);
      return { blob, fileName, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    }
  };

  const attCards = buildAttainmentCards(submittedData, criteria, deltaRows, threshold);
  const { rows: outcomeTrendRows, outcomeMeta } = buildOutcomeAttainmentTrendDataset(
    outcomeTrendData,
    semesterOptions,
    trendSemesterIds
  );
  const metCount = attCards.filter((c) => c.statusClass === "status-met").length;
  const totalCount = attCards.filter((c) => c.attRate != null).length;

  if (loading) {
    return (
      <div className="analytics-loading">
        Loading analytics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-error">
        {error}
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* ── Header ── */}
      <div className="analytics-header">
        <div className="analytics-header-left">
          <div className="page-title">Programme Outcome Analytics</div>
          <div className="page-desc">
            Outcome attainment &amp; continuous improvement evidence
            {periodName ? ` — ${periodName}` : ""}
          </div>
        </div>
        <div className="analytics-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setExportOpen((v) => !v)}
            type="button"
          >
            <DownloadIcon /> Export
          </button>
        </div>
      </div>

      {/* ── Export Panel ── */}
      {exportOpen && (
        <ExportPanel
          onClose={() => setExportOpen(false)}
          onExport={handleExport}
          periodName={periodName}
          organization={orgName}
          department={deptName}
          generateFile={generateAnalyticsFile}
        />
      )}

      {/* ── Analytics Nav ── */}
      <AnalyticsNav />

      {/* ══════ SECTION 01: Outcome Attainment Status ══════ */}
      <div className="analytics-section" id="ans-attainment">
        <div className="analytics-section-title">
          <span className="section-num">01</span>Outcome Attainment Status
        </div>
      </div>

      {attCards.length > 0 ? (
        <>
          <div className="attainment-cards">
            {attCards.map(({ code, label, attRate, statusClass, statusLabel, statusPrefix, delta }) => (
              <div key={code} className={`att-card ${statusClass}`}>
                <div className="att-card-header">
                  <span className="att-card-code">{code}</span>
                  <span className={`att-card-status ${statusClass.replace("status-", "")}`}>
                    {statusPrefix}{statusLabel}
                  </span>
                </div>
                <div className="att-card-label">{label}</div>
                <div className="att-card-metric">
                  <span className={`att-card-value ${statusClass.replace("status-", "")}`}>
                    {attRate != null ? `${attRate}%` : "—"}
                  </span>
                  <span className="att-card-unit">above threshold</span>
                  {delta != null && (
                    <span className={`att-card-trend ${delta > 0 ? "up" : delta < 0 ? "down" : "flat"}`}>
                      {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {delta > 0 ? "+" : ""}{delta}%
                    </span>
                  )}
                </div>
                {attRate != null && (
                  <div className="att-card-bar">
                    <div
                      className="att-card-bar-fill"
                      style={{
                        width: `${attRate}%`,
                        background: attRate >= threshold
                          ? "var(--status-met-text)"
                          : attRate >= 60
                          ? "var(--status-borderline-text)"
                          : "var(--status-not-met-text)",
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          {totalCount > 0 && (
            <div className="insight-banner insight-banner-full">
              <InfoIcon />
              <div>
                <strong>{metCount} of {totalCount}</strong> outcomes met —
                {metCount < totalCount
                  ? " outcomes below target require curriculum-level action items per the accreditation framework's periodic monitoring requirements."
                  : " all mapped outcomes meet the 70% attainment threshold."}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="analytics-empty">No score data available for attainment analysis.</div>
      )}

      {/* ══════ SECTION 02: Attainment Analysis ══════ */}
      <div className="analytics-section" id="ans-analysis">
        <div className="analytics-section-title">
          <span className="section-num">02</span>Attainment Analysis
        </div>
      </div>

      <div className="analytics-chart-pair" style={{ marginBottom: 18 }}>
        <div className="chart-card-v2">
          <div className="chart-header">
            <div>
              <div className="chart-title">Outcome Attainment Rate</div>
              <div className="chart-subtitle">% of evaluations scoring ≥70% per programme outcome</div>
            </div>
          </div>
          <div className="chart-body" id="pdf-chart-attainment-rate">
            <AttainmentRateChart submittedData={submittedData} criteria={criteria} threshold={threshold} />
          </div>
          <div className="chart-legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: "var(--success)" }} />Met (≥70%)</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: "var(--warning)" }} />Borderline (60–69%)</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: "var(--danger)" }} />Not met (&lt;60%)</div>
            <div className="legend-item">
              <div className="legend-line" style={{ background: "var(--text-tertiary)", borderTop: "2px dashed var(--text-tertiary)", height: 0, width: 16 }} />
              Target (70%)
            </div>
          </div>
        </div>

        <div className="chart-card-v2">
          <div className="chart-header">
            <div>
              <div className="chart-title">Threshold Gap Analysis</div>
              <div className="chart-subtitle">Deviation from 70% competency threshold per outcome</div>
            </div>
          </div>
          <div className="chart-body" id="pdf-chart-threshold-gap">
            <ThresholdGapChart submittedData={submittedData} criteria={criteria} threshold={threshold} />
          </div>
          <div className="chart-legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: "var(--success)" }} />Above threshold</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: "var(--danger)" }} />Below threshold</div>
          </div>
        </div>
      </div>

      <div className="insight-banner insight-banner-full">
        <InfoIcon />
        <div>
          Attainment rate shows <em>what % meet threshold</em>; gap analysis shows <em>how far</em> each deviates — outcomes near zero need monitoring even if above the line.
        </div>
      </div>

      {/* ══════ SECTION 03: Outcome Achievement by Group ══════ */}
      <div className="analytics-section">
        <div className="analytics-section-title">
          <span className="section-num">03</span>Outcome Achievement by Group
        </div>
      </div>

      <div className="chart-card-v2" style={{ marginBottom: 18 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Outcome Achievement by Group</div>
            <div className="chart-subtitle">Normalized score (0–100%) per criterion per project group — 70% threshold reference</div>
          </div>
        </div>
        <div className="chart-body" id="pdf-chart-outcome-by-group">
          <OutcomeByGroupChart dashboardStats={dashboardStats} criteria={criteria} threshold={threshold} />
        </div>
        <div className="chart-legend">
          {criteria.map((c) => (
            <div key={c.id} className="legend-item">
              <div className="legend-dot" style={{ background: c.color }} />
              {c.shortLabel} ({(c.outcomes || []).join("/")})
            </div>
          ))}
          <div className="legend-item">
            <div className="legend-line" style={{ background: "var(--text-tertiary)", borderTop: "2px dashed var(--text-tertiary)", height: 0, width: 16 }} />
            70% threshold
          </div>
        </div>
      </div>

      <div className="insight-banner insight-banner-full">
        <InfoIcon />
        <div>
          Per-group normalized scores provide <strong>direct assessment evidence</strong> for accreditation. Groups below threshold trigger continuous improvement actions.
        </div>
      </div>

      {/* ══════ SECTION 04: Programme Overview ══════ */}
      <div className="analytics-section" id="ans-overview">
        <div className="analytics-section-title">
          <span className="section-num">04</span>Programme Overview
        </div>
      </div>

      <div className="analytics-chart-pair" style={{ marginBottom: 18 }}>
        <div className="chart-card-v2">
          <div className="chart-header">
            <div>
              <div className="chart-title">Rubric Achievement Distribution</div>
              <div className="chart-subtitle">Performance band breakdown per criterion — continuous improvement evidence</div>
            </div>
          </div>
          <div className="chart-body" id="pdf-chart-rubric">
            <RubricAchievementChart submittedData={submittedData} criteria={criteria} />
          </div>
          <div className="chart-legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: BAND_COLORS.excellent }} />Excellent</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: BAND_COLORS.good }} />Good</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: BAND_COLORS.developing }} />Developing</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: BAND_COLORS.insufficient }} />Insufficient</div>
          </div>
        </div>

        <div className="chart-card-v2">
          <div className="chart-header">
            <div>
              <div className="chart-title">Programme-Level Outcome Averages</div>
              <div className="chart-subtitle">Grand mean (%) ± 1σ per criterion with 70% threshold reference</div>
            </div>
          </div>
          <div className="chart-body" id="pdf-chart-programme-averages">
            <ProgrammeAveragesChart submittedData={submittedData} criteria={criteria} threshold={threshold} />
          </div>
          <div className="chart-legend">
            {criteria.map((c) => (
              <div key={c.id} className="legend-item">
                <div className="legend-dot" style={{ background: c.color }} />
                {c.shortLabel} ({(c.outcomes || []).join("/")})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="insight-banner insight-banner-full">
        <InfoIcon />
        <div>
          Rubric bands provide <strong>continuous improvement evidence</strong>; programme averages with ±1σ highlight criteria with high <strong>assessment variability</strong>.
        </div>
      </div>

      {/* ══════ SECTION 05: Continuous Improvement (Trends) ══════ */}
      <div className="analytics-section" id="ans-trends">
        <div className="analytics-section-title">
          <span className="section-num">05</span>Continuous Improvement
        </div>
      </div>

      {outcomeTrendRows.length > 0 && (
        <div className="chart-card-v2" style={{ marginBottom: 12 }}>
          <div className="chart-header">
            <div>
              <div className="chart-title">Outcome Attainment Trend</div>
              <div className="chart-subtitle">
                Attainment rate (solid) and average score % (dashed) per programme outcome across evaluation periods
              </div>
            </div>
          </div>
          <div className="chart-body" id="pdf-chart-trend">
            {outcomeTrendLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--text-muted)" }}>
                Loading outcome trends…
              </div>
            ) : outcomeTrendError ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--danger)" }}>
                {outcomeTrendError}
              </div>
            ) : (
              <OutcomeAttainmentHeatmap rows={outcomeTrendRows} outcomeMeta={outcomeMeta} />
            )}
          </div>
        </div>
      )}

      <div className="insight-banner insight-banner-full">
        <InfoIcon />
        <div>
          Accreditation frameworks require <strong>longitudinal evidence</strong> of outcome monitoring ("closing the loop"). Only evaluation periods sharing the same criteria template are compared.
        </div>
      </div>

      {/* ══════ SECTION 06: Group-Level Attainment ══════ */}
      <div className="analytics-section" id="ans-reliability">
        <div className="analytics-section-title">
          <span className="section-num">06</span>Group-Level Attainment
        </div>
      </div>

      <div className="chart-card-v2" style={{ marginBottom: 18 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Group Attainment Heatmap</div>
            <div className="chart-subtitle">Normalized score (%) per outcome per project group — cells below 70% threshold are flagged</div>
          </div>
        </div>
        <div className="chart-body" id="pdf-chart-group-heatmap">
          <GroupAttainmentHeatmap dashboardStats={dashboardStats} submittedData={submittedData} criteria={criteria} threshold={threshold} />
        </div>
        <div className="chart-legend">
          <div className="legend-item"><div className="legend-dot ga-cell-high" style={{ borderRadius: 2, width: 10, height: 10 }} />High (≥80%)</div>
          <div className="legend-item"><div className="legend-dot ga-cell-met" style={{ borderRadius: 2, width: 10, height: 10 }} />Met (≥70%)</div>
          <div className="legend-item"><div className="legend-dot ga-cell-borderline" style={{ borderRadius: 2, width: 10, height: 10 }} />Borderline (60–69%)</div>
          <div className="legend-item"><div className="legend-dot ga-cell-not-met" style={{ borderRadius: 2, width: 10, height: 10 }} />Not Met (&lt;60%)</div>
        </div>
      </div>

      {/* ══════ SECTION 07: Juror Reliability ══════ */}
      <div className="analytics-section">
        <div className="analytics-section-title">
          <span className="section-num">07</span>Juror Reliability
        </div>
      </div>

      <div className="chart-card-v2" style={{ marginBottom: 18 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Inter-Rater Consistency Heatmap</div>
            <div className="chart-subtitle">Coefficient of variation (CV = σ/μ × 100%) per project group — CV &gt;25% indicates poor agreement</div>
          </div>
        </div>
        <div className="chart-body" id="pdf-chart-juror-cv">
          <JurorConsistencyHeatmap dashboardStats={dashboardStats} submittedData={submittedData} criteria={criteria} />
        </div>
        <div className="chart-legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: "rgba(22,163,74,0.5)" }} />CV &lt;10% (Excellent)</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "rgba(187,247,208,0.8)" }} />CV 10–15% (Good)</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "rgba(254,240,138,0.8)" }} />CV 15–25% (Acceptable)</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: "rgba(254,202,202,0.8)" }} />CV &gt;25% (Poor)</div>
        </div>
      </div>

      {/* ══════ SECTION 08: Coverage Matrix ══════ */}
      <div className="analytics-section" id="ans-coverage">
        <div className="analytics-section-title">
          <span className="section-num">08</span>Outcome Coverage
        </div>
      </div>

      <div className="chart-card-v2" style={{ marginBottom: 18 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Coverage Matrix</div>
            <div className="chart-subtitle">Which programme outcomes are directly assessed by evaluation criteria</div>
          </div>
        </div>
        <div className="chart-body" id="pdf-chart-coverage" style={{ overflowX: "auto" }}>
          <CoverageMatrix criteria={criteria} outcomes={outcomeConfig} />
        </div>
        <div className="chart-legend">
          <div className="legend-item"><span className="coverage-chip direct" style={{ marginRight: 4 }}>✓ Direct</span>Directly assessed</div>
          <div className="legend-item"><span className="coverage-chip none" style={{ marginRight: 4 }}>—</span>Not mapped</div>
        </div>
      </div>
    </div>
  );
}

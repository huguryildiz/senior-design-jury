// src/admin/components/analytics/AnalyticsHeader.jsx
// ============================================================
// Presentational header for the Analytics dashboard:
//   - KPI strip (jurors, evaluations, overall avg, last refresh)
//   - Toolbar (MÜDEK badge + PDF/Excel export buttons)
//
// Extracted from AnalyticsTab.jsx (Phase 5 — Final Decomposition).
// ============================================================

import { DownloadIcon, LoaderIcon } from "../../../shared/Icons";
import { MudekBadge } from "../../../charts";

// ── KpiCard ───────────────────────────────────────────────────

function KpiCard({ label, value, sub, valueClassName }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-label">{label}</div>
      <div className={`kpi-card-value${valueClassName ? ` ${valueClassName}` : ""}`}>{value}</div>
      {sub && <div className="kpi-card-sub">{sub}</div>}
    </div>
  );
}

// ── AnalyticsHeader ───────────────────────────────────────────

/**
 * AnalyticsHeader — KPI strip + export toolbar for the Analytics tab.
 *
 * @param {object} props
 * @param {number}  props.completedJurors
 * @param {number}  props.totalJurors
 * @param {number}  props.completedPct
 * @param {number}  props.scoredEvaluations
 * @param {number}  props.totalEvaluations
 * @param {number}  props.scoredPct
 * @param {number|null} props.overallAvg
 * @param {React.ReactNode} props.lastRefreshValue
 * @param {boolean} props.exporting         — PDF export in progress
 * @param {boolean} props.exportingExcel    — Excel export in progress
 * @param {Function} props.onExportPdf
 * @param {Function} props.onExportExcel
 */
export function AnalyticsHeader({
  completedJurors,
  totalJurors,
  completedPct,
  scoredEvaluations,
  totalEvaluations,
  scoredPct,
  overallAvg,
  lastRefreshValue,
  exporting,
  exportingExcel,
  onExportPdf,
  onExportExcel,
}) {
  return (
    <>
      {/* KPI summary strip */}
      <div className="analytics-kpi-strip">
        <KpiCard
          label="Jurors"
          value={`${completedJurors}/${totalJurors}`}
          sub={`${completedPct}% completed`}
        />
        <KpiCard
          label="Evaluations"
          value={`${scoredEvaluations}/${totalEvaluations}`}
          sub={`${scoredPct}% scored`}
        />
        <KpiCard
          label="Overall Avg"
          value={overallAvg !== null ? `${overallAvg}%` : "—"}
          sub="across all criteria"
        />
        <KpiCard
          label="Last Refresh"
          value={lastRefreshValue}
          valueClassName="kpi-card-value--stack"
          sub=""
        />
      </div>

      {/* Toolbar: MÜDEK badge + export buttons */}
      <div className="dashboard-toolbar">
        <div className="dashboard-toolbar-left">
          <MudekBadge />
        </div>
        <span className="dashboard-toolbar-divider" aria-hidden="true" />
        <button
          className="pdf-export-btn"
          onClick={onExportPdf}
          disabled={exporting}
          aria-label={exporting ? "Preparing PDF export" : "Export PDF"}
          title={exporting ? "Preparing PDF…" : 'Export PDF — In the print dialog, uncheck "Headers and footers" to remove the browser URL from the report'}
        >
          {exporting ? <span className="spin-icon"><LoaderIcon /></span> : <DownloadIcon />}
          {exporting ? "Exporting…" : "PDF"}
        </button>
        <button
          className="xlsx-export-btn"
          onClick={onExportExcel}
          disabled={exportingExcel}
          aria-label={exportingExcel ? "Preparing Excel export" : "Export Excel"}
          title={exportingExcel ? "Preparing Excel…" : "Export Excel"}
        >
          {exportingExcel ? <span className="spin-icon"><LoaderIcon /></span> : <DownloadIcon />}
          {exportingExcel ? "Exporting…" : "Excel"}
        </button>
      </div>
    </>
  );
}

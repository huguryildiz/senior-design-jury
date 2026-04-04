// src/admin/HeatmapPage.jsx
// ── Heatmap Page — juror × project scoring matrix ────────────
// Prototype source: lines 13199–13288
// Hooks: useHeatmapData, useGridSort, useGridExport

import { useState, useMemo } from "react";
import { getCellState, getPartialTotal } from "../utils/scoreHelpers";
import { useHeatmapData } from "../hooks/useHeatmapData";
import { useGridSort } from "../hooks/useGridSort";
import { useGridExport } from "../hooks/useGridExport";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import { generateTableBlob } from "../utils/downloadTable";
import SendReportModal from "@/admin/modals/SendReportModal";

// ── Score color band ──────────────────────────────────────────
// Returns a CSS variable name for the cell background color.
// Thresholds are percentage-based (score / max * 100).
function getScoreBgVar(score, max) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 90) return "var(--score-excellent-bg)";
  if (pct >= 80) return "var(--score-high-bg)";
  if (pct >= 75) return "var(--score-good-bg)";
  if (pct >= 70) return "var(--score-adequate-bg)";
  if (pct >= 60) return "var(--score-low-bg)";
  return "var(--score-poor-bg)";
}

import JurorBadge from "../components/JurorBadge";

// Criteria tabs are built dynamically from activeCriteria inside the component

// Resolve the display score and max for a cell given the active tab
function getCellDisplay(entry, activeTab, activeCriteria) {
  if (!entry) return null;
  if (activeTab === "all") {
    const state = getCellState(entry, activeCriteria);
    if (state === "empty") return null;
    const totalMax = activeCriteria.reduce((s, c) => s + c.max, 0);
    if (state === "scored") return { score: Number(entry.total), max: totalMax, partial: false };
    // partial
    const partial = getPartialTotal(entry, activeCriteria);
    return { score: partial, max: totalMax, partial: true };
  }
  // Specific criterion
  const criterion = activeCriteria.find((c) => c.id === activeTab);
  if (!criterion) return null;
  const raw = entry[activeTab];
  if (raw == null) return null;
  return { score: Number(raw), max: criterion.max, partial: false };
}

// Compute visible-juror-only group averages for a given tab
function computeVisibleAverages(visibleJurors, groups, lookup, activeTab, activeCriteria) {
  return groups.map((g) => {
    const scores = [];
    visibleJurors.forEach((j) => {
      const entry = lookup[j.key]?.[g.id];
      const cell = getCellDisplay(entry, activeTab, activeCriteria);
      if (cell && !cell.partial) scores.push(cell.score);
    });
    if (!scores.length) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  });
}

// Export format labels
const EXPORT_FORMAT_META = {
  xlsx: { label: "Excel (.xlsx)", desc: "Matrix grid with tab-level criterion values", hint: "Best for sharing",   iconLabel: "XLS" },
  csv:  { label: "CSV (.csv)",    desc: "Raw matrix cells for downstream analysis",    hint: "Best for analysis", iconLabel: "CSV" },
  pdf:  { label: "PDF Report",    desc: "Formatted heatmap view with legend and context", hint: "Best for archival", iconLabel: "PDF" },
};

// ── Main component ────────────────────────────────────────────

export default function HeatmapPage({ data, jurors, groups, periodName, organization = "", criteriaConfig = [] }) {
  const activeCriteria = criteriaConfig;
  const totalMax = useMemo(
    () => activeCriteria.reduce((s, c) => s + c.max, 0),
    [activeCriteria]
  );

  // Data hooks
  const { lookup, jurorFinalMap, jurorWorkflowMap, groupAverages, buildExportRows } =
    useHeatmapData({ data, jurors: jurors || [], groups: groups || [], criteriaConfig });

  const {
    visibleJurors,
    sortGroupId, sortGroupDir, sortMode, sortJurorDir,
    toggleGroupSort, toggleJurorSort,
  } = useGridSort(jurors || [], groups || [], lookup, totalMax, activeCriteria);

  const { requestExport } = useGridExport({
    buildExportRows,
    groups: groups || [],
    periodName,
    visibleJurors,
    lookup,
    activeCriteria,
  });

  const _toast = useToast();
  const { activeOrganization } = useAuth();

  // UI state
  const [activeTab, setActiveTab]       = useState("all");
  const [exportOpen, setExportOpen]     = useState(false);
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [sendOpen, setSendOpen]         = useState(false);

  // Dynamic criteria tabs
  const criteriaTabs = useMemo(
    () => [
      { id: "all", label: "All Criteria" },
      ...activeCriteria.map((c) => ({ id: c.id, label: c.shortLabel || c.label || c.id })),
    ],
    [activeCriteria]
  );

  // Per-group averages for visible jurors
  const visibleAverages = useMemo(
    () => computeVisibleAverages(visibleJurors, groups || [], lookup, activeTab, activeCriteria),
    [visibleJurors, groups, lookup, activeTab, activeCriteria]
  );

  // Score range for legend (min/max across all visible cells)
  const { rangeMin, rangeMax } = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    visibleJurors.forEach((j) => {
      (groups || []).forEach((g) => {
        const entry = lookup[j.key]?.[g.id];
        const cell = getCellDisplay(entry, activeTab, activeCriteria);
        if (cell && !cell.partial) {
          lo = Math.min(lo, cell.score);
          hi = Math.max(hi, cell.score);
        }
      });
    });
    return {
      rangeMin: lo === Infinity  ? 0  : lo,
      rangeMax: hi === -Infinity ? totalMax : hi,
    };
  }, [visibleJurors, groups, lookup, activeTab, activeCriteria, totalMax]);

  // Juror sort aria-sort attribute
  const jurorAriaSortValue =
    sortMode === "juror"
      ? sortJurorDir === "asc" ? "ascending" : "descending"
      : "none";

  // Group sort aria-sort attribute
  function groupAriaSortValue(groupId) {
    if (sortMode !== "group" || sortGroupId !== groupId) return "none";
    return sortGroupDir === "asc" ? "ascending" : "descending";
  }

  function handleDownload() {
    try {
      requestExport(exportFormat);
      setExportOpen(false);
      _toast.success("Heatmap exported");
    } catch (e) {
      _toast.error(e?.message || "Export failed");
    }
  }

  return (
    <div className="heatmap-page">
      {/* ── Header ── */}
      <div className="matrix-header">
        <div className="matrix-header-left">
          <div className="page-title">Heatmap</div>
          <div className="page-desc">
            Compare juror scoring patterns across projects and criteria.
          </div>
        </div>
        <div className="analytics-actions">
          <div className="matrix-tabs">
            {criteriaTabs.map((tab) => (
              <div
                key={tab.id}
                className={`matrix-tab${activeTab === tab.id ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </div>
            ))}
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setExportOpen((v) => !v)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {" "}Export
          </button>
        </div>
      </div>

      {/* ── Export Panel ── */}
      {exportOpen && (
        <div className="export-panel show">
          <div className="export-panel-header">
            <div>
              <h4>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export Heatmap
              </h4>
              <div className="export-panel-sub">
                Download the juror scoring matrix with per-criterion breakdowns and averages.
              </div>
            </div>
            <button className="export-panel-close" onClick={() => setExportOpen(false)}>
              &#215;
            </button>
          </div>

          <div className="export-options">
            {Object.entries(EXPORT_FORMAT_META).map(([fmt, meta]) => (
              <div
                key={fmt}
                className={`export-option${exportFormat === fmt ? " selected" : ""}`}
                onClick={() => setExportFormat(fmt)}
              >
                <span className="export-option-selected-pill">Selected</span>
                <div className={`export-option-icon export-option-icon--${fmt}`}>
                  <span className="file-icon">
                    <span className="file-icon-label">{meta.iconLabel}</span>
                  </span>
                </div>
                <div className="export-option-title">{meta.label}</div>
                <div className="export-option-desc">{meta.desc}</div>
                <div className="export-option-hint">{meta.hint}</div>
              </div>
            ))}
          </div>

          <div className="export-footer">
            <div className="export-footer-info">
              <div className="export-footer-format">
                {EXPORT_FORMAT_META[exportFormat]?.label} · Heatmap
              </div>
              <div className="export-footer-meta">
                Includes selected criterion tab and per-project averages
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button className="btn btn-outline btn-sm" onClick={() => setSendOpen(true)} title="Send report via email" style={{ borderRadius: 999, padding: "9px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z" /><path d="m22 2-11 11" /></svg>
                {" "}Send
              </button>
              <button
                className="btn btn-primary btn-sm export-download-btn"
                onClick={handleDownload}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download {exportFormat === "xlsx" ? "Excel" : exportFormat === "pdf" ? "PDF" : "CSV"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SendReportModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        format={exportFormat}
        formatLabel={`${EXPORT_FORMAT_META[exportFormat]?.label} · Heatmap`}
        meta="Includes selected criterion tab and per-project averages"
        reportTitle="Heatmap"
        periodName={periodName}
        organization={activeOrganization?.name || organization}
        department={activeOrganization?.institution_name || ""}
        generateFile={async (fmt) => {
          const exportRows = buildExportRows(visibleJurors);
          const groupHeaders = (groups || []).map((g) => g.group_no != null ? `Group ${g.group_no}` : (g.title || g.id));
          const header = ["Juror", "Affiliation", "Status", ...groupHeaders];
          const rows = exportRows.map((r) => [
            r.name, r.dept ?? "", r.statusLabel,
            ...(groups || []).map((g) => { const v = r.scores[g.id]; return v !== null && v !== undefined ? v : ""; }),
          ]);
          return generateTableBlob(fmt, {
            filenameType: "Heatmap", sheetName: "Heatmap", periodName,
            tenantCode: activeOrganization?.code || "",
            organization: activeOrganization?.name || organization,
            pdfTitle: "VERA — Evaluation Heatmap", header, rows,
          });
        }}
      />

      {/* ── Matrix ── */}
      <div className="matrix-wrap">
        <table
          className="matrix-table"
          role="grid"
          aria-label="Juror scoring heatmap"
        >
          <thead>
            <tr>
              <th
                className="sticky-col sortable-col"
                role="columnheader"
                aria-sort={jurorAriaSortValue}
                data-sort-dir={
                  sortMode === "juror"
                    ? sortJurorDir === "asc" ? "asc" : "desc"
                    : undefined
                }
                onClick={toggleJurorSort}
              >
                <span role="rowheader">Juror</span>
              </th>
              {(groups || []).map((g) => (
                <th
                  key={g.id}
                  className="text-center col-project sortable-col"
                  role="columnheader"
                  aria-sort={groupAriaSortValue(g.id)}
                  data-sort-dir={
                    sortMode === "group" && sortGroupId === g.id
                      ? sortGroupDir === "asc" ? "asc" : "desc"
                      : undefined
                  }
                  onClick={() => toggleGroupSort(g.id)}
                >
                  <span className="proj-name">{g.group_no != null ? `P${g.group_no}` : ""}</span>
                  <span className="proj-group">{g.title}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleJurors.map((juror) => (
              <tr key={juror.key}>
                <td className="sticky-col" role="rowheader">
                  <JurorBadge name={juror.name || juror.juror_name} affiliation={juror.dept || juror.affiliation} size="sm" />
                </td>

                {(groups || []).map((g) => {
                  const entry = lookup[juror.key]?.[g.id];
                  const cell = getCellDisplay(entry, activeTab, activeCriteria);

                  if (!cell) {
                    return (
                      <td
                        key={g.id}
                        className="m-cell"
                        style={{ color: "var(--text-quaternary)" }}
                        aria-label={`${g.title}: not scored`}
                      >
                        —
                      </td>
                    );
                  }

                  if (cell.partial) {
                    return (
                      <td
                        key={g.id}
                        className="m-cell partial"
                        style={{ background: "var(--score-partial-bg)" }}
                        aria-label={`${g.title}: partial ${cell.score}`}
                      >
                        {cell.score}
                        <span className="m-flag" aria-hidden="true">!</span>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={g.id}
                      className="m-cell"
                      style={{ background: getScoreBgVar(cell.score, cell.max) }}
                      aria-label={`${g.title}: ${cell.score}`}
                    >
                      {cell.score}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td className="sticky-col">Average</td>
              {(groups || []).map((g, i) => {
                const avg = visibleAverages[i];
                return (
                  <td key={g.id} className="m-cell" aria-label={`${g.title} average`}>
                    {avg == null ? (
                      <span style={{ color: "var(--text-quaternary)" }}>—</span>
                    ) : (
                      <>
                        <span style={{ fontWeight: 700, color: "var(--accent)" }}>
                          {avg.toFixed(1)}
                        </span>
                        <span style={{ fontWeight: 400, color: "var(--text-tertiary)", fontSize: "10px" }}>
                          {" "}/{activeTab === "all" ? totalMax : activeCriteria.find((c) => c.id === activeTab)?.max ?? totalMax}
                        </span>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>

        {/* ── Footer Legend ── */}
        <div className="matrix-footer">
          <div className="matrix-legend-section">
            <span className="matrix-legend-label">Low</span>
            <div className="matrix-legend-bar">
              <span style={{ background: "var(--score-poor-bg)" }} />
              <span style={{ background: "var(--score-low-bg)" }} />
              <span style={{ background: "var(--score-adequate-bg)" }} />
              <span style={{ background: "var(--score-good-bg)" }} />
              <span style={{ background: "var(--score-high-bg)" }} />
              <span style={{ background: "var(--score-excellent-bg)" }} />
            </div>
            <span className="matrix-legend-label">High</span>
          </div>
          <div className="matrix-legend-range" style={{ marginLeft: "8px" }}>
            <span>{rangeMin}</span>
            <span style={{ color: "var(--border)" }}>–</span>
            <span>{rangeMax}</span>
          </div>
          <div className="matrix-legend-sep" />
          <div className="matrix-legend-flag-note">
            <span className="matrix-legend-flag-dot" aria-hidden="true">!</span>
            {" "}Partial — one or more criteria not scored
          </div>
        </div>
      </div>
    </div>
  );
}

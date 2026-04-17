// src/admin/ReviewsPage.jsx
// ============================================================
// Reviews — Phase 6 full UI reset from prototype.
// Displays all individual juror evaluations with filter,
// sort, pagination, export, and status legend.
//
// State: useReviewsFilters
// Data: filterPipeline selectors (pure functions)
// ============================================================

import { useMemo, useState } from "react";
import { useAdminContext } from "../hooks/useAdminContext";
import { Check, CheckCircle2, Circle, CircleCheck, CircleDotDashed, CircleSlash, Clock, Download, Filter, Icon, MessageSquare, PencilLine, Search, Send, X, XCircle } from "lucide-react";
import JurorStatusPill from "@/admin/components/JurorStatusPill";
import ScoreStatusPill from "@/admin/components/ScoreStatusPill";
import { useReviewsFilters } from "../hooks/useReviewsFilters";
import { logExportInitiated } from "@/shared/api";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import SendReportModal from "@/admin/modals/SendReportModal";
import { FilterButton } from "@/shared/ui/FilterButton.jsx";
import Pagination from "@/shared/ui/Pagination";
import {
  buildProjectMetaMap,
  buildJurorEditMap,
  buildJurorFinalMap,
  generateMissingRows,
  enrichRows,
  applyFilters,
  sortRows,
  computeActiveFilterCount,
} from "../selectors/filterPipeline";
import { formatTs } from "../utils/adminUtils";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import JurorBadge from "../components/JurorBadge";
import PremiumTooltip from "@/shared/ui/PremiumTooltip";
import CustomSelect from "@/shared/ui/CustomSelect";
import { StudentNames } from "@/shared/ui/EntityMeta";
import "../../styles/pages/reviews.css";


// ── Juror progress pill ───────────────────────────────────────
function JurorPill({ status, submittedTs }) {
  const pill = <JurorStatusPill status={status} />;
  if (status === "completed" && submittedTs && submittedTs !== "—") {
    return <PremiumTooltip text={`Completed: ${submittedTs}`}>{pill}</PremiumTooltip>;
  }
  return pill;
}

// ── Sort indicator ────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────
export default function ReviewsPage() {
  const {
    data,
    jurors: _ctxJurors,
    allJurors,
    assignedJurors,
    groups,
    periodName,
    summaryData,
    loading,
    criteriaConfig = [],
  } = useAdminContext();
  const jurors = allJurors;
  const filters = useReviewsFilters(criteriaConfig);

  const {
    filterJuror, setFilterJuror,
    filterProjectTitle, setFilterProjectTitle,
    filterStatus, setFilterStatus,
    filterJurorStatus, setFilterJurorStatus,
    scoreFilters,
    updatedFrom, setUpdatedFrom,
    updatedTo, setUpdatedTo,
    completedFrom, setCompletedFrom,
    completedTo, setCompletedTo,
    updatedParsedFrom, updatedParsedTo, updatedParsedFromMs, updatedParsedToMs, isUpdatedInvalidRange,
    completedParsedFrom, completedParsedTo, completedParsedFromMs, completedParsedToMs, isCompletedInvalidRange,
    sortKey, setSortKey,
    sortDir, setSortDir,
    pageSize, setPageSize,
    currentPage, setCurrentPage,
    multiSearchQuery, setMultiSearchQuery,
    scoreCols, scoreKeys, scoreMaxByKey,
    updateScoreFilter,
  } = filters;

  const toast = useToast();
  const { activeOrganization } = useAuth();
  const [showFilter, setShowFilter] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");
  const [sendOpen, setSendOpen] = useState(false);

  // ── Data pipeline ─────────────────────────────────────────
  const projectMeta = useMemo(() => buildProjectMetaMap(summaryData), [summaryData]);
  const jurorEditMap = useMemo(() => buildJurorEditMap(assignedJurors || jurors), [assignedJurors, jurors]);
  const jurorFinalMap = useMemo(() => buildJurorFinalMap(assignedJurors || jurors), [assignedJurors, jurors]);

  const combinedData = useMemo(() => {
    const base = Array.isArray(data) ? data : [];
    const missing = generateMissingRows(assignedJurors || jurors, groups, base, projectMeta);
    return [...base, ...missing];
  }, [data, jurors, assignedJurors, groups, projectMeta]);

  const enriched = useMemo(
    () => enrichRows(combinedData, projectMeta, jurorEditMap, groups, periodName, jurorFinalMap, criteriaConfig),
    [combinedData, projectMeta, jurorEditMap, groups, periodName, jurorFinalMap, criteriaConfig]
  );

  // Multi-search (pre-filter, not through applyFilters)
  const searchFiltered = useMemo(() => {
    if (!multiSearchQuery) return enriched;
    const q = multiSearchQuery.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((r) =>
      `${r.juryName ?? ""} ${r.affiliation ?? ""} ${r.title ?? ""}`.toLowerCase().includes(q)
    );
  }, [enriched, multiSearchQuery]);

  const filterState = useMemo(
    () => ({
      periodName,
      filterGroupNo: null,
      filterJuror,
      filterDept: null,
      filterStatus,
      filterJurorStatus,
      filterProjectTitle,
      filterStudents: null,
      updatedFrom, updatedTo,
      updatedParsedFrom, updatedParsedTo,
      updatedParsedFromMs, updatedParsedToMs,
      isUpdatedInvalidRange,
      completedFrom, completedTo,
      completedParsedFrom, completedParsedTo,
      completedParsedFromMs, completedParsedToMs,
      isCompletedInvalidRange,
      scoreFilters,
      scoreKeys,
      filterComment: null,
    }),
    [periodName, filterJuror, filterStatus, filterJurorStatus, filterProjectTitle,
     updatedFrom, updatedTo, updatedParsedFrom, updatedParsedTo, updatedParsedFromMs, updatedParsedToMs, isUpdatedInvalidRange,
     completedFrom, completedTo, completedParsedFrom, completedParsedTo, completedParsedFromMs, completedParsedToMs, isCompletedInvalidRange,
     scoreFilters, scoreKeys]
  );

  const filtered = useMemo(() => applyFilters(searchFiltered, filterState), [searchFiltered, filterState]);
  const sorted = useMemo(() => sortRows(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);

  const maxTotal = criteriaConfig.reduce((s, c) => s + (c.max || 0), 0);
  const columns = useMemo(() => [
    { key: 'juror',       label: 'Juror',              sortKey: 'juryName',          getValue: r => r.juryName ?? '' },
    { key: 'no',          label: 'No',                 sortKey: 'groupNo',           thClass: 'text-center', getValue: r => r.groupNo != null ? `P${r.groupNo}` : '—' },
    { key: 'project',     label: 'Project',            sortKey: 'title',             getValue: r => r.title || r.projectName || '—' },
    { key: 'members',     label: 'Team Members',                                     getValue: r => Array.isArray(r.students) ? r.students.join(', ') : (r.students ?? '—') },
    ...scoreCols.filter(c => c.key !== 'total').map(c => ({
      key: c.key, label: c.label, sortKey: c.key, thClass: 'text-right', getValue: r => r[c.key] ?? '—',
    })),
    { key: 'total',       label: `Total (${maxTotal})`, sortKey: 'total',            thClass: 'text-right', getValue: r => r.total ?? '—' },
    { key: 'status',      label: 'Status',              sortKey: 'effectiveStatus',  thClass: 'text-center', getValue: r => r.effectiveStatus ?? '—' },
    { key: 'progress',    label: 'Progress',            sortKey: 'jurorStatus',      thClass: 'text-center', getValue: r => r.jurorStatus ?? '—' },
    { key: 'comment',     label: 'Comment',                                          getValue: r => r.comments ?? '' },
    { key: 'submittedAt', label: 'Submitted At',        sortKey: 'finalSubmittedMs', thClass: 'text-right', getValue: r => formatTs(r.finalSubmittedAt || r.updatedAt) },
  ], [scoreCols, maxTotal]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(pageStart, pageStart + pageSize);

  // ── KPI stats (reflects active filters) ─────────────────
  const kpiBase = filtered.length !== enriched.length ? filtered : enriched;
  const totalReviews = kpiBase.length;
  const uniqueJurors = new Set(kpiBase.map((r) => r.jurorId || r.juryName)).size;
  const uniqueProjects = new Set(kpiBase.map((r) => r.projectId || r.title)).size;
  const partialCount = kpiBase.filter((r) => r.effectiveStatus === "partial").length;
  // Average: only completed jurors — jurorStatus === "completed" mirrors Overview & Rankings logic exactly
  const scoredRows = kpiBase.filter(
    (r) => r.total != null && Number.isFinite(Number(r.total)) && r.jurorStatus === "completed"
  );
  const avgScore = scoredRows.length > 0
    ? (scoredRows.reduce((s, r) => s + Number(r.total), 0) / scoredRows.length).toFixed(1)
    : "—";

  // ── Active filter count ───────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = computeActiveFilterCount({
      filterGroupNo: null,
      filterJuror,
      filterDept: null,
      filterStatus,
      filterJurorStatus,
      filterProjectTitle,
      filterStudents: null,
      isUpdatedDateFilterValid: !!(updatedFrom && !isUpdatedInvalidRange),
      isCompletedDateFilterValid: !!(completedFrom && !isCompletedInvalidRange),
      scoreFilters,
      scoreKeys,
      filterComment: null,
    });
    if (multiSearchQuery) count += 1;
    return count;
  }, [filterJuror, filterStatus, filterJurorStatus, filterProjectTitle,
      updatedFrom, isUpdatedInvalidRange, completedFrom, isCompletedInvalidRange,
      scoreFilters, scoreKeys, multiSearchQuery]);

  // ── Derived dropdown options ──────────────────────────────
  const jurorOptions = useMemo(() => {
    const map = new Map();
    enriched.forEach((r) => {
      const name = r.juryName || "";
      if (name && !map.has(name)) map.set(name, name);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "tr"));
  }, [enriched]);

  const projectOptions = useMemo(() => {
    const map = new Map();
    enriched.forEach((r) => {
      const t = r.title || r.projectName || "";
      if (t && !map.has(t)) map.set(t, t);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "tr"));
  }, [enriched]);

  // ── Handlers ─────────────────────────────────────────────
  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setCurrentPage(1);
  }

  function handleClearFilters() {
    setFilterJuror("");
    setFilterProjectTitle("");
    setFilterStatus(null);
    setFilterJurorStatus(null);
    setUpdatedFrom("");
    setUpdatedTo("");
    setCompletedFrom("");
    setCompletedTo("");
    setMultiSearchQuery("");
    scoreKeys.forEach((key) => {
      updateScoreFilter(key, "min", "");
      updateScoreFilter(key, "max", "");
    });
    setCurrentPage(1);
  }

  async function handleExport() {
    try {
      const header = columns.map(c => c.label);
      const rows   = sorted.map(r => columns.map(c => c.getValue(r)));
      const projectCount = new Set(
        sorted.map((r) => r?.projectId || r?.project_id || r?.title || r?.projectName || null).filter(Boolean),
      ).size;

      // Blocking pre-export audit — abort export if we can't record it.
      await logExportInitiated({
        action: "export.scores",
        organizationId: activeOrganization?.id || null,
        resourceType: "score_sheets",
        details: {
          format: exportFormat,
          row_count: sorted.length,
          period_name: periodName ?? null,
          project_count: projectCount || null,
          juror_count: uniqueJurors || null,
          filters: {
            juror: filterJuror || null,
            project_title: filterProjectTitle || null,
            status: filterStatus || null,
            juror_status: filterJurorStatus || null,
            search: multiSearchQuery || null,
          },
        },
      });

      await downloadTable(exportFormat, {
        filenameType: "Reviews",
        sheetName: "Reviews",
        periodName,
        tenantCode: activeOrganization?.code || "",
        organization: activeOrganization?.name || "",
        department: activeOrganization?.institution || "",
        pdfTitle: "VERA — Reviews",
        pdfSubtitle: `${periodName || "All Periods"} · ${sorted.length} reviews · ${uniqueJurors} jurors`,
        header,
        rows,
        colWidths: [24, 6, 24, 28, ...scoreCols.filter((c) => c.key !== "total").map(() => 10), 8, 12, 14, 32, 18],
      });
      setShowExport(false);
      const fmtLabel = exportFormat === "pdf" ? "PDF" : exportFormat === "csv" ? "CSV" : "Excel";
      toast.success(`${sorted.length} review${sorted.length !== 1 ? "s" : ""} · ${uniqueJurors} juror${uniqueJurors !== 1 ? "s" : ""} exported · ${fmtLabel}`);
    } catch (e) {
      toast.error(e?.message || "Reviews export failed — please try again");
    }
  }

  // ── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="reviews-page reviews-loading">
        <div className="spinner" />
        <span>Loading reviews…</span>
      </div>
    );
  }

  return (
    <div className="reviews-page">
      {/* Header */}
      <div className="reviews-header">
        <div className="reviews-header-left">
          <div className="page-title">Reviews</div>
          <div className="page-desc">Inspect individual juror evaluations across projects and criteria.</div>
        </div>
        <div className="reviews-actions mobile-toolbar-stack">
          <div className="mobile-toolbar-search" style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
            <input
              className="reviews-search"
              type="text"
              placeholder="Search juror or project..."
              value={multiSearchQuery}
              onChange={(e) => { setMultiSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <FilterButton
            className="mobile-toolbar-filter"
            activeCount={activeFilterCount}
            isOpen={showFilter}
            onClick={() => { setShowFilter((v) => !v); setShowExport(false); }}
          />
          <div className="mobile-toolbar-spacer" />
          <button
            type="button"
            className={`btn btn-outline btn-sm mobile-toolbar-export${showExport ? " active" : ""}`}
            onClick={() => { setShowExport((v) => !v); setShowFilter(false); }}
          >
            <Download size={14} style={{ verticalAlign: "-1px" }} />
            Export
          </button>
        </div>
      </div>
      {/* Filter status banner */}
      {activeFilterCount > 0 && (
        <div className="fb-banner fbb-success">
          <CheckCircle2 size={16} />
          <span className="fb-banner-text">
            {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} applied — showing {sorted.length} of {enriched.length} result{enriched.length !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="fb-banner-action"
            style={{ color: "var(--fb-success-text)" }}
            onClick={handleClearFilters}
          >
            Clear filters →
          </button>
        </div>
      )}
      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{totalReviews}</div>
          <div className="scores-kpi-item-label">Reviews</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{uniqueJurors}</div>
          <div className="scores-kpi-item-label">Jurors</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{uniqueProjects}</div>
          <div className="scores-kpi-item-label">Projects</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">
            <span style={{ color: partialCount > 0 ? "var(--warning)" : undefined }}>{partialCount}</span>
          </div>
          <div className="scores-kpi-item-label">Partial</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{avgScore}</div>
          <div className="scores-kpi-item-label">Avg Score</div>
        </div>
      </div>
      {/* Status & progress legend strips */}
      <div className="reviews-legend-strips" role="note" aria-label="Status legend">
        <div>
          <div className="reviews-legend-category">Score Status</div>
          <div className="reviews-legend-strip">
            <div className="reviews-legend-item scored">
              <div className="reviews-legend-icon-wrap scored">
                <Check size={13} strokeWidth={2.5} />
              </div>
              <div>
                <div className="reviews-legend-label scored">Scored</div>
                <div className="reviews-legend-desc">All criteria evaluated for this project.</div>
              </div>
            </div>
            <div className="reviews-legend-item partial">
              <div className="reviews-legend-icon-wrap partial">
                <CircleDotDashed size={13} strokeWidth={2} />
              </div>
              <div>
                <div className="reviews-legend-label partial">Partial</div>
                <div className="reviews-legend-desc">Some criteria scored, others still missing.</div>
              </div>
            </div>
            <div className="reviews-legend-item empty">
              <div className="reviews-legend-icon-wrap empty">
                <Circle size={13} strokeWidth={2.2} />
              </div>
              <div>
                <div className="reviews-legend-label empty">Empty</div>
                <div className="reviews-legend-desc">No scores entered yet for this project.</div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="reviews-legend-category">Juror Progress</div>
          <div className="reviews-legend-strip">
            <div className="reviews-legend-item completed">
              <div className="reviews-legend-icon-wrap completed">
                <CircleCheck size={13} strokeWidth={2} />
              </div>
              <div>
                <div className="reviews-legend-label completed">Completed</div>
                <div className="reviews-legend-desc">Final submission done, scores locked.</div>
              </div>
            </div>
            <div className="reviews-legend-item ready">
              <div className="reviews-legend-icon-wrap ready">
                <Send size={13} strokeWidth={2} />
              </div>
              <div>
                <div className="reviews-legend-label ready">Ready to Submit</div>
                <div className="reviews-legend-desc">All groups scored, awaiting final submission.</div>
              </div>
            </div>
            <div className="reviews-legend-item progress">
              <div className="reviews-legend-icon-wrap progress">
                <Clock size={13} strokeWidth={2} />
              </div>
              <div>
                <div className="reviews-legend-label progress">In Progress</div>
                <div className="reviews-legend-desc">Scoring started but not all groups done.</div>
              </div>
            </div>
            <div className="reviews-legend-item not-started">
              <div className="reviews-legend-icon-wrap not-started">
                <CircleSlash size={13} strokeWidth={2} />
              </div>
              <div>
                <div className="reviews-legend-label not-started">Not Started</div>
                <div className="reviews-legend-desc">No scoring activity from this juror yet.</div>
              </div>
            </div>
            <div className="reviews-legend-item editing">
              <div className="reviews-legend-icon-wrap editing">
                <PencilLine size={13} strokeWidth={2} />
              </div>
              <div>
                <div className="reviews-legend-label editing">Editing</div>
                <div className="reviews-legend-desc">Admin enabled editing mode for re-scoring.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Filter panel */}
      <div className={`filter-panel${showFilter ? " show" : ""}`}>
        <div className="filter-panel-header">
          <div>
            <h4>
              <Filter size={14} style={{ verticalAlign: "-1px", marginRight: 4, opacity: 0.5 }} />
              Filter Reviews
            </h4>
            <div className="filter-panel-sub">Narrow reviews by juror, project, score state, and progress state.</div>
          </div>
          <button type="button" className="filter-panel-close" aria-label="Close filter panel" onClick={() => setShowFilter(false)}>&#215;</button>
        </div>
        <div className="filter-row">
          {/* Juror filter */}
          <div className="filter-group">
            <label>Juror</label>
            <CustomSelect
              value={filterJuror || ""}
              onChange={(v) => { setFilterJuror(v); setCurrentPage(1); }}
              options={[
                { value: "", label: "All jurors" },
                ...jurorOptions.map((name) => ({ value: name, label: name })),
              ]}
              ariaLabel="Juror"
            />
          </div>
          {/* Project filter */}
          <div className="filter-group">
            <label>Project</label>
            <CustomSelect
              value={filterProjectTitle || ""}
              onChange={(v) => { setFilterProjectTitle(v); setCurrentPage(1); }}
              options={[
                { value: "", label: "All projects" },
                ...projectOptions.map((title) => ({ value: title, label: title })),
              ]}
              ariaLabel="Project"
            />
          </div>
          {/* Score status filter */}
          <div className="filter-group">
            <label>Score Status</label>
            <CustomSelect
              value={Array.isArray(filterStatus) ? filterStatus[0] || "" : ""}
              onChange={(v) => {
                setFilterStatus(v ? [v] : null);
                setCurrentPage(1);
              }}
              options={[
                { value: "", label: "All" },
                { value: "scored", label: "Scored" },
                { value: "partial", label: "Partial" },
                { value: "empty", label: "Empty" },
              ]}
              ariaLabel="Score status"
            />
          </div>
          {/* Juror status filter */}
          <div className="filter-group">
            <label>Juror Status</label>
            <CustomSelect
              value={Array.isArray(filterJurorStatus) ? filterJurorStatus[0] || "" : ""}
              onChange={(v) => {
                setFilterJurorStatus(v ? [v] : null);
                setCurrentPage(1);
              }}
              options={[
                { value: "", label: "All" },
                { value: "completed", label: "Completed" },
                { value: "ready_to_submit", label: "Ready to Submit" },
                { value: "in_progress", label: "In Progress" },
                { value: "not_started", label: "Not Started" },
                { value: "editing", label: "Editing" },
              ]}
              ariaLabel="Juror status"
            />
          </div>
          <button type="button" className="btn btn-outline btn-sm filter-clear-btn" onClick={handleClearFilters}>
            <XCircle size={12} strokeWidth={2} style={{ opacity: 0.5, verticalAlign: "-1px" }} />
            {" "}Clear all
          </button>
        </div>
      </div>
      {/* Export panel */}
      <div className={`export-panel${showExport ? " show" : ""}`}>
        <div className="export-panel-header">
          <div>
            <h4>
              <Download size={14} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              Export Reviews
            </h4>
            <div className="export-panel-sub">Download individual juror evaluations with scores, comments, and timestamps.</div>
          </div>
          <button type="button" className="export-panel-close" aria-label="Close export panel" onClick={() => setShowExport(false)}>&#215;</button>
        </div>
        <div className="export-options">
          {[
            { id: "xlsx", iconLabel: "XLS", label: "Excel (.xlsx)", desc: "All reviews with juror details and comments", hint: "Best for sharing" },
            { id: "csv",  iconLabel: "CSV", label: "CSV (.csv)",    desc: "Raw review data for custom analysis",           hint: "Best for analysis" },
            { id: "pdf",  iconLabel: "PDF", label: "PDF Report",    desc: "Formatted review report for print / archive",   hint: "Best for archival" },
          ].map((opt) => (
            <div
              key={opt.id}
              className={`export-option${exportFormat === opt.id ? " selected" : ""}`}
              onClick={() => setExportFormat(opt.id)}
            >
              <span className="export-option-selected-pill">Selected</span>
              <div className={`export-option-icon export-option-icon--${opt.id}`}>
                <span className="file-icon"><span className="file-icon-label">{opt.iconLabel}</span></span>
              </div>
              <div className="export-option-title">{opt.label}</div>
              <div className="export-option-desc">{opt.desc}</div>
              <div className="export-option-hint">{opt.hint}</div>
            </div>
          ))}
        </div>
        <div className="export-footer">
          <div className="export-footer-info">
            <div className="export-footer-format">{exportFormat === "xlsx" ? "Excel (.xlsx)" : exportFormat === "pdf" ? "PDF Report" : "CSV (.csv)"} · Reviews</div>
            <div className="export-footer-meta">{sorted.length} reviews · {uniqueJurors} jurors{periodName ? ` · ${periodName}` : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="btn btn-outline btn-sm" aria-label="Send report via email" onClick={() => setSendOpen(true)} style={{ borderRadius: 999, padding: "9px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Send size={14} />
              {" "}Send
            </button>
            <button type="button" className="btn btn-primary btn-sm export-download-btn" onClick={handleExport}>
              <Download size={14} />
              Download {exportFormat === "xlsx" ? "Excel" : exportFormat === "pdf" ? "PDF" : "CSV"}
            </button>
          </div>
        </div>
      </div>
      <SendReportModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        format={exportFormat}
        formatLabel={`${exportFormat === "xlsx" ? "Excel (.xlsx)" : exportFormat === "pdf" ? "PDF Report" : "CSV (.csv)"} · Reviews`}
        meta={`${sorted.length} reviews · ${uniqueJurors} jurors${periodName ? ` · ${periodName}` : ""}`}
        reportTitle="Reviews"
        periodName={periodName}
        organization={activeOrganization?.name || ""}
        department={activeOrganization?.institution || ""}
        generateFile={async (fmt) => {
          const header = columns.map(c => c.label);
          const rows   = sorted.map(r => columns.map(c => c.getValue(r)));
          return generateTableBlob(fmt, {
            filenameType: "Reviews", sheetName: "Reviews", periodName,
            tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
            department: activeOrganization?.institution || "", pdfTitle: "VERA — Reviews",
            header, rows,
          });
        }}
      />
      {/* Table */}
      <div className="table-wrap table-wrap--split">
        <table className="reviews-table table-standard table-pill-balance" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: 148 }} />{/* Juror */}
            <col style={{ width: 44 }} />{/* No */}
            <col />{/* Project — flexible */}
            <col style={{ width: 110 }} />{/* Team Members */}
            {scoreCols.filter(c => c.key !== "total").map(c => (
              <col key={c.key} style={{ width: 60 }} />
            ))}{/* Each criterion score */}
            <col style={{ width: 64 }} />{/* Total */}
            <col style={{ width: 72 }} />{/* Status */}
            <col style={{ width: 60 }} />{/* Progress */}
            <col style={{ width: 72 }} />{/* Comment */}
            <col style={{ width: 76 }} />{/* Submitted At */}
          </colgroup>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={[
                    col.sortKey ? `sortable${sortKey === col.sortKey ? ' sorted' : ''}` : '',
                    col.thClass || '',
                  ].filter(Boolean).join(' ') || undefined}
                  style={col.style}
                  onClick={col.sortKey ? () => handleSort(col.sortKey) : undefined}
                >
                  {col.label}
                  {col.sortKey && <SortIcon colKey={col.sortKey} sortKey={sortKey} sortDir={sortDir} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={6 + (scoreCols.length)} className="reviews-empty-row">
                  No reviews match the current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => {
                const isPartialRow = row.effectiveStatus === "partial";
                const submittedTs = formatTs(row.finalSubmittedAt);
                return (
                  <tr key={`${row.jurorId ?? row.juryName}__${row.projectId ?? row.title}__${i}`} className={isPartialRow ? "partial-row" : ""}>
                    <td className="col-juror">
                      <JurorBadge name={row.juryName} affiliation={row.affiliation} size="sm" />
                    </td>
                    <td className="col-no text-center" data-project={row.title || row.projectName || ""}>
                      {row.groupNo != null
                        ? <span className="project-no-badge">P{row.groupNo}</span>
                        : <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>—</span>}
                    </td>
                    <td className="col-project text-sm">{row.title || row.projectName || "—"}</td>
                    <td className="col-members text-xs text-muted">
                      <StudentNames names={row.students} />
                      {!row.students ? "—" : null}
                    </td>
                    {scoreCols.filter((c) => c.key !== "total").map((col) => {
                      const val = row[col.key];
                      const missing = val === null || val === undefined;
                      return (
                        <td key={col.key} className={`col-score${missing ? " missing" : ""}`} data-label={col.label.split(" / ")[0]}>
                          {missing ? "—" : val}
                        </td>
                      );
                    })}
                    <td className="col-total">
                      {row.total != null ? (
                        <>
                          <span className="total-score-value">{row.total}</span>
                          {isPartialRow && (
                            <span style={{ marginLeft: 2, width: 12, height: 12, borderRadius: "50%", background: "rgba(217,119,6,0.12)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "var(--warning)", fontWeight: 700 }}>!</span>
                          )}
                        </>
                      ) : "—"}
                    </td>
                    <td className="col-status text-center">
                      <ScoreStatusPill status={row.effectiveStatus} />
                    </td>
                    <td className="col-progress text-center">
                      <JurorPill status={row.jurorStatus} submittedTs={submittedTs} />
                    </td>
                    <td className="col-comment">
                      {row.comments ? (
                        <PremiumTooltip text={row.comments}>
                          <span className="col-comment-inner">
                            <MessageSquare size={10} style={{ verticalAlign: "-1px", marginRight: 3, opacity: 0.4 }} />
                            {row.comments}
                          </span>
                        </PremiumTooltip>
                      ) : "—"}
                    </td>
                    <td className="col-submitted text-right vera-datetime-text">
                      {submittedTs && submittedTs !== "—" ? submittedTs : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={sorted.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        itemLabel="reviews"
      />
      {/* Footer note */}
      {partialCount > 0 && (
        <div className="reviews-footer-note">
          <span className="flag-dot">!</span>
          Partial record — one or more criteria not yet scored by the juror.
        </div>
      )}
    </div>
  );
}

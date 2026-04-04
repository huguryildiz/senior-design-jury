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
import { useReviewsFilters } from "../hooks/useReviewsFilters";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/auth";
import SendReportModal from "@/admin/modals/SendReportModal";
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
import "../../styles/pages/reviews.css";

// initials removed — using JurorBadge component
function _unused_initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Score status pill ─────────────────────────────────────────
function ScorePill({ status }) {
  if (status === "scored") {
    return (
      <span className="pill pill-scored">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m20 6-11 11-5-5" />
        </svg>
        Scored
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="pill pill-partial">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
        </svg>
        Partial
      </span>
    );
  }
  return (
    <span className="pill pill-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
      </svg>
      Empty
    </span>
  );
}

// ── Juror progress pill ───────────────────────────────────────
function JurorPill({ status }) {
  if (status === "completed") {
    return (
      <span className="pill pill-completed">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m20 6-11 11-5-5" />
        </svg>
        Completed
      </span>
    );
  }
  if (status === "ready_to_submit") {
    return (
      <span className="pill pill-ready">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
        </svg>
        Ready to Submit
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="pill pill-progress">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 1.8" />
        </svg>
        In Progress
      </span>
    );
  }
  if (status === "editing") {
    return (
      <span className="pill pill-editing">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Editing
      </span>
    );
  }
  return (
    <span className="pill pill-not-started">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
      </svg>
      Not Started
    </span>
  );
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
export default function ReviewsPage({
  data,
  jurors,
  assignedJurors,
  groups,
  periodName,
  summaryData,
  loading,
  criteriaConfig = [],
}) {
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
    updatedDateError,
    completedDateError,
    updatedParsedFrom, updatedParsedTo, updatedParsedFromMs, updatedParsedToMs, isUpdatedInvalidRange,
    completedParsedFrom, completedParsedTo, completedParsedFromMs, completedParsedToMs, isCompletedInvalidRange,
    sortKey, setSortKey,
    sortDir, setSortDir,
    pageSize, setPageSize,
    currentPage, setCurrentPage,
    multiSearchQuery, setMultiSearchQuery,
    scoreCols, scoreKeys, scoreMaxByKey,
    buildEmptyFilters, updateScoreFilter,
  } = filters;

  const _toast = useToast();
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

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(pageStart, pageStart + pageSize);

  // ── KPI stats (from full enriched set) ───────────────────
  const totalReviews = enriched.length;
  const uniqueJurors = new Set(enriched.map((r) => r.jurorId || r.juryName)).size;
  const uniqueProjects = new Set(enriched.map((r) => r.projectId || r.title)).size;
  const partialCount = enriched.filter((r) => r.effectiveStatus === "partial").length;
  const scoredRows = enriched.filter((r) => r.total != null && Number.isFinite(Number(r.total)));
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
    const empty = buildEmptyFilters();
    scoreKeys.forEach((key) => {
      updateScoreFilter(key, "min", "");
      updateScoreFilter(key, "max", "");
    });
    setCurrentPage(1);
  }

  async function handleExport() {
    try {
      const header = [
        "Juror", "Affiliation",
        ...scoreCols.filter((c) => c.key !== "total").map((c) => c.label),
        `Total (${criteriaConfig.reduce((s, c) => s + (c.max || 0), 0)})`, "Score Status", "Juror Status", "Comment", "Submitted",
      ];
      const rows = sorted.map((r) => [
        r.juryName ?? "",
        r.affiliation ?? "",
        ...scoreCols.filter((c) => c.key !== "total").map((c) => r[c.key] ?? ""),
        r.total ?? "",
        r.effectiveStatus ?? "",
        r.jurorStatus ?? "",
        r.comments ?? "",
        formatTs(r.finalSubmittedAt || r.updatedAt),
      ]);

      await downloadTable(exportFormat, {
        filenameType: "Reviews",
        sheetName: "Reviews",
        periodName,
        tenantCode: activeOrganization?.code || "",
        organization: activeOrganization?.name || "",
        department: activeOrganization?.institution_name || "",
        pdfTitle: "VERA — Reviews",
        pdfSubtitle: `${periodName || "All Periods"} · ${sorted.length} reviews · ${uniqueJurors} jurors`,
        header,
        rows,
        colWidths: [24, 24, ...scoreCols.filter((c) => c.key !== "total").map(() => 10), 8, 12, 14, 32, 18],
      });
      setShowExport(false);
      _toast.success("Reviews exported");
    } catch (e) {
      _toast.error(e?.message || "Export failed");
    }
  }

  // ── Pagination ────────────────────────────────────────────
  function pageNums() {
    const range = [];
    const delta = 2;
    for (let i = Math.max(1, safePage - delta); i <= Math.min(totalPages, safePage + delta); i++) {
      range.push(i);
    }
    return range;
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
        <div>
          <div className="page-title">Reviews</div>
          <div className="page-desc">Inspect individual juror evaluations across projects and criteria.</div>
        </div>
        <div className="reviews-actions">
          <div style={{ position: "relative" }}>
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-tertiary)", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="reviews-search"
              type="text"
              placeholder="Search juror or project..."
              value={multiSearchQuery}
              onChange={(e) => { setMultiSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <button
            className={`btn btn-outline btn-sm${showFilter ? " active" : ""}`}
            onClick={() => { setShowFilter((v) => !v); setShowExport(false); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
          </button>
          <div style={{ flex: 1 }} />
          <button
            className={`btn btn-outline btn-sm${showExport ? " active" : ""}`}
            onClick={() => { setShowExport((v) => !v); setShowFilter(false); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Filter status banner */}
      {activeFilterCount > 0 && (
        <div className="fb-banner fbb-success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
          </svg>
          <span className="fb-banner-text">
            {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} applied — showing {sorted.length} of {enriched.length} result{enriched.length !== 1 ? "s" : ""}
          </span>
          <span
            className="fb-banner-action"
            style={{ color: "var(--fb-success-text)", cursor: "pointer" }}
            onClick={handleClearFilters}
          >
            Clear filters →
          </span>
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

      {/* Status legend */}
      <div className="reviews-status-legend" role="note" aria-label="Status legend">
        <div className="reviews-status-legend-row-inline">
          <span className="reviews-status-legend-title">Score</span>
          <span className="status-pill status-scored" data-tip="All criteria are scored for this row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            Scored
          </span>
          <span className="status-pill status-partial" data-tip="At least one criterion is missing">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" strokeDasharray="2.5 2.5" /><circle cx="12" cy="12" r="1.3" />
            </svg>
            Partial
          </span>
          <span className="status-pill status-empty" data-tip="No score has been entered yet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /></svg>
            Empty
          </span>
        </div>
        <div className="legend-sep" />
        <div className="reviews-status-legend-row-inline">
          <span className="reviews-status-legend-title">Juror</span>
          <span className="status-pill status-completed" data-tip="Final submission is completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M9.2 12.4 11.3 14.5 15 10.8" />
            </svg>
            Completed
          </span>
          <span className="status-pill status-ready" data-tip="All groups scored, ready for submission">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
            </svg>
            Ready to Submit
          </span>
          <span className="status-pill status-progress" data-tip="Scoring has started but is not complete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 1.8" />
            </svg>
            In Progress
          </span>
          <span className="status-pill status-not-started" data-tip="No scoring activity yet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /></svg>
            Not Started
          </span>
          <span className="status-pill status-editing" data-tip="Editing mode is enabled for this juror">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Editing
          </span>
        </div>
      </div>

      {/* Filter panel */}
      <div className={`filter-panel${showFilter ? " show" : ""}`}>
        <div className="filter-panel-header">
          <div>
            <h4>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 4, opacity: 0.5 }}>
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter Reviews
            </h4>
            <div className="filter-panel-sub">Narrow reviews by juror, project, score state, and progress state.</div>
          </div>
          <button className="filter-panel-close" onClick={() => setShowFilter(false)}>&#215;</button>
        </div>
        <div className="filter-row">
          {/* Juror filter */}
          <div className="filter-group">
            <label>Juror</label>
            <select
              className="filter-select"
              value={filterJuror || ""}
              onChange={(e) => { setFilterJuror(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All jurors</option>
              {jurorOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          {/* Project filter */}
          <div className="filter-group">
            <label>Project</label>
            <select
              className="filter-select"
              value={filterProjectTitle || ""}
              onChange={(e) => { setFilterProjectTitle(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All projects</option>
              {projectOptions.map((title) => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>
          {/* Score status filter */}
          <div className="filter-group">
            <label>Score Status</label>
            <select
              className="filter-select"
              value={Array.isArray(filterStatus) ? filterStatus[0] || "" : ""}
              onChange={(e) => {
                const v = e.target.value;
                setFilterStatus(v ? [v] : null);
                setCurrentPage(1);
              }}
            >
              <option value="">All</option>
              <option value="scored">Scored</option>
              <option value="partial">Partial</option>
              <option value="empty">Empty</option>
            </select>
          </div>
          {/* Juror status filter */}
          <div className="filter-group">
            <label>Juror Status</label>
            <select
              className="filter-select"
              value={Array.isArray(filterJurorStatus) ? filterJurorStatus[0] || "" : ""}
              onChange={(e) => {
                const v = e.target.value;
                setFilterJurorStatus(v ? [v] : null);
                setCurrentPage(1);
              }}
            >
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="ready_to_submit">Ready to Submit</option>
              <option value="in_progress">In Progress</option>
              <option value="not_started">Not Started</option>
              <option value="editing">Editing</option>
            </select>
          </div>
          <button className="btn btn-outline btn-sm filter-clear-btn" onClick={handleClearFilters}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
            Clear all
          </button>
        </div>
      </div>

      {/* Export panel */}
      <div className={`export-panel${showExport ? " show" : ""}`}>
        <div className="export-panel-header">
          <div>
            <h4>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Reviews
            </h4>
            <div className="export-panel-sub">Download individual juror evaluations with scores, comments, and timestamps.</div>
          </div>
          <button className="export-panel-close" onClick={() => setShowExport(false)}>&#215;</button>
        </div>
        <div className="export-options">
          {[
            { id: "xlsx", label: "Excel (.xlsx)", desc: "All reviews with juror details and comments", hint: "Best for sharing" },
            { id: "csv", label: "CSV (.csv)", desc: "Raw review data for custom analysis", hint: "Best for analysis" },
            { id: "pdf", label: "PDF Report", desc: "Formatted review report for print / archive", hint: "Best for archival" },
          ].map((opt) => (
            <div
              key={opt.id}
              className={`export-option${exportFormat === opt.id ? " selected" : ""}`}
              onClick={() => setExportFormat(opt.id)}
            >
              {exportFormat === opt.id && <span className="export-option-selected-pill">Selected</span>}
              <div className={`export-option-icon export-option-icon--${opt.id}`}>
                <span className="file-icon"><span className="file-icon-label">{opt.id.toUpperCase()}</span></span>
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
            <button className="btn btn-outline btn-sm" onClick={() => setSendOpen(true)} title="Send report via email" style={{ borderRadius: 999, padding: "9px 18px", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z" /><path d="m22 2-11 11" /></svg>
              {" "}Send
            </button>
            <button className="btn btn-primary btn-sm export-download-btn" onClick={handleExport}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
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
        department={activeOrganization?.institution_name || ""}
        generateFile={async (fmt) => {
          const header = [
            "Juror", "Affiliation",
            ...scoreCols.filter((c) => c.key !== "total").map((c) => c.label),
            `Total (${criteriaConfig.reduce((s, c) => s + (c.max || 0), 0)})`, "Score Status", "Juror Status", "Comment", "Submitted",
          ];
          const rows = sorted.map((r) => [
            r.juryName ?? "", r.affiliation ?? "",
            ...scoreCols.filter((c) => c.key !== "total").map((c) => r[c.key] ?? ""),
            r.total ?? "", r.effectiveStatus ?? "", r.jurorStatus ?? "", r.comments ?? "",
            formatTs(r.finalSubmittedAt || r.updatedAt),
          ]);
          return generateTableBlob(fmt, {
            filenameType: "Reviews", sheetName: "Reviews", periodName,
            tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
            department: activeOrganization?.institution_name || "", pdfTitle: "VERA — Reviews",
            header, rows,
          });
        }}
      />

      {/* Table */}
      <div className="table-wrap" style={{ borderRadius: "var(--radius) var(--radius) 0 0" }}>
        <table className="reviews-table">
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => handleSort("juryName")}>
                Juror <SortIcon colKey="juryName" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="text-center" style={{ width: 46, cursor: "pointer" }} onClick={() => handleSort("groupNo")}>
                No <SortIcon colKey="groupNo" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => handleSort("title")}>
                Project <SortIcon colKey="title" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th>Team Members</th>
              {scoreCols.filter((c) => c.key !== "total").map((col) => (
                <th
                  key={col.key}
                  className="text-right"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label.split(" / ")[0]} <SortIcon colKey={col.key} sortKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
              <th className="text-right" style={{ cursor: "pointer" }} onClick={() => handleSort("total")}>
                Total <SortIcon colKey="total" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="text-center">Status</th>
              <th className="text-center">Progress</th>
              <th>Comment</th>
              <th className="text-right" style={{ cursor: "pointer" }} onClick={() => handleSort("finalSubmittedMs")}>
                Submitted <SortIcon colKey="finalSubmittedMs" sortKey={sortKey} sortDir={sortDir} />
              </th>
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
                    <td>
                      <JurorBadge name={row.juryName} affiliation={row.affiliation} size="sm" />
                    </td>
                    <td className="text-center mono" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                      {row.groupNo ?? "—"}
                    </td>
                    <td className="text-sm">{row.title || row.projectName || "—"}</td>
                    <td className="text-xs text-muted">{row.students || "—"}</td>
                    {scoreCols.filter((c) => c.key !== "total").map((col) => {
                      const val = row[col.key];
                      const missing = val === null || val === undefined;
                      return (
                        <td key={col.key} className={`col-score${missing ? " missing" : ""}`}>
                          {missing ? "—" : val}
                        </td>
                      );
                    })}
                    <td className="col-total">
                      {row.total != null ? (
                        <>
                          {row.total}
                          {isPartialRow && (
                            <span style={{ marginLeft: 2, width: 12, height: 12, borderRadius: "50%", background: "rgba(217,119,6,0.12)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "var(--warning)", fontWeight: 700 }}>!</span>
                          )}
                        </>
                      ) : "—"}
                    </td>
                    <td className="text-center">
                      <ScorePill status={row.effectiveStatus} />
                    </td>
                    <td className="text-center">
                      <JurorPill status={row.jurorStatus} />
                    </td>
                    <td className="col-comment">
                      {row.comments ? (
                        <>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "-1px", marginRight: 3, opacity: 0.4 }}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          {row.comments}
                        </>
                      ) : "—"}
                    </td>
                    <td className="col-submitted text-right">
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
      {totalPages > 1 && (
        <div className="reviews-pagination">
          <div className="reviews-pagination-info">
            {sorted.length === 0
              ? "No results"
              : `${pageStart + 1}–${Math.min(pageStart + pageSize, sorted.length)} of ${sorted.length}`}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button
              className="reviews-page-btn"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(1)}
              title="First page"
            >«</button>
            <button
              className="reviews-page-btn"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Previous page"
            >‹</button>
            {pageNums().map((n) => (
              <button
                key={n}
                className={`reviews-page-btn${n === safePage ? " active" : ""}`}
                onClick={() => setCurrentPage(n)}
              >{n}</button>
            ))}
            <button
              className="reviews-page-btn"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Next page"
            >›</button>
            <button
              className="reviews-page-btn"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Last page"
            >»</button>
          </div>
          <div className="reviews-page-size">
            Rows:
            {[15, 25, 50, 100].map((n) => (
              <button
                key={n}
                className={`reviews-page-btn${pageSize === n ? " active" : ""}`}
                onClick={() => { setPageSize(n); setCurrentPage(1); }}
              >{n}</button>
            ))}
          </div>
        </div>
      )}

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

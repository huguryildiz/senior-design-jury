// src/admin/ScoreGrid.jsx
// ── Juror × group evaluation grid ────────────────────────────
// - Column-based sorting (click group header: desc → asc → reset)
// - Sticky header + frozen first column
// - Juror column text filter with Escape-to-close
// - Group score column numeric range filters (0–100, auto-apply)
// - Scored-only averages (fully scored cells only)

import { useState, useRef, useCallback, memo, Component, useEffect } from "react";
import { FilterPopoverPortal } from "./components";
import {
  getCellState,
  getPartialTotal,
  jurorStatusMeta,
} from "./scoreHelpers";
import {
  FilterIcon,
  InfoIcon,
  DownloadIcon,
  XIcon,
} from "../shared/Icons";
import { CRITERIA } from "../config";
import { useGridSort } from "./useGridSort";
import { useScoreGridData } from "./useScoreGridData";
import { useScrollSync } from "./useScrollSync";
import { useGridExport } from "./useGridExport";

// ── Module-level constants ─────────────────────────────────────
// Inline scroll props: focus/touch activates horizontal scroll on long juror names
const INLINE_SCROLL_PROPS = {
  onTouchStart: (e) => { const el = e.currentTarget; if (el?.classList) el.classList.add("is-scrollable"); },
  onTouchMove:  (e) => { const el = e.currentTarget; if (el?.classList) el.classList.add("is-scrollable"); },
};

const LEGEND_JUROR_STATES = ["completed", "ready_to_submit", "in_progress", "editing", "not_started"];

// ── Local utility ──────────────────────────────────────────────
function toFiniteNumber(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function clampRangeInput(raw, min = 0, max = 100) {
  if (raw === "") return "";
  const n = toFiniteNumber(raw);
  if (n === null) return raw;
  return String(Math.min(max, Math.max(min, n)));
}

// ── Cell helpers ───────────────────────────────────────────────
const cellClassName = (state, isFinal = false) => {
  if (state === "scored") return isFinal ? "matrix-cell matrix-cell-scored-final" : "matrix-cell matrix-cell-scored";
  if (state === "partial") return "matrix-cell matrix-cell-partial";
  return "matrix-cell matrix-cell-empty";
};

const cellText = (state, entry) => {
  if (state === "scored")  return entry.total;
  if (state === "partial") return getPartialTotal(entry);
  return "—";
};

// Hover tooltip: per-criteria breakdown, driven by CRITERIA from config.js
const cellTooltip = (state, entry) => {
  if (!entry || state === "empty") return undefined;
  const parts = CRITERIA.map((c) => `${c.shortLabel || c.label}: ${entry[c.id] != null ? entry[c.id] : "—"}`);
  const line1 = parts.slice(0, 2).join(" · ");
  const line2Base = parts.slice(2).join(" · ");
  const line2 = state === "partial" ? `${line2Base} (partial)` : line2Base;
  return `${line1}\n${line2}`;
};

// ── Error boundary ─────────────────────────────────────────────
class GridErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("[ScoreGrid] Render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="matrix-wrap">
          <div className="admin-section-header">
            <div className="section-label">Evaluation Grid</div>
          </div>
          <div className="empty-msg" style={{ color: "#dc2626" }}>
            Grid could not be displayed. Try refreshing the page.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Sub-components ─────────────────────────────────────────────

const JurorCell = memo(function JurorCell({ juror, workflowState }) {
  const wfState  = workflowState ?? "not_started";
  const meta     = jurorStatusMeta[wfState] ?? jurorStatusMeta.not_started;
  const Icon     = meta.icon;
  const fullName = juror.dept ? `${juror.name} (${juror.dept})` : juror.name;
  return (
    <div className="matrix-juror-inner">
      <span
        className={`matrix-status-icon ${meta.colorClass}`}
        title={meta.label}
        aria-hidden="true"
      >
        <Icon />
      </span>
      <span className="matrix-juror-name" title={fullName} {...INLINE_SCROLL_PROPS}>
        <span className="matrix-juror-name-text">{juror.name}</span>
        {juror.dept && <span className="matrix-juror-dept">({juror.dept})</span>}
      </span>
    </div>
  );
});

function MatrixLegend({
  sortMode,
  sortGroupId,
  sortGroupDir,
  sortJurorDir,
  groups,
  filterLabel,
  onClearFilter,
  onClearSort,
  groupFilterChips,
  onClearGroupFilter,
}) {
  const sortLabel = (() => {
    if (sortMode === "group" && sortGroupId !== null) {
      const g   = groups.find((g) => g.id === sortGroupId);
      const dir = sortGroupDir === "desc" ? "high → low" : "low → high";
      return `Sorted by: ${g?.label ?? "Group"} (${dir})`;
    }
    if (sortMode === "juror") {
      return `Sorted by: Name (${sortJurorDir === "asc" ? "A → Z" : "Z → A"})`;
    }
    return null;
  })();

  return (
    <div className="matrix-subtitle">
      {/* Cell state legend */}
      <div className="matrix-legend-row legend-scroll-row">
        <div className="matrix-legend-scroll" aria-label="Cell state legend">
          <span className="matrix-legend-label">Cells</span>
          <span className="matrix-legend-item"><span className="matrix-legend-dot scored-dot" />Scored</span>
          <span className="matrix-legend-item"><span className="matrix-legend-dot partial-dot" />Partial</span>
          <span className="matrix-legend-item"><span className="matrix-legend-dot empty-dot" />Empty</span>
        </div>
      </div>
      {/* Juror workflow state legend */}
      <div className="matrix-legend-row matrix-icon-legend legend-scroll-row">
        <div className="matrix-legend-scroll" aria-label="Juror status legend">
          <span className="matrix-legend-label">Juror</span>
          {LEGEND_JUROR_STATES.map((key) => {
            const meta = jurorStatusMeta[key];
            const Icon = meta.icon;
            return (
              <span key={key} className="matrix-icon-legend-item">
                <span className={`matrix-status-icon ${meta.colorClass}`}><Icon /></span>
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>
      {/* Toolbar: filter count + active filter/sort indicators */}
      <div className="matrix-legend-row matrix-toolbar-row">
        {sortLabel && (
          <button
            type="button"
            className="matrix-sort-indicator"
            onClick={onClearSort}
            title="Clear sort"
            aria-label="Clear sort"
          >
            <span className="matrix-sort-text">{sortLabel}</span>
            <span className="matrix-sort-close" aria-hidden="true">×</span>
          </button>
        )}
        {filterLabel && (
          <button
            type="button"
            className="filter-chip"
            onClick={onClearFilter}
            title={`Clear filter: ${filterLabel}`}
            aria-label={`Clear filter: ${filterLabel}`}
          >
            <span className="chip-label">Juror</span>
            <span className="chip-value">{filterLabel}</span>
            <XIcon />
          </button>
        )}
        {groupFilterChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="filter-chip"
            onClick={() => onClearGroupFilter(chip.id)}
            title={`Clear filter: ${chip.label}${chip.value ? ` ${chip.value}` : ""}`}
            aria-label={`Clear filter: ${chip.label}${chip.value ? ` ${chip.value}` : ""}`}
          >
            <span className="chip-label">{chip.label}</span>
            {chip.value && <span className="chip-value">{chip.value}</span>}
            <XIcon />
          </button>
        ))}
      </div>
      <div className="matrix-scroll-hint">
        <span className="matrix-scroll-icon" aria-hidden="true"><InfoIcon /></span>
        <span>Scroll horizontally to view all groups. Long names can be swiped on touch.</span>
      </div>
    </div>
  );
}

const AVG_TIP_TEXT = "Averages include only completed jurors.";

// AverageRow: info icon shows a fixed-position tooltip via callbacks
const AverageRow = memo(function AverageRow({ groups, averages, onShowTip, onHideTip }) {
  return (
    <tfoot>
      <tr className="matrix-avg-row">
        <td className="matrix-juror matrix-avg-label">
          <div className="matrix-juror-inner">
            <span>Average</span>
            <span
              className="matrix-avg-tooltip"
              aria-label={AVG_TIP_TEXT}
              tabIndex={0}
              onMouseEnter={(e) => onShowTip(e, AVG_TIP_TEXT)}
              onMouseLeave={onHideTip}
              onFocus={(e) => onShowTip(e, AVG_TIP_TEXT)}
              onBlur={onHideTip}
            >
              <InfoIcon />
            </span>
          </div>
        </td>
        {averages.map((avg, i) => (
          <td key={groups[i].id} className="matrix-avg-cell">
            {avg !== null ? avg : "—"}
          </td>
        ))}
      </tr>
    </tfoot>
  );
});

// ── Inner component ────────────────────────────────────────────
// Props:
//   data    – raw rows
//   jurors  – { key, name, dept }[]  (from AdminPanel uniqueJurors)
//   groups  – { id, label }[]
function ScoreGridInner({ data, jurors, groups, semesterName = "" }) {
  // Scroll refs (declared before the scroll-sync useEffect)
  const topScrollRef   = useRef(null);
  const tableScrollRef = useRef(null);

  // Filter popover state
  const [activeFilterCol,  setActiveFilterCol]  = useState(null);
  const [anchorRect,       setAnchorRect]        = useState(null);
  const [anchorEl,         setAnchorEl]          = useState(null);

  // Draft state for the currently open group score filter
  const [groupScoreDraft, setGroupScoreDraft] = useState({ min: "", max: "" });

  // Fixed-position tooltip (escapes overflow-x:auto clipping)
  const [cellTip, setCellTip] = useState(null); // { x, y, text } | null
  const showCellTip = useCallback((e, text) => {
    const r = e.currentTarget.getBoundingClientRect();
    setCellTip({ x: r.left + r.width / 2, y: r.top - 8, text });
  }, []);
  const hideCellTip = useCallback(() => setCellTip(null), []);
  // Hide tooltip when table is scrolled (position would be stale)
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", hideCellTip, { passive: true });
    return () => el.removeEventListener("scroll", hideCellTip);
  }, [hideCellTip]);

  const {
    lookup,
    jurorFinalMap,
    jurorWorkflowMap,
    groupAverages,
    buildExportRows,
  } = useScoreGridData({ data, jurors, groups });

  // All sort + filter logic extracted to custom hook
  const {
    sortGroupId, sortGroupDir, sortJurorDir, sortMode, jurorFilter, groupScoreFilters,
    visibleJurors, toggleGroupSort, toggleJurorSort, setJurorFilter, clearSort,
    setGroupScoreFilter, clearGroupScoreFilter,
  } = useGridSort(jurors, groups, lookup);

  const {
    requestExport,
  } = useGridExport({
    buildExportRows,
    groups,
    semesterName,
    visibleJurors,
  });

  // ── Scroll sync: top phantom bar ↔ table horizontal scroll ──
  useScrollSync(topScrollRef, tableScrollRef);

  const minFirstCol = 180;
  const scoreColWidth = 72;
  const scoreColsWidth = groups.length * scoreColWidth;
  const minTableWidth = scoreColsWidth + minFirstCol;
  const tableStyle = {
    width: "100%",
    minWidth: `${minTableWidth}px`,
    "--matrix-first-col": `${minFirstCol}px`,
    "--matrix-score-col": `${scoreColWidth}px`,
  };

  const handleMatrixWheel = useCallback((e) => {
    const el = tableScrollRef.current;
    if (!el) return;
    if (e.shiftKey) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    if (el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft += e.deltaY;
    e.preventDefault();
  }, []);

  // ── Escape key closes filter popover ───────────────────────
  const closePopover = useCallback(() => {
    setActiveFilterCol(null);
    setAnchorRect(null);
    setAnchorEl(null);
  }, []);

  // ── Popover helpers ─────────────────────────────────────────
  const toggleFilterCol = useCallback((colId, evt) => {
    const rect = evt?.currentTarget?.getBoundingClientRect?.();
    const el   = evt?.currentTarget ?? null;
    setActiveFilterCol((prev) => {
      const next = prev === colId ? null : colId;
      if (next && rect) { setAnchorRect(rect); setAnchorEl(el); }
      if (!next)        { setAnchorRect(null); setAnchorEl(null); }
      return next;
    });
  }, []);

  // Open group score filter: sync draft from persisted filter state first
  const openGroupFilter = useCallback((groupId, evt) => {
    const current = groupScoreFilters[groupId] || { min: "", max: "" };
    const min = clampRangeInput(current.min ?? "");
    const max = clampRangeInput(current.max ?? "");
    setGroupScoreDraft({ min, max });
    if (min !== (current.min ?? "") || max !== (current.max ?? "")) {
      setGroupScoreFilter(groupId, min, max);
    }
    toggleFilterCol(groupId, evt);
  }, [groupScoreFilters, setGroupScoreFilter, toggleFilterCol]);

  const isJurorFilterActive = !!jurorFilter || activeFilterCol === "juror";

  // Active group filter chips for MatrixLegend
  const activeGroupFilterChips = groups
    .filter((g) => { const f = groupScoreFilters[g.id]; return f?.min || f?.max; })
    .map((g) => {
      const { min, max } = groupScoreFilters[g.id];
      const rawLabel = String(g.groupNo ?? g.label ?? "").trim();
      const label = /^group\b/i.test(rawLabel) ? rawLabel : `Group ${rawLabel}`;
      const value = min && max ? `${min}–${max}`
                  : min       ? `≥${min}`
                  :              `≤${max}`;
      return { id: g.id, label, value };
    });

  if (!jurors.length) {
    return (
      <div className="matrix-wrap">
        <div className="admin-section-header">
          <div className="section-label">Evaluation Grid</div>
        </div>
        <div className="empty-msg">No data yet.</div>
      </div>
    );
  }

  // Group score filter popover content (rendered when a group column is active)
  const groupFilterPopover = (() => {
    const groupId = activeFilterCol && activeFilterCol !== "juror" ? activeFilterCol : null;
    if (!groupId) return null;
    const { min: draftMin, max: draftMax } = groupScoreDraft;
    const minNum   = toFiniteNumber(draftMin);
    const maxNum   = toFiniteNumber(draftMax);
    const hasError = minNum !== null && maxNum !== null && minNum > maxNum;
    return (
      <FilterPopoverPortal
        open={true}
        anchorRect={anchorRect}
        anchorEl={anchorEl}
        onClose={closePopover}
        className="col-filter-popover col-filter-popover-portal col-filter-popover-number"
        contentKey={`${draftMin}|${draftMax}`}
        trapFocus
      >
        <div className="range-field">
          <label>Min</label>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            value={draftMin}
            onChange={(e) => {
              const nextMin = clampRangeInput(e.target.value);
              setGroupScoreDraft((p) => {
                const next = { ...p, min: nextMin };
                const nextMinNum = toFiniteNumber(next.min);
                const nextMaxNum = toFiniteNumber(next.max);
                if (!(nextMinNum !== null && nextMaxNum !== null && nextMinNum > nextMaxNum)) {
                  setGroupScoreFilter(groupId, next.min, next.max);
                }
                return next;
              });
            }}
          />
        </div>
        <div className="range-field">
          <label>Max</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            value={draftMax}
            onChange={(e) => {
              const nextMax = clampRangeInput(e.target.value);
              setGroupScoreDraft((p) => {
                const next = { ...p, max: nextMax };
                const nextMinNum = toFiniteNumber(next.min);
                const nextMaxNum = toFiniteNumber(next.max);
                if (!(nextMinNum !== null && nextMaxNum !== null && nextMinNum > nextMaxNum)) {
                  setGroupScoreFilter(groupId, next.min, next.max);
                }
                return next;
              });
            }}
          />
        </div>
        {hasError && <div className="range-error">Min must be ≤ Max.</div>}
        {(draftMin || draftMax) && (
          <button
            type="button"
            className="col-filter-clear"
            onClick={() => {
              clearGroupScoreFilter(groupId);
              setGroupScoreDraft({ min: "", max: "" });
              closePopover();
            }}
          >
            Clear
          </button>
        )}
      </FilterPopoverPortal>
    );
  })();

  return (
    <div className="matrix-wrap">
      <div className="admin-section-header">
        <div className="section-label">Evaluation Grid</div>
        <div className="admin-section-actions">
          <button className="xlsx-export-btn matrix-export-btn" onClick={requestExport}>
            <DownloadIcon />
            <span>Excel</span>
          </button>
        </div>
      </div>

      <MatrixLegend
        sortMode={sortMode}
        sortGroupId={sortGroupId}
        sortGroupDir={sortGroupDir}
        sortJurorDir={sortJurorDir}
        groups={groups}
        filterLabel={jurorFilter}
        onClearFilter={() => { setJurorFilter(""); closePopover(); }}
        onClearSort={clearSort}
        groupFilterChips={activeGroupFilterChips}
        onClearGroupFilter={(groupId) => { clearGroupScoreFilter(groupId); }}
      />

      <div className="matrix-scroll-top" ref={topScrollRef} aria-hidden="true">
        <div className="matrix-scroll-top-inner" />
      </div>
      <div className="matrix-scroll-wrap">
        <div className="matrix-scroll" ref={tableScrollRef} onWheel={handleMatrixWheel}>
          <table className="matrix-table" style={tableStyle}>
            <thead>
              <tr>
                {/* Juror column — sort + text filter */}
                <th
                  className="matrix-corner"
                  aria-sort={
                    sortMode === "juror"
                      ? (sortJurorDir === "asc" ? "ascending" : "descending")
                      : "none"
                  }
                >
                  <div className="matrix-corner-head">
                    <button
                      type="button"
                      className={`matrix-col-sort matrix-col-sort--juror${sortMode === "juror" ? " active" : ""}`}
                      onClick={toggleJurorSort}
                      title="Sort by juror name"
                    >
                      <span className={`col-sort-label${isJurorFilterActive ? " filtered" : ""}`}>
                        Juror / Group
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`col-filter-hotspot${isJurorFilterActive ? " active filter-icon-active" : ""}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFilterCol("juror", e); }}
                      title="Filter jurors"
                      aria-label="Filter jurors"
                    >
                      <FilterIcon />
                    </button>
                  </div>
                </th>

                {/* Group columns — sort + numeric range filter */}
                {groups.map((g) => {
                  const isSortActive   = sortMode === "group" && sortGroupId === g.id;
                  const gFilter        = groupScoreFilters[g.id] || { min: "", max: "" };
                  const isFilterActive = !!(gFilter.min || gFilter.max) || activeFilterCol === g.id;
                  return (
                    <th key={g.id}>
                      <div className="matrix-group-th-inner">
                        <button
                          className={`matrix-col-sort${isSortActive ? " active" : ""}`}
                          onClick={() => toggleGroupSort(g.id)}
                          title={`Sort by ${g.label} — click again to reverse, third click to reset`}
                        >
                          <span>{g.groupNo ?? g.label}</span>
                        </button>
                        <button
                          type="button"
                          className={`col-filter-hotspot${isFilterActive ? " active filter-icon-active" : ""}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openGroupFilter(g.id, e); }}
                          title={`Filter by group ${g.groupNo ?? g.label} score`}
                          aria-label={`Filter group ${g.groupNo ?? g.label} scores`}
                        >
                          <FilterIcon />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {visibleJurors.map((juror) => {
                const isFinal = jurorFinalMap.get(juror.key) && !juror.editEnabled;
                return (
                  <tr key={juror.key}>
                    <td className="matrix-juror">
                      <JurorCell juror={juror} workflowState={jurorWorkflowMap.get(juror.key)} />
                    </td>
                    {groups.map((g) => {
                      const entry = lookup[juror.key]?.[g.id] ?? null;
                      const state = getCellState(entry);
                      const tooltip = cellTooltip(state, entry);
                      return (
                        <td
                          key={g.id}
                          className={cellClassName(state, isFinal)}
                          aria-label={tooltip}
                          tabIndex={tooltip ? 0 : undefined}
                          onMouseEnter={tooltip ? (e) => showCellTip(e, tooltip) : undefined}
                          onMouseLeave={tooltip ? hideCellTip : undefined}
                          onFocus={tooltip ? (e) => showCellTip(e, tooltip) : undefined}
                          onBlur={tooltip ? hideCellTip : undefined}
                        >
                          {cellText(state, entry)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            <AverageRow groups={groups} averages={groupAverages} onShowTip={showCellTip} onHideTip={hideCellTip} />
          </table>
        </div>
      </div>

      {cellTip && (
        <div
          className="matrix-cell-tip"
          role="tooltip"
          style={{ left: cellTip.x, top: cellTip.y }}
        >
          {cellTip.text}
        </div>
      )}

      {/* Juror text filter popover */}
      <FilterPopoverPortal
        open={activeFilterCol === "juror"}
        anchorRect={anchorRect}
        anchorEl={anchorEl}
        onClose={closePopover}
        className="col-filter-popover col-filter-popover-portal"
        contentKey={jurorFilter}
        trapFocus
      >
        <div className="col-filter-label">Filter jurors</div>
        <label htmlFor="juror-filter-input" className="sr-only">
          Filter jurors by name or institution
        </label>
        <input
          id="juror-filter-input"
          autoFocus
          placeholder="Search juror or institution"
          aria-label="Filter jurors by name or institution"
          value={jurorFilter}
          onChange={(e) => setJurorFilter(e.target.value)}
          className={isJurorFilterActive ? "filter-input-active" : ""}
        />
        {jurorFilter && (
          <button className="col-filter-clear" onClick={() => { setJurorFilter(""); closePopover(); }}>
            Clear
          </button>
        )}
      </FilterPopoverPortal>

      {/* Group score numeric range filter popover */}
      {groupFilterPopover}
    </div>
  );
}

// ── Default export wrapped in error boundary ───────────────────
export default function ScoreGrid(props) {
  return (
    <GridErrorBoundary>
      <ScoreGridInner {...props} />
    </GridErrorBoundary>
  );
}

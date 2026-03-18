// src/admin/components/details/ScoreDetailsFilters.jsx
// ============================================================
// Presentational component: status legend, filter chips, and
// filter popover portal for the ScoreDetails table.
// ============================================================

import { FilterPopoverPortal, StatusBadge } from "../../components";
import { InfoIcon, XIcon } from "../../../shared/Icons";
import { SCORE_STATUS_LEGEND, JUROR_STATUS_LEGEND } from "../../hooks/useScoreDetailsFilters";

export default function ScoreDetailsFilters({
  // Status legend
  showStatusLegend,
  setShowStatusLegend,
  // Loading indicator
  loading,
  // Active filter chips
  hasAnyFilter,
  sortLabel,
  activeFilterChips,
  onResetFilters,
  onClearSort,
  // Popover
  popoverConfig,
  anchorRect,
  anchorEl,
  activeFilterCol,
  onClosePopover,
}) {
  return (
    <>
      {/* Status legend toggle + legend panel */}
      <div className="details-status-legend">
        <button
          type="button"
          className={`details-status-legend-toggle${showStatusLegend ? " is-open" : ""}`}
          onClick={() => setShowStatusLegend((prev) => !prev)}
          aria-expanded={showStatusLegend}
          aria-controls="details-status-legend-panel"
        >
          <span className="details-status-legend-icon" aria-hidden="true"><InfoIcon /></span>
          <span>Status Legend</span>
          <span className="details-status-legend-toggle-label">{showStatusLegend ? "Hide" : "Show"}</span>
        </button>
        {showStatusLegend && (
          <div id="details-status-legend-panel" className="details-status-legend-panel" role="note" aria-label="Status legend">
            <div className="details-status-legend-group">
              <div className="details-status-legend-title">Score Status</div>
              <table className="details-status-legend-table" aria-label="Score status legend">
                <tbody>
                  {SCORE_STATUS_LEGEND.map((item) => (
                    <tr key={`score-legend-${item.status}`}>
                      <td className="details-status-legend-col-badge">
                        <StatusBadge status={item.status} editingFlag={null} />
                      </td>
                      <td className="details-status-legend-col-desc">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="details-status-legend-group">
              <div className="details-status-legend-title">Juror Status</div>
              <table className="details-status-legend-table" aria-label="Juror status legend">
                <tbody>
                  {JUROR_STATUS_LEGEND.map((item) => (
                    <tr key={`juror-legend-${item.status}`}>
                      <td className="details-status-legend-col-badge">
                        <StatusBadge status={item.status} editingFlag={item.status === "editing" ? "editing" : null} />
                      </td>
                      <td className="details-status-legend-col-desc">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Filter chips row */}
      {(loading || hasAnyFilter || sortLabel) && (
        <div className="detail-table-toolbar">
          {loading && (
            <span className="detail-loading">Loading all semesters…</span>
          )}
          {(hasAnyFilter || sortLabel) && (
            <div className="filters-chip-row">
              {(hasAnyFilter || sortLabel) && (
                <button
                  type="button"
                  className="filter-chip filter-chip-clear-all"
                  onClick={onResetFilters}
                  title="Clear all filters"
                  aria-label="Clear all filters"
                >
                  <span className="chip-label">Clear all</span>
                  <XIcon />
                </button>
              )}
              {sortLabel && (
                <button
                  type="button"
                  className="details-sort-indicator"
                  onClick={onClearSort}
                  title="Clear sort"
                  aria-label="Clear sort"
                >
                  <span className="chip-label">Sorted By</span>
                  <span className="chip-value">{sortLabel}</span>
                  <span className="details-sort-close" aria-hidden="true">×</span>
                </button>
              )}
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className="filter-chip"
                  onClick={chip.onClear}
                  title={`Clear ${chip.label}`}
                  aria-label={`Clear ${chip.label}`}
                >
                  <span className="chip-label">{chip.label}</span>
                  {chip.value && <span className="chip-value">{chip.value}</span>}
                  <XIcon />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter popover portal */}
      <FilterPopoverPortal
        open={!!popoverConfig}
        anchorRect={anchorRect}
        anchorEl={anchorEl}
        onClose={onClosePopover}
        className={popoverConfig?.className}
        contentKey={popoverConfig?.contentKey}
        mode={popoverConfig?.mode}
        trapFocus
        id={activeFilterCol ? `filter-popover-${activeFilterCol}` : undefined}
        sheetTitle={popoverConfig?.title}
        sheetSearch={popoverConfig?.sheetSearch}
        sheetFooter={popoverConfig?.sheetFooter}
        sheetBodyClassName={popoverConfig?.sheetBodyClassName}
      >
        {popoverConfig?.content}
      </FilterPopoverPortal>
    </>
  );
}

// src/admin/components/details/ScoreDetailsFilters.jsx
// ============================================================
// Presentational component: status legend, filter chips, and
// filter popover portal for the ScoreDetails table.
// ============================================================

import { FilterPopoverPortal, StatusBadge } from "../../components";
import { XIcon } from "../../../shared/Icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { SCORE_STATUS_LEGEND, JUROR_STATUS_LEGEND } from "../../hooks/useScoreDetailsFilters";

function StatusGuideGroup({ title, items, isJuror = false }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={`${title}-${item.status}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5"
          >
            <StatusBadge
              status={item.status}
              editingFlag={isJuror && item.status === "editing" ? "editing" : null}
              size="compact"
              className="shrink-0"
            />
            <span className="text-xs leading-tight text-muted-foreground">{item.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
      {/* Compact status guide */}
      <div className="mb-3">
        <Card size="sm" className="overflow-visible border-border/70 bg-card/95 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Status Guide
                </CardTitle>
                <CardDescription className="text-xs">
                  Score Status shows row completeness. Juror Status shows workflow lifecycle.
                </CardDescription>
              </div>
              <button
                type="button"
                className="inline-flex h-7 items-center rounded-md border border-border/70 bg-muted/35 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60"
                onClick={() => setShowStatusLegend((prev) => !prev)}
                aria-expanded={showStatusLegend}
                aria-controls="details-status-guide-panel"
              >
                {showStatusLegend ? "Collapse" : "Expand"}
              </button>
            </div>
          </CardHeader>
          {showStatusLegend && (
            <CardContent
              id="details-status-guide-panel"
              className="grid gap-4 pt-3 md:grid-cols-2"
              role="note"
              aria-label="Status guide"
            >
              <StatusGuideGroup title="Score Status" items={SCORE_STATUS_LEGEND} />
              <StatusGuideGroup title="Juror Status" items={JUROR_STATUS_LEGEND} isJuror />
            </CardContent>
          )}
        </Card>
      </div>

      {/* Filter chips row */}
      {(loading || hasAnyFilter || sortLabel) && (
        <div className="flex items-center gap-2.5 flex-wrap my-0.5 mb-2.5">
          {loading && <span className="text-xs text-muted-foreground">Loading details…</span>}
          {(hasAnyFilter || sortLabel) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-red-200 bg-red-50 text-red-600 text-xs cursor-pointer whitespace-nowrap hover:bg-red-100 hover:border-red-300 [&_svg]:size-3"
                onClick={onResetFilters}
                title="Clear all filters"
                aria-label="Clear all filters"
              >
                <span className="font-semibold">Clear all</span>
                <XIcon />
              </button>
              {sortLabel && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground text-xs cursor-pointer whitespace-nowrap hover:bg-muted hover:border-border-strong [&_svg]:size-3"
                  onClick={onClearSort}
                  title="Clear sort"
                  aria-label="Clear sort"
                >
                  <span className="font-bold text-foreground">Sorted By</span>
                  <span className="font-normal">{sortLabel}</span>
                  <span aria-hidden="true">×</span>
                </button>
              )}
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground text-xs cursor-pointer whitespace-nowrap hover:bg-muted hover:border-border-strong [&_svg]:size-3"
                  onClick={chip.onClear}
                  title={`Clear ${chip.label}`}
                  aria-label={`Clear ${chip.label}`}
                >
                  <span className="font-semibold">{chip.label}</span>
                  {chip.value && <span className="font-normal">{chip.value}</span>}
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

// src/admin/layout/AdminHeader.jsx
// ============================================================
// Sticky header bar for the admin panel.
// Layout: [breadcrumb (Org / Page)] [spacer] [refresh] [period select]
// Matches vera-premium-prototype.html .admin-header structure.
// ============================================================

import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, FlaskConical, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────

function formatRefreshTime(date) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

// ── Demo Banner ──────────────────────────────────────────────

function DemoBanner() {
  return (
    <div
      className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200"
      role="status"
    >
      <FlaskConical className="size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-semibold">Demo Mode</strong>
        <span className="mx-1.5 opacity-50">&middot;</span>
        Sample data, resets daily
      </span>
    </div>
  );
}

// ── Period Selector ────────────────────────────────────────

function PeriodSelector({ sortedPeriods, periodList, selectedPeriodId, onPeriodChange, onFetchData }) {
  const periods = sortedPeriods || periodList || [];

  const handleChange = useCallback(
    (e) => {
      const id = e.target.value;
      onPeriodChange?.(id);
      onFetchData?.(id);
    },
    [onPeriodChange, onFetchData],
  );

  if (periods.length === 0) return null;

  return (
    <div className="relative inline-flex items-center">
      <select
        value={selectedPeriodId || ""}
        onChange={handleChange}
        aria-label="Select evaluation period"
        className={cn(
          "h-8 cursor-pointer appearance-none rounded-md border border-border/70 bg-background py-1 pl-3 pr-8",
          "text-sm font-medium text-foreground shadow-sm transition-colors",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        )}
      >
        {periods.map((s) => (
          <option key={s.id} value={s.id}>
            {s.period_name || s.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}

// ── Breadcrumb ────────────────────────────────────────────

function HeaderBreadcrumb({ orgName, pageTitle }) {
  return (
    <div className="flex items-center gap-1.5 text-sm min-w-0">
      {orgName && (
        <>
          <span className="font-semibold text-foreground truncate max-w-[140px]">{orgName}</span>
          <span className="text-muted-foreground/60 shrink-0">/</span>
        </>
      )}
      <span className="text-muted-foreground truncate">{pageTitle}</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

/**
 * @param {object}   props
 * @param {string}   props.title                   — Page title (e.g. "Overview")
 * @param {string}   [props.subtitle]              — Optional subtitle (e.g. "Spring 2026")
 * @param {object}   [props.activeOrganization]    — Active org { name }
 * @param {boolean}  [props.loading=false]          — Whether data is currently loading
 * @param {Date}     [props.lastRefresh]            — Timestamp of the last data refresh
 * @param {function} [props.onRefresh]              — Callback to trigger a data refresh
 * @param {boolean}  [props.isDemoMode=false]       — Show demo banner
 * @param {Array}    [props.periodList]            — Full period list
 * @param {Array}    [props.sortedPeriods]          — Sorted period list (preferred for display)
 * @param {string}   [props.selectedPeriodId]      — Currently selected period ID
 * @param {string}   [props.selectedPeriodName]    — Currently selected period display name
 * @param {function} [props.onPeriodChange]         — Callback when period selection changes
 * @param {function} [props.onFetchData]            — Callback to fetch data for a period
 */
export function AdminHeader({
  title,
  subtitle,
  activeOrganization,
  loading = false,
  lastRefresh,
  onRefresh,
  isDemoMode = false,
  periodList,
  sortedPeriods,
  selectedPeriodId,
  selectedPeriodName,
  onPeriodChange,
  onFetchData,
  // Legacy prop aliases (backwards compat with old AdminPanel calls)
  sortedSemesters,
  onSemesterChange,
}) {
  const refreshLabel = useMemo(() => formatRefreshTime(lastRefresh), [lastRefresh]);

  const effectiveSortedPeriods = sortedPeriods || sortedSemesters;
  const effectiveOnPeriodChange = onPeriodChange || onSemesterChange;

  const hasPeriods =
    (effectiveSortedPeriods && effectiveSortedPeriods.length > 0) ||
    (periodList && periodList.length > 0);

  const orgName = activeOrganization?.name;

  return (
    <>
      {isDemoMode && <DemoBanner />}

      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6 sticky top-0 z-40">
        {/* Breadcrumb */}
        <HeaderBreadcrumb orgName={orgName} pageTitle={title} />

        {/* Subtitle (period name) — shown inline on wider screens */}
        {subtitle && (
          <span className="hidden sm:inline text-xs text-muted-foreground/70 shrink-0">
            {subtitle}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Period selector */}
        {hasPeriods && (
          <PeriodSelector
            sortedPeriods={effectiveSortedPeriods}
            periodList={periodList}
            selectedPeriodId={selectedPeriodId}
            onPeriodChange={effectiveOnPeriodChange}
            onFetchData={onFetchData}
          />
        )}

        {/* Refresh */}
        {onRefresh && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Refresh data"
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden="true" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {refreshLabel && (
              <span
                className="hidden text-xs text-muted-foreground md:inline"
                title={lastRefresh?.toLocaleString()}
              >
                {refreshLabel}
              </span>
            )}
          </div>
        )}
      </header>
    </>
  );
}

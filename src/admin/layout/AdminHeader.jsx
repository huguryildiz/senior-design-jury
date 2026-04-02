// src/admin/layout/AdminHeader.jsx
// Matches prototype HTML lines 11722–11754 exactly.
// Structure: [mobile-menu-btn] [breadcrumb] [spacer] [refresh] [period dropdown]

import { useState, useCallback, useContext, useMemo } from "react";
import { AdminMobileMenuContext } from "./AdminLayout";

function formatRefreshTime(date) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

// ---------------------------------------------------------------------------
// Demo Banner — prototype line 11714–11721
// ---------------------------------------------------------------------------

function DemoBanner() {
  return (
    <div className="demo-banner" id="demo-banner">
      <div className="demo-banner-inner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, opacity: 0.7 }}>
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span>
          You&apos;re viewing a <strong>live demo</strong> with sample data.
        </span>
        <span className="demo-banner-sep">&middot;</span>
        <span>Data resets daily</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Period Dropdown — prototype lines 11741–11753
// ---------------------------------------------------------------------------

function PeriodDropdown({ periods, selectedPeriodId, onPeriodChange, onFetchData }) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => periods.find((p) => String(p.id) === String(selectedPeriodId)) || periods[0],
    [periods, selectedPeriodId],
  );

  const handleSelect = useCallback(
    (period) => {
      setOpen(false);
      onPeriodChange?.(period.id);
      onFetchData?.(period.id);
    },
    [onPeriodChange, onFetchData],
  );

  if (!periods.length) return null;

  return (
    <div className={`dropdown${open ? " open" : ""}`} id="semester-dropdown">
      <button
        className="dropdown-trigger"
        id="semester-trigger"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="dropdown-dot" />
        <span id="semester-label">{selected?.period_name || selected?.name || ""}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          {/* Click-away */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div className="dropdown-menu" id="semester-menu" style={{ zIndex: 100 }}>
            {periods.map((period, i) => (
              <div
                key={period.id}
                className={`dropdown-item${String(period.id) === String(selectedPeriodId) ? " selected" : ""}`}
                onClick={() => handleSelect(period)}
              >
                {period.period_name || period.name}
                {period.is_current && <span className="dropdown-item-meta">Current</span>}
                {period.is_locked && <span className="dropdown-item-meta">Locked</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export — prototype lines 11722–11754
// ---------------------------------------------------------------------------

export function AdminHeader({
  title,
  activeOrganization,
  loading = false,
  lastRefresh,
  onRefresh,
  isDemoMode = false,
  periodList,
  sortedPeriods,
  selectedPeriodId,
  onPeriodChange,
  onFetchData,
  // Legacy aliases
  sortedSemesters,
  onSemesterChange,
}) {
  const { onMenuToggle } = useContext(AdminMobileMenuContext);
  const effectivePeriods = sortedPeriods || sortedSemesters || periodList || [];
  const effectiveOnPeriodChange = onPeriodChange || onSemesterChange;
  const refreshLabel = useMemo(() => formatRefreshTime(lastRefresh), [lastRefresh]);
  const orgName = activeOrganization?.name;

  return (
    <>
      {isDemoMode && <DemoBanner />}

      <header className="admin-header">
        {/* Mobile hamburger */}
        <button
          className="mobile-menu-btn"
          id="mobile-menu-btn"
          type="button"
          aria-label="Open navigation"
          aria-expanded="false"
          aria-controls="sidebar-nav"
          onClick={onMenuToggle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Breadcrumb */}
        <div className="header-breadcrumb">
          {orgName && <><strong>{orgName}</strong>&nbsp;/&nbsp;</>}
          <span id="breadcrumb-page">{title}</span>
        </div>

        <div className="header-spacer" />

        {/* Refresh */}
        {onRefresh && (
          <div className="header-refresh-stack">
            <button
              className={`btn btn-outline btn-sm header-refresh-btn${loading ? " loading" : ""}`}
              title="Refresh data"
              type="button"
              onClick={onRefresh}
              disabled={loading}
            >
              <svg
                className={`refresh-icon${loading ? " spin" : ""}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M21 21v-5h-5" />
              </svg>
              <span>Refresh</span>
            </button>
            {refreshLabel && (
              <span className="header-refresh-time" title={lastRefresh?.toLocaleString()}>
                {refreshLabel}
              </span>
            )}
          </div>
        )}

        {/* Period selector */}
        {effectivePeriods.length > 0 && (
          <PeriodDropdown
            periods={effectivePeriods}
            selectedPeriodId={selectedPeriodId}
            onPeriodChange={effectiveOnPeriodChange}
            onFetchData={onFetchData}
          />
        )}
      </header>
    </>
  );
}

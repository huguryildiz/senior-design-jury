// src/admin/layout/AdminHeader.jsx — Phase 1
// Prototype source: lines 11722–11754
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/auth";
import { useFloating } from "@/shared/hooks/useFloating";

import { Icon } from "lucide-react";

const PAGE_LABELS = {
  overview: "Overview",
  rankings: "Rankings",
  analytics: "Analytics",
  heatmap: "Heatmap",
  reviews: "Reviews",
  jurors: "Jurors",
  projects: "Projects",
  periods: "Evaluation Periods",
  criteria: "Evaluation Criteria",
  outcomes: "Outcomes & Mapping",
  "entry-control": "Entry Control",
  "pin-blocking": "PIN Blocking",
  "audit-log": "Audit Log",
  settings: "Settings",
  export: "Export",
};

export default function AdminHeader({
  currentPage,
  onMobileMenuOpen,
  sortedPeriods = [],
  selectedPeriodId,
  onPeriodChange,
  onRefresh,
  refreshing = false,
}) {
  const { activeOrganization } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [iconSpinning, setIconSpinning] = useState(false);
  const triggerRef = useRef(null);

  const { floatingRef, floatingStyle } = useFloating({
    triggerRef,
    isOpen: dropdownOpen,
    onClose: () => setDropdownOpen(false),
    placement: 'bottom-end',
  });

  const orgLabel = activeOrganization?.name || activeOrganization?.code || "Organization";
  const pageLabel = PAGE_LABELS[currentPage] || "Overview";

  const selectedPeriod = sortedPeriods.find((p) => p.id === selectedPeriodId);
  const periodLabel = selectedPeriod?.name || selectedPeriod?.semester_name || "—";

  useEffect(() => {
    if (!refreshing && iconSpinning) setIconSpinning(false);
  }, [refreshing, iconSpinning]);

  const handleRefreshClick = async () => {
    if (!onRefresh || refreshing) return;
    setIconSpinning(true);
    try {
      await Promise.resolve(onRefresh());
    } finally {
      setIconSpinning(false);
    }
  };

  return (
    <header className="admin-header">
      <button
        className="mobile-menu-btn"
        type="button"
        aria-label="Open navigation"
        onClick={onMobileMenuOpen}
      >
        <Icon
          iconNode={[]}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </Icon>
      </button>
      <div className="header-breadcrumb">
        <strong>{orgLabel}</strong>&nbsp;/&nbsp;<span>{pageLabel}</span>
      </div>
      <div className="header-spacer" />
      {onRefresh && (
        <div className="header-refresh-stack">
          <button
            className="btn btn-outline btn-sm header-refresh-btn"
            title="Refresh data"
            onClick={handleRefreshClick}
            disabled={refreshing}
          >
            <Icon
              iconNode={[]}
              className={`refresh-icon${iconSpinning ? " spinning" : ""}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M21 21v-5h-5" />
            </Icon>
            <span>Refresh</span>
          </button>
        </div>
      )}
      {sortedPeriods.length > 0 && (
        <div className={`dropdown${dropdownOpen ? " open" : ""}`}>
          <button
            ref={triggerRef}
            className={`dropdown-trigger${dropdownOpen ? " open" : ""}`}
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <span className="dropdown-dot" />
            <span className="dropdown-trigger-labels">
              <span className="dropdown-trigger-period">{periodLabel}</span>
            </span>
            <Icon
              iconNode={[]}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </Icon>
          </button>
          {dropdownOpen && createPortal(
            <div
              ref={floatingRef}
              className="dropdown-menu show"
              style={floatingStyle}
            >
              {sortedPeriods.map((p) => (
                <div
                  key={p.id}
                  className={`dropdown-item${p.id === selectedPeriodId ? " selected" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPeriodChange?.(p.id);
                    setDropdownOpen(false);
                  }}
                >
                  {p.name || p.semester_name}
                  {p.is_current && <span className="dropdown-item-meta">Current</span>}
                  {(p.is_locked || p.eval_locked) && <span className="dropdown-item-meta">Locked</span>}
                </div>
              ))}
            </div>,
            document.body
          )}
        </div>
      )}
    </header>
  );
}

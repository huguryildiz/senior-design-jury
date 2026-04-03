// src/admin/layout/AdminHeader.jsx — Phase 1
// Prototype source: lines 11722–11754
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth";

const TAB_LABELS = {
  overview: "Overview",
  jurors: "Jurors",
  projects: "Projects",
  periods: "Evaluation Periods",
  criteria: "Evaluation Criteria",
  outcomes: "Outcomes & Mapping",
  "entry-control": "Entry Control",
  "pin-lock": "PIN Blocking",
  "audit-log": "Audit Log",
  settings: "Settings",
  export: "Export",
};

const SCORES_VIEW_LABELS = {
  rankings: "Rankings",
  analytics: "Analytics",
  grid: "Heatmap",
  details: "Reviews",
};

export default function AdminHeader({
  adminTab,
  scoresView,
  onMobileMenuOpen,
  sortedPeriods = [],
  selectedPeriodId,
  onPeriodChange,
  onRefresh,
  refreshing = false,
}) {
  const { activeOrganization } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const orgLabel = activeOrganization?.name || activeOrganization?.code || "Organization";
  const pageLabel =
    adminTab === "scores"
      ? (SCORES_VIEW_LABELS[scoresView] || "Rankings")
      : (TAB_LABELS[adminTab] || "Overview");

  const selectedPeriod = sortedPeriods.find((p) => p.id === selectedPeriodId);
  const periodLabel = selectedPeriod?.semester_name || "—";

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  return (
    <header className="admin-header">
      <button
        className="mobile-menu-btn"
        type="button"
        aria-label="Open navigation"
        onClick={onMobileMenuOpen}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
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
            onClick={onRefresh}
            disabled={refreshing}
          >
            <svg
              className={`refresh-icon${refreshing ? " spinning" : ""}`}
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M21 21v-5h-5" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      )}

      {sortedPeriods.length > 0 && (
        <div className={`dropdown${dropdownOpen ? " open" : ""}`} ref={dropdownRef}>
          <button
            className="dropdown-trigger"
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <span className="dropdown-dot" />
            <span>{periodLabel}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div className="dropdown-menu">
            {sortedPeriods.map((p) => (
              <div
                key={p.id}
                className={`dropdown-item${p.id === selectedPeriodId ? " selected" : ""}`}
                onClick={() => { onPeriodChange?.(p.id); setDropdownOpen(false); }}
              >
                {p.semester_name}
                {p.is_current && <span className="dropdown-item-meta">Current</span>}
                {p.eval_locked && <span className="dropdown-item-meta">Locked</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

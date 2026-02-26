// src/admin/DashboardTab.jsx
// ── Charts dashboard ──────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { APP_CONFIG } from "../config";
import { DownloadIcon } from "../shared/Icons";
import {
  OutcomeByGroupChart,
  OutcomeOverviewChart,
  CompetencyRadarChart,
  CriterionBoxPlotChart,
  JurorConsistencyHeatmap,
  RubricAchievementChart,
  MudekBadge,
} from "../Charts";

// ── Helpers ───────────────────────────────────────────────────
function formatDashboardTs(date) {
  if (!date) return "—";
  return date.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).replace(",", " ·");
}

// ── Loading skeleton ──────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="dashboard-loading">
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card skeleton-wide" />
      </div>
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card skeleton-wide" />
      </div>
      <div className="dashboard-skeleton-row">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────
function DashboardError() {
  return (
    <div className="dashboard-state-card">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p className="dashboard-state-title">Could not load data</p>
      <span className="dashboard-state-sub">Check your connection and refresh the page.</span>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function DashboardEmpty() {
  return (
    <div className="dashboard-state-card">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
      </svg>
      <p className="dashboard-state-title">No data available</p>
      <span className="dashboard-state-sub">Evaluations will appear here once jurors submit their scores.</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function DashboardTab({ dashboardStats, submittedData, lastRefresh, loading, error }) {
  const wrapRef  = useRef(null);
  const [exporting, setExporting] = useState(false);
  const restorePrintRef = useRef(null);

  // ── PDF export via print (vector SVG) ─────────────────────────
  async function handleExportPdf() {
    if (exporting || !wrapRef.current) return;
    setExporting(true);

    const wrap    = wrapRef.current;
    const toolbar = wrap.querySelector(".dashboard-toolbar");
    const header  = wrap.querySelector(".print-header");
    const badges  = wrap.querySelectorAll(".mudek-badge-wrap");

    const prevToolbar = toolbar?.style.display ?? "";
    const prevHeader  = header?.style.display ?? "";
    const prevBadge   = [];
    badges.forEach((b) => prevBadge.push(b.style.visibility ?? ""));

    const restore = () => {
      if (toolbar) toolbar.style.display = prevToolbar;
      if (header)  header.style.display  = prevHeader;
      badges.forEach((b, i) => { b.style.visibility = prevBadge[i] || ""; });
      wrap.classList.remove("print-mode");
      setExporting(false);
      restorePrintRef.current = null;
    };

    restorePrintRef.current = restore;

    if (toolbar) toolbar.style.display = "none";
    if (header)  header.style.display  = "block";
    badges.forEach((b) => (b.style.visibility = "hidden"));
    wrap.classList.add("print-mode");

    const handleAfterPrint = () => restore();
    window.addEventListener("afterprint", handleAfterPrint, { once: true });

    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 50);
    });
  }

  useEffect(() => {
    return () => {
      if (restorePrintRef.current) restorePrintRef.current();
    };
  }, []);

  // ── Render states ────────────────────────────────────────────
  const showPrint = formatDashboardTs(lastRefresh);

  if (loading) {
    return (
      <div className="dashboard-print-wrap">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-print-wrap">
        <DashboardError />
      </div>
    );
  }

  if (!submittedData || submittedData.length === 0) {
    return (
      <div className="dashboard-print-wrap">
        <DashboardEmpty />
      </div>
    );
  }

  return (
    <div className="dashboard-print-wrap" ref={wrapRef}>
      {/* Print-only header — hidden on screen, shown during PDF export */}
      <div className="print-header">
        <div className="print-header-title">{APP_CONFIG.appTitle}</div>
        <div className="print-header-sub">{APP_CONFIG.courseName} — {APP_CONFIG.university}</div>
        <div className="print-header-meta">
          Dashboard Report &nbsp;·&nbsp; {showPrint}
          &nbsp;·&nbsp; {submittedData.length} final submission{submittedData.length !== 1 ? "s" : ""}
          &nbsp;·&nbsp; {dashboardStats.length} group{dashboardStats.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Export button — hidden during export */}
      <div className="dashboard-toolbar no-print">
        <div className="dashboard-toolbar-left">
          <MudekBadge />
        </div>
        <button className="pdf-export-btn" onClick={handleExportPdf} disabled={exporting}>
          <DownloadIcon />
          {exporting ? "Preparing PDF…" : "Export PDF"}
        </button>
      </div>

      {/* Row 1: Outcome by Group — full width */}
      <div className="dashboard-grid">
        <div className="chart-span-2" id="chart-1">
          <OutcomeByGroupChart stats={dashboardStats} />
        </div>
      </div>

      {/* Row 2: Programme Averages (left) + Radar (right) */}
      <div className="dashboard-grid">
        <div id="chart-2">
          <OutcomeOverviewChart data={submittedData} />
        </div>
        <div id="chart-3">
          <CompetencyRadarChart stats={dashboardStats} />
        </div>
      </div>

      {/* Row 3: Juror Consistency Heatmap — full width */}
      <div className="dashboard-grid">
        <div className="chart-span-2" id="chart-4">
          <JurorConsistencyHeatmap stats={dashboardStats} data={submittedData} />
        </div>
      </div>

      {/* Row 4: Boxplot (left) + Rubric Achievement (right) */}
      <div className="dashboard-grid">
        <div id="chart-5">
          <CriterionBoxPlotChart data={submittedData} />
        </div>
        <div id="chart-6">
          <RubricAchievementChart data={submittedData} />
        </div>
      </div>
    </div>
  );
}

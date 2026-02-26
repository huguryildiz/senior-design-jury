// src/admin/DashboardTab.jsx
// ── Charts dashboard ──────────────────────────────────────────

import { APP_CONFIG } from "../config";
import { DownloadIcon } from "../shared/Icons";
import {
  OutcomeByGroupChart,
  OutcomeOverviewChart,
  CriterionBoxPlotChart,
  JurorConsistencyHeatmap,
  JurorScoreSpreadChart,
  RubricAchievementChart,
  CompetencyRadarChart,
  MudekBadge,
} from "../Charts";

export default function DashboardTab({ dashboardStats, submittedData }) {
  if (submittedData.length === 0) {
    return <div className="empty-msg">No submitted evaluations yet.</div>;
  }

  const now = new Date().toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="dashboard-print-wrap">
      {/* Print-only header — hidden on screen, visible when printing */}
      <div className="print-header">
        <div className="print-header-title">{APP_CONFIG.appTitle}</div>
        <div className="print-header-sub">{APP_CONFIG.courseName} — {APP_CONFIG.university}</div>
        <div className="print-header-meta">
          Dashboard Report &nbsp;·&nbsp; {now}
          &nbsp;·&nbsp; {submittedData.length} final submission{submittedData.length !== 1 ? "s" : ""}
          &nbsp;·&nbsp; {dashboardStats.length} group{dashboardStats.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Export button — hidden when printing */}
      <div className="dashboard-toolbar no-print">
        <div className="dashboard-toolbar-left">
          <MudekBadge />
        </div>
        <button className="pdf-export-btn" onClick={() => window.print()}>
          <DownloadIcon />
          Export PDF
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="chart-span-2">
          <OutcomeByGroupChart stats={dashboardStats} />
        </div>
      </div>
      <div className="dashboard-grid">
        <OutcomeOverviewChart data={submittedData} />
        <CriterionBoxPlotChart data={submittedData} />
      </div>
      <div className="dashboard-grid">
        <div className="chart-span-2">
          <JurorConsistencyHeatmap stats={dashboardStats} data={submittedData} />
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="chart-span-2">
          <RubricAchievementChart data={submittedData} />
        </div>
      </div>
      <div className="dashboard-grid">
        <CompetencyRadarChart stats={dashboardStats} />
        <JurorScoreSpreadChart data={submittedData} />
      </div>
    </div>
  );
}

// src/admin/DashboardTab.jsx
// ── Charts dashboard ──────────────────────────────────────────

import { APP_CONFIG } from "../config";
import {
  GroupBarChart, ClusteredBarChart, RadarChart,
  JurorStrictnessChart, ScoreDotPlot,
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
        <button className="pdf-export-btn" onClick={() => window.print()}>
          ⬇ Export PDF
        </button>
      </div>

      <div className="dashboard-grid">
        <GroupBarChart     stats={dashboardStats} />
        <JurorStrictnessChart data={submittedData} />
      </div>
      <div className="dashboard-grid">
        <ClusteredBarChart stats={dashboardStats} />
        <RadarChart        stats={dashboardStats} />
      </div>
      <ScoreDotPlot data={submittedData} />
    </div>
  );
}

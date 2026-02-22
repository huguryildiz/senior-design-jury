// src/admin/DashboardTab.jsx
// ── Charts dashboard ──────────────────────────────────────────

import {
  GroupBarChart, ClusteredBarChart, RadarChart,
  JurorStrictnessChart, ScoreDotPlot,
} from "../Charts";

export default function DashboardTab({ dashboardStats, submittedData }) {
  if (submittedData.length === 0) {
    return <div className="empty-msg">No submitted evaluations yet.</div>;
  }
  return (
    <>
      <div className="dashboard-grid">
        <GroupBarChart     stats={dashboardStats} />
        <JurorStrictnessChart data={submittedData} />
      </div>
      <div className="dashboard-grid">
        <ClusteredBarChart stats={dashboardStats} />
        <RadarChart        stats={dashboardStats} />
      </div>
      <ScoreDotPlot data={submittedData} />
    </>
  );
}

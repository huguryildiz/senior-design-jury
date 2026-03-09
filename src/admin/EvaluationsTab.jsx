// src/admin/EvaluationsTab.jsx
// Merges Rankings, Analytics, Grid, and Details views into one tab.
// View switching is handled by AdminPanel (sub-nav bar above content).

import RankingsTab from "./RankingsTab";
import AnalyticsTab from "./AnalyticsTab";
import EvaluationDetails from "./EvaluationDetails";
import EvaluationGrid from "./EvaluationGrid";

export default function EvaluationsTab({
  view = "rankings",
  ranked,
  submittedData,
  rawScores,
  jurors,
  matrixJurors,
  groups,
  semesterName,
  summaryData,
  dashboardStats,
  lastRefresh,
  loading,
}) {
  return (
    <div className="evaluations-tab">
      {view === "rankings" && (
        <RankingsTab ranked={ranked} submittedData={submittedData} />
      )}
      {view === "analytics" && (
        <AnalyticsTab
          dashboardStats={dashboardStats}
          submittedData={submittedData}
          lastRefresh={lastRefresh}
          loading={loading}
          semesterName={semesterName}
        />
      )}
      {view === "details" && (
        <EvaluationDetails
          data={rawScores}
          jurors={jurors}
          assignedJurors={matrixJurors || jurors}
          groups={groups}
          semesterName={semesterName}
          summaryData={summaryData}
        />
      )}
      {view === "grid" && (
        <EvaluationGrid
          data={rawScores}
          jurors={matrixJurors || jurors}
          groups={groups}
          semesterName={semesterName}
        />
      )}
    </div>
  );
}

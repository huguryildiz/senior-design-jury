// src/admin/ScoresTab.jsx
// Merges Rankings, Analytics, Grid, and Details views into one tab.
// View switching is handled by AdminPanel (sub-nav bar above content).

import RankingsTab from "./RankingsTab";
import AnalyticsTab from "./AnalyticsTab";
import ScoreDetails from "./ScoreDetails";
import ScoreGrid from "./ScoreGrid";

export default function ScoresTab({
  view = "rankings",
  ranked,
  submittedData,
  rawScores,
  detailsScores,
  jurors,
  matrixJurors,
  groups,
  semesterName,
  summaryData,
  detailsSummary,
  dashboardStats,
  overviewMetrics,
  lastRefresh,
  loading,
  error,
  detailsLoading,
  semesterOptions,
  trendSemesterIds,
  onTrendSelectionChange,
  trendData,
  trendLoading,
  trendError,
}) {
  return (
    <div className="scores-tab">
      {view === "rankings" && (
        <RankingsTab ranked={ranked} semesterName={semesterName} />
      )}
      {view === "analytics" && (
        <AnalyticsTab
          dashboardStats={dashboardStats}
          submittedData={submittedData}
          overviewMetrics={overviewMetrics}
          lastRefresh={lastRefresh}
          loading={loading}
          error={error}
          semesterName={semesterName}
          semesterOptions={semesterOptions}
          trendSemesterIds={trendSemesterIds}
          onTrendSelectionChange={onTrendSelectionChange}
          trendData={trendData}
          trendLoading={trendLoading}
          trendError={trendError}
        />
      )}
      {view === "details" && (
        <ScoreDetails
          data={detailsScores && detailsScores.length ? detailsScores : rawScores}
          jurors={jurors}
          assignedJurors={matrixJurors || jurors}
          groups={groups}
          semesterName={semesterName}
          summaryData={detailsSummary && detailsSummary.length ? detailsSummary : summaryData}
          loading={detailsLoading}
        />
      )}
      {view === "grid" && (
        <ScoreGrid
          data={rawScores}
          jurors={matrixJurors || jurors}
          groups={groups}
          semesterName={semesterName}
        />
      )}
    </div>
  );
}

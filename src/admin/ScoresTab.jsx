// src/admin/ScoresTab.jsx
// Merges Rankings, Analytics, Grid, and Details views into one tab.
// View switching is handled by AdminPanel (sub-nav bar above content).

import { lazy, Suspense } from "react";
import RankingsTab from "./RankingsTab";
const AnalyticsTab = lazy(() => import("./AnalyticsTab"));
import ScoreDetails from "./ScoreDetails";
import ScoreGrid from "./ScoreGrid";

function AnalyticsFallback() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200, color: "var(--color-muted, #888)" }}>
      Loading analytics…
    </div>
  );
}

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
        <Suspense fallback={<AnalyticsFallback />}>
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
        </Suspense>
      )}
      {view === "details" && (
        <ScoreDetails
          data={detailsScores && detailsScores.length ? detailsScores : rawScores}
          jurors={jurors}
          assignedJurors={matrixJurors || jurors}
          groups={groups}
          semesterName={semesterName}
          semesterOptions={semesterOptions}
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

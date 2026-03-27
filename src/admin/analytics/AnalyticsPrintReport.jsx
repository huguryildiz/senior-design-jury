// src/admin/analytics/AnalyticsPrintReport.jsx
// Print-optimized layout section for PDF export.
// Extracted from AnalyticsTab.jsx — structural refactor only.

import {
  OutcomeByGroupChartPrint,
  OutcomeOverviewChartPrint,
  OutcomeTrendChartPrint,
  RadarPrintAll,
  JurorConsistencyHeatmapPrint,
  CriterionBoxPlotChartPrint,
  RubricAchievementChartPrint,
  CHART_COPY,
} from "../../charts";
import { outcomeCodeLine } from "./analyticsDatasets";

export default function AnalyticsPrintReport({
  dashboardStats,
  submittedData,
  activeOutcomes,
  activeTrendLegend,
  trendData,
  semesterOptions,
  trendSemesterIds,
  semesterLabel,
  printDate,
  summaryLabel,
  mudekMappingRows,
  appendixRows,
}) {
  return (
    <div className="print-report">
      {/* Print-only header — appears above page 1 */}
      <div className="print-header">
        <div className="print-header-title">VERA — Evaluation Report</div>
        <div className="print-header-sub">EE 492 — Senior Project II · Poster Jury Evaluation Report · {semesterLabel} </div>
        <div className="print-header-meta">
          <div>Report Generated: {printDate}</div>
          <div className="print-header-summary">{summaryLabel}</div>
        </div>
      </div>

      {/* Page 1: Outcome by Group */}
      <section className="print-page report-chart page-chart">
        <h2 className="print-card-title">{CHART_COPY.outcomeByGroup.title}</h2>
        <div className="print-card-note">{CHART_COPY.outcomeByGroup.note}</div>
        <div className="chart-wrapper">
          <OutcomeByGroupChartPrint stats={dashboardStats} outcomes={activeOutcomes} />
        </div>
      </section>

      {/* Page 2: Programme Averages */}
      <section className="print-page report-chart page-chart">
        <h2 className="print-card-title">{CHART_COPY.programmeAverages.title}</h2>
        <div className="print-card-note">{CHART_COPY.programmeAverages.note}</div>
        <div className="chart-wrapper">
          <OutcomeOverviewChartPrint data={submittedData} outcomes={activeOutcomes} />
        </div>
      </section>

      {/* Page 3: Semester Trend */}
      {trendSemesterIds.length > 0 && (
        <section className="print-page report-chart page-chart">
          <h2 className="print-card-title">{CHART_COPY.semesterTrend.title}</h2>
          <div className="print-card-note">{CHART_COPY.semesterTrend.note}</div>
          <div className="chart-wrapper">
            <OutcomeTrendChartPrint
              data={trendData}
              semesters={semesterOptions}
              selectedIds={trendSemesterIds}
              outcomes={activeOutcomes}
            />
          </div>
          <div className="print-chart-legend">
            {activeTrendLegend.map((item) => (
              <span key={item.key} className="legend-item legend-item--stacked">
                <span className="legend-dot" style={{ background: item.color }} />
                <span className="legend-label">
                  <span className="legend-label-main">{item.label}</span>
                  <span className="legend-label-sub">{outcomeCodeLine(item.code)}</span>
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Page 3+N: Competency Radar (one page per group) */}
      <RadarPrintAll stats={dashboardStats} outcomes={activeOutcomes} />

      {/* Page 4+N: Juror Consistency Heatmap */}
      <section className="print-page report-chart page-chart">
        <h2 className="print-card-title">{CHART_COPY.jurorConsistency.title}</h2>
        <div className="print-card-note">{CHART_COPY.jurorConsistency.note}</div>
        <div className="cv-formula-block">
          <span className="cv-formula-pill" aria-label="CV equals sigma divided by x bar times 100">
            <math xmlns="http://www.w3.org/1998/Math/MathML" className="cv-formula-math">
              <mrow>
                <mi>CV</mi>
                <mo>=</mo>
                <mrow>
                  <mo>(</mo>
                  <mfrac>
                    <mi>σ</mi>
                    <mi>μ</mi>
                  </mfrac>
                  <mo>)</mo>
                </mrow>
                <mo>×</mo>
                <mn>100</mn>
              </mrow>
            </math>
          </span>
          <span className="cv-formula-legend">
            σ = std. deviation &nbsp;·&nbsp; μ = mean score &nbsp;·&nbsp; CV = juror disagreement %
          </span>
        </div>
        <div className="chart-wrapper">
          <JurorConsistencyHeatmapPrint stats={dashboardStats} data={submittedData} outcomes={activeOutcomes} />
        </div>
      </section>

      {/* Page 5+N: Score Distribution by Criterion */}
      <section className="print-page report-chart page-chart">
        <h2 className="print-card-title">{CHART_COPY.scoreDistribution.title}</h2>
        <div className="print-card-note">{CHART_COPY.scoreDistribution.note}</div>
        <div className="chart-wrapper">
          <CriterionBoxPlotChartPrint data={submittedData} outcomes={activeOutcomes} />
        </div>
      </section>

      {/* Page 6+N: Achievement Level Distribution */}
      <section className="print-page report-chart page-chart">
        <h2 className="print-card-title">{CHART_COPY.achievementDistribution.title}</h2>
        <div className="print-card-note">{CHART_COPY.achievementDistribution.note}</div>
        <div className="chart-wrapper">
          <RubricAchievementChartPrint data={submittedData} outcomes={activeOutcomes} />
        </div>
      </section>

      {/* MÜDEK Outcome Mapping (new page) */}
      <section className="print-page print-appendix">
        <h2 className="print-card-title">MÜDEK Outcome Mapping</h2>
        <div className="print-card-note">
          Criteria-to-MÜDEK outcome references used in analytics.
        </div>
        <table className="print-appendix-table print-mudek-table">
          <thead>
            <tr>
              <th>Criteria</th>
              <th>MÜDEK Code(s)</th>
              <th>MÜDEK Outcome(s)</th>
            </tr>
          </thead>
          <tbody>
            {mudekMappingRows.map((row, idx) => (
              <tr key={`${row.code}-${idx}`}>
                {row.showCriteria ? (
                  <td className="print-mudek-cell-criteria" rowSpan={row.rowSpan}>{row.criteria}</td>
                ) : null}
                <td className="print-mudek-cell-code">{row.code}</td>
                <td className="print-mudek-cell-outcome">{row.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Final page: Group details */}
      <section className="print-page print-appendix">
        <h2 className="print-card-title">Group Details</h2>
        <div className="print-card-note">Group names, project titles, and student lists.</div>
        <table className="print-appendix-table print-group-details-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Project Title</th>
              <th>Students</th>
            </tr>
          </thead>
          <tbody>
            {appendixRows.map((row, idx) => (
              <tr key={`${row.groupLabel}-${idx}`}>
                <td>{row.groupLabel}</td>
                <td>{row.projectTitle || "—"}</td>
                <td>{row.students.length ? row.students.join(" · ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

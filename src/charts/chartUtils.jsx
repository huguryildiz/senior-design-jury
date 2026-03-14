// src/charts/chartUtils.js
// ── Shared helpers, constants, and small components used by all chart files ──

import { useState, useEffect } from "react";
import { CRITERIA } from "../config";

// ── Per-chart MÜDEK outcome code lists ───────────────────────
// All charts use the same set per spec §3.
export const CHART_OUTCOMES = ["9.1", "9.2", "1.2", "2", "3.1", "3.2", "8.1", "8.2"];

// ── Derive outcome list from CRITERIA (keeps charts in sync with config) ─
// Order: delivery (9.1 Oral) · design (9.2 Written) · technical · teamwork
export const OUTCOMES = CRITERIA.map((c) => ({
  key:   c.id,
  code:  c.mudek.join("/"),
  label: c.shortLabel,
  max:   c.max,
  color: c.color,
}));

export const CHART_COPY = {
  outcomeByGroup: {
    title: "Outcome Achievement by Group",
    note: "Compares each group's normalized score across all four MÜDEK-mapped criteria.",
  },
  programmeAverages: {
    title: "Programme-Level Outcome Averages",
    note: "Grand mean ±1 std. deviation (σ) normalized score per outcome across all groups and jurors.",
  },
  semesterTrend: {
    title: "Semester Trend",
    note: "Normalized averages across selected semesters.",
  },
  competencyProfile: {
    title: "Competency Profile per Group",
    note: "Shows whether a group's competency development is balanced or skewed across all four outcomes.",
  },
  scoreDistribution: {
    title: "Score Distribution by Criterion",
    note: "Reveals inter-juror spread for each criterion — evidence of measurement reliability.",
  },
  jurorConsistency: {
    title: "Juror Consistency Heatmap",
    note: "Identifies which group × criterion combinations have poor juror agreement, guiding rubric improvement.",
  },
  achievementDistribution: {
    title: "Achievement Level Distribution",
    note: "% of evaluations per rubric band — directly maps to MÜDEK continuous improvement evidence.",
  },
};

export function parseOutcomeCode(code) {
  const [majorRaw, minorRaw] = String(code).split(".");
  const major = parseInt(majorRaw, 10);
  const minor = parseInt(minorRaw ?? "0", 10);
  return {
    major: Number.isFinite(major) ? major : 0,
    minor: Number.isFinite(minor) ? minor : 0,
  };
}

export function compareOutcomeCodes(a, b) {
  const A = parseOutcomeCode(a);
  const B = parseOutcomeCode(b);
  if (A.major !== B.major) return A.major - B.major;
  if (A.minor !== B.minor) return A.minor - B.minor;
  return String(a).localeCompare(String(b));
}

export function formatMudekCodes(code) {
  return String(code || "")
    .split("/")
    .map((c) => c.trim())
    .filter(Boolean)
    .join(" / ");
}

export function outcomeCodeLine(code) {
  const formatted = formatMudekCodes(code);
  return formatted ? `(${formatted})` : "";
}

export function OutcomeLegendLabel({ label, code }) {
  const codeLine = outcomeCodeLine(code);
  return (
    <span className="legend-label">
      <span className="legend-label-main">{label}</span>
      {codeLine ? <span className="legend-label-sub">{codeLine}</span> : null}
    </span>
  );
}

export function OutcomeLabelSvg({
  x,
  y,
  label,
  code,
  anchor = "middle",
  mainSize = 9,
  subSize = 7,
  mainFill = "#475569",
  subFill = "#94a3b8",
  fontWeight = 600,
  lineGap = 11,
  mainClassName = "",
  subClassName = "",
}) {
  const codeLine = outcomeCodeLine(code);
  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fontSize={mainSize}
        fill={mainFill}
        fontWeight={fontWeight}
        className={mainClassName || undefined}
      >
        {label}
      </text>
      {codeLine ? (
        <text
          x={x}
          y={y + lineGap}
          textAnchor={anchor}
          fontSize={subSize}
          fill={subFill}
          className={subClassName || undefined}
        >
          {codeLine}
        </text>
      ) : null}
    </g>
  );
}

// ── Shared empty state ────────────────────────────────────────
export function ChartEmpty({ msg }) {
  return <div className="chart-empty">{msg || "Not enough data yet."}</div>;
}

// ── Shared accessible data table for charts ───────────────────
export function ChartDataTable({ caption, headers, rows }) {
  if (!rows || rows.length === 0) return null;
  return (
    <details className="chart-data-table-details">
      <summary className="chart-data-table-summary">Show data table</summary>
      <div className="chart-data-table-scroll">
        <table className="chart-data-table">
          {caption && <caption>{caption}</caption>}
          <thead>
            <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

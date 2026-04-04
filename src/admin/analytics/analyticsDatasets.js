// src/admin/analytics/analyticsDatasets.js
// Pure dataset builder functions (no React, no JSX).
// Extracted from AnalyticsTab.jsx — structural refactor only.

import { mean, stdDev, outcomeValues, fmt1, fmt2, buildBoxplotStats } from "../../shared/stats";
import { CHART_COPY } from "../../charts";

// ── Derived helpers ──────────────────────────────────────────
export function buildOutcomes(criteria) {
  return (criteria || []).map((c) => ({
    id: c.id,
    key: c.key ?? c.id,
    label: c.shortLabel || c.label,
    max: c.max,
    rubric: c.rubric || [],
    code: (c.mudek || []).join("/"),
  }));
}

export const getCriterionColor = (id, fallback, criteria = []) =>
  (criteria || []).find((c) => c.id === id)?.color || fallback;

export const formatMudekCodes = (code) =>
  String(code || "")
    .split("/")
    .map((c) => c.trim())
    .filter(Boolean)
    .join(" / ");

export const outcomeCodeLine = (code) => {
  const formatted = formatMudekCodes(code);
  return formatted ? `(${formatted})` : "";
};

// ── Derived stat helpers ─────────────────────────────────────
// Overall normalized average (%) across all criteria and all submission rows.
export function computeOverallAvg(submittedData, outcomes = []) {
  const rows = submittedData || [];
  if (!rows.length) return null;
  const allPcts = rows.flatMap((r) =>
    outcomes.map((o) => {
      const v = Number(r[o.key]);
      return o.max > 0 && Number.isFinite(v) ? (v / o.max) * 100 : null;
    }).filter((v) => v !== null)
  );
  return allPcts.length ? fmt1(mean(allPcts)) : null;
}

// ── Dataset builder pure functions ───────────────────────────
// All builders are pure functions (no component closure) — safe to call
// outside the component and easy to unit test independently.

export function buildOutcomeByGroupDataset(dashboardStats, outcomes = []) {
  const groups = (dashboardStats || []).filter((s) => s.count > 0);
  const headers = [
    "Group",
    ...outcomes.flatMap((o) => [`${o.label} Avg`, `${o.label} (%)`]),
  ];
  const rows = groups.map((g) => {
    const cells = outcomes.flatMap((o) => {
      const avgRaw = Number(g.avg?.[o.key] ?? 0);
      const pct = o.max > 0 ? (avgRaw / o.max) * 100 : 0;
      return [fmt2(avgRaw), fmt1(pct)];
    });
    return [g.name, ...cells];
  });
  return {
    sheet: "Outcome Group",
    title: CHART_COPY.outcomeByGroup.title,
    note: CHART_COPY.outcomeByGroup.note,
    headers,
    rows,
  };
}

export function buildProgrammeAveragesDataset(submittedData, outcomes = []) {
  const rows = submittedData || [];
  const headers = ["Outcome", "Max", "Avg (raw)", "Avg (%)", "Std. deviation (σ) (%) [sample]", "N"];
  const dataRows = outcomes.map((o) => {
    const vals   = outcomeValues(rows, o.key);
    const avgRaw = vals.length ? mean(vals) : 0;
    const pct    = o.max > 0 ? (avgRaw / o.max) * 100 : 0;
    const sd     = vals.length > 1 ? (stdDev(vals, true) / o.max) * 100 : 0;
    return [o.label, o.max, fmt2(avgRaw), fmt1(pct), fmt1(sd), vals.length];
  });
  return {
    sheet: "Programme Avg",
    title: CHART_COPY.programmeAverages.title,
    note: CHART_COPY.programmeAverages.note,
    headers,
    rows: dataRows,
  };
}

export function buildTrendDataset(trendData, semesterOptions, selectedIds, outcomes = []) {
  const dataMap = new Map((trendData || []).map((row) => [row.periodId, row]));
  const orderIndex = new Map((semesterOptions || []).map((s, i) => [s.id, i]));
  const ordered = (semesterOptions || [])
    .filter((s) => (selectedIds || []).includes(s.id))
    .sort((a, b) => (orderIndex.get(b.id) ?? 0) - (orderIndex.get(a.id) ?? 0));

  // DB columns are fixed (technical/written/oral/teamwork) — map by key
  const DB_KEY_MAP = { technical: "avgTechnical", design: "avgWritten", delivery: "avgOral", teamwork: "avgTeamwork" };
  const headers = ["Period", "N", ...outcomes.map((o) => `${o.label} (%)`)];
  const pct = (raw, max) => (Number.isFinite(raw) && max > 0 ? fmt1((raw / max) * 100) : null);

  const rows = ordered.map((s) => {
    const row = dataMap.get(s.id);
    const cells = outcomes.map((o) => {
      const dbKey = DB_KEY_MAP[o.key];
      const raw = dbKey ? row?.[dbKey] : undefined;
      return pct(raw, o.max);
    });
    return [s.period_name || row?.periodName || "—", row?.nEvals ?? 0, ...cells];
  });
  return {
    sheet: "Period Trend",
    title: CHART_COPY.semesterTrend.title,
    note: CHART_COPY.semesterTrend.note,
    headers,
    rows,
  };
}

export function buildCompetencyProfilesDataset(dashboardStats, outcomes = []) {
  const groups = (dashboardStats || []).filter((s) => s.count > 0);
  const headers = ["Group", ...outcomes.map((o) => `${o.label} (%)`)];
  const rows = groups.map((g) => {
    const vals = outcomes.map((o) => {
      const avgRaw = Number(g.avg?.[o.key] ?? 0);
      const pct = o.max > 0 ? (avgRaw / o.max) * 100 : 0;
      return fmt1(pct);
    });
    return [g.name, ...vals];
  });
  const cohort = outcomes.map((o) => {
    const vals = groups.map((g) => {
      const avgRaw = Number(g.avg?.[o.key] ?? 0);
      return o.max > 0 ? (avgRaw / o.max) * 100 : 0;
    });
    return fmt1(mean(vals));
  });
  if (rows.length) rows.push(["Cohort Average", ...cohort]);
  return {
    sheet: "Competency",
    title: CHART_COPY.competencyProfile.title,
    note: CHART_COPY.competencyProfile.note,
    headers,
    rows,
  };
}

export function buildJurorConsistencyDataset(dashboardStats, submittedData, outcomes = []) {
  const groups = (dashboardStats || []).filter((s) => s.count > 0);
  const rows   = submittedData || [];
  const headers = ["Group", ...outcomes.map((o) => o.label)];

  const buildMatrix = (metric) =>
    groups.map((g) => {
      const cells = outcomes.map((o) => {
        const vals = rows
          .filter((r) => r.projectId === g.id)
          .map((r) => Number(r[o.key]))
          .filter((v) => Number.isFinite(v));
        if (!vals.length) return null;
        const m = mean(vals);
        if (metric === "n") return vals.length;
        if (metric === "mean") return fmt1(o.max > 0 ? (m / o.max) * 100 : 0);
        if (metric === "sd") return fmt2(stdDev(vals, true));
        if (metric === "cv") {
          if (vals.length < 2 || !m) return null;
          return fmt1((stdDev(vals, true) / m) * 100);
        }
        return null;
      });
      return [g.name, ...cells];
    });

  return {
    sheet: "Juror CV",
    title: CHART_COPY.jurorConsistency.title,
    note: CHART_COPY.jurorConsistency.note,
    headers,
    rows: buildMatrix("cv"),
    extra: [
      { title: "Mean (%) by Group x Criterion", headers, rows: buildMatrix("mean") },
      { title: "Std. deviation (σ) by Group x Criterion", headers, rows: buildMatrix("sd") },
      { title: "N (Juror Count) by Group x Criterion", headers, rows: buildMatrix("n") },
    ],
  };
}

export function buildCriterionBoxplotDataset(submittedData, outcomes = []) {
  const rows = submittedData || [];
  const headers = [
    "Outcome",
    "Q1 (%)",
    "Median (%)",
    "Q3 (%)",
    "Whisker Min (%)",
    "Whisker Max (%)",
    "Outliers (count)",
    "N",
  ];
  const dataRows = outcomes.map((o) => {
    const vals = rows
      .map((r) => Number(r[o.key]))
      .filter((v) => Number.isFinite(v))   // 0 is a valid score — not excluded
      .map((v) => (v / o.max) * 100)
      .sort((a, b) => a - b);
    const bp = buildBoxplotStats(vals);
    if (!bp) return [o.label, null, null, null, null, null, 0, 0];
    return [
      o.label,
      fmt1(bp.q1),
      fmt1(bp.med),
      fmt1(bp.q3),
      fmt1(bp.whiskerMin),
      fmt1(bp.whiskerMax),
      bp.outliers.length,
      vals.length,
    ];
  });
  return {
    sheet: "Boxplot",
    title: CHART_COPY.scoreDistribution.title,
    note: CHART_COPY.scoreDistribution.note,
    headers,
    rows: dataRows,
  };
}

export function buildRubricAchievementDataset(submittedData, outcomes = []) {
  const rows = submittedData || [];
  const classify = (v, rubric) => {
    if (!Number.isFinite(v)) return null;
    for (const band of rubric) {
      if (v >= band.min && v <= band.max) return band.level.toLowerCase();
    }
    return null;
  };
  const headers = [
    "Outcome",
    "Total",
    "Excellent (count)",
    "Excellent (%)",
    "Good (count)",
    "Good (%)",
    "Developing (count)",
    "Developing (%)",
    "Insufficient (count)",
    "Insufficient (%)",
  ];
  const dataRows = outcomes.map((o) => {
    const rubric = o.rubric || [];
    // Derive band keys from config — not hardcoded — so renaming a level auto-adapts.
    const bandKeys = rubric.map((b) => b.level.toLowerCase());
    const vals = rows.map((r) => Number(r[o.key])).filter((v) => Number.isFinite(v));
    const counts = Object.fromEntries(bandKeys.map((k) => [k, 0]));
    vals.forEach((v) => {
      const k = classify(v, rubric);
      if (k && k in counts) counts[k] += 1;
    });
    const total = vals.length || 0;
    const pct = (n) => (total ? (n / total) * 100 : 0);
    // Always output in fixed band order for Excel column consistency
    const excellent   = counts["excellent"]   ?? 0;
    const good        = counts["good"]        ?? 0;
    const developing  = counts["developing"]  ?? 0;
    const insufficient = counts["insufficient"] ?? 0;
    return [
      o.label,
      total,
      excellent,
      fmt1(pct(excellent)),
      good,
      fmt1(pct(good)),
      developing,
      fmt1(pct(developing)),
      insufficient,
      fmt1(pct(insufficient)),
    ];
  });

  return {
    sheet: "Rubric Dist",
    title: CHART_COPY.achievementDistribution.title,
    note: CHART_COPY.achievementDistribution.note,
    headers,
    rows: dataRows,
  };
}

export function buildMudekMappingDataset(outcomes = [], mudekLookup = null) {
  const headers = ["Criteria", "MÜDEK Code(s)", "MÜDEK Outcome(s)"];
  const rows = [];
  const merges = [];
  const alignments = [];
  let rowIndex = 0;
  outcomes.forEach((o) => {
    // mudek_outcomes is stored as array of MÜDEK internal ids in criteria_config
    // For config-derived OUTCOMES, o.code is a slash-joined string of display codes
    const ids = Array.isArray(o.mudek_outcomes) ? o.mudek_outcomes : [];
    const codes = ids.length > 0 ? ids : (o.code ? String(o.code).split("/").map((c) => c.trim()).filter(Boolean) : []);
    const label = o.label;
    const count = Math.max(1, codes.length);
    if (!codes.length) {
      rows.push([label, "—", "—"]);
      alignments.push({ start: rowIndex, end: rowIndex, col: 0, valign: "center" });
    } else {
      codes.forEach((code, idx) => {
        let text = "—";
        const entry = mudekLookup?.[code];
        if (entry) {
          text = entry.desc_en || entry.desc_tr || "—";
        }
        const displayCode = entry?.code || code;
        rows.push([idx === 0 ? label : "", displayCode, text]);
        if (idx === 0) {
          alignments.push({ start: rowIndex, end: rowIndex + count - 1, col: 0, valign: "center" });
        }
      });
    }
    if (count > 1) {
      merges.push({ start: rowIndex, end: rowIndex + count - 1, col: 0 });
    }
    rowIndex += count;
  });
  return {
    sheet: "MÜDEK Mapping",
    title: "MÜDEK Outcome Mapping",
    note: "Criteria-to-MÜDEK outcome references used in analytics.",
    headers,
    rows,
    merges,
    alignments,
  };
}

const OUTCOME_TREND_COLORS = [
  "#6366F1", "#EC4899", "#14B8A6", "#F97316",
  "#8B5CF6", "#06B6D4", "#F43F5E", "#10B981",
];

/**
 * Transforms getOutcomeAttainmentTrends() output into Recharts-compatible rows.
 *
 * @param {object[]} outcomeTrendData — output of getOutcomeAttainmentTrends()
 * @param {object[]} semesterOptions  — period list [{ id, period_name, startDate }]
 * @param {string[]} selectedIds      — selected period IDs
 * @returns {{ rows: object[], outcomeMeta: object[] }}
 *   rows: one entry per period with {period, "{code}_att", "{code}_avg"} keys (null for missing)
 *   outcomeMeta: [{ code, label, color, attKey, avgKey }]
 */
export function buildOutcomeAttainmentTrendDataset(outcomeTrendData, semesterOptions, selectedIds) {
  if (!outcomeTrendData?.length) return { rows: [], outcomeMeta: [] };

  const dataMap = new Map((outcomeTrendData || []).map((row) => [row.periodId, row]));

  // Sort periods chronologically
  const ordered = (semesterOptions || [])
    .filter((s) => (selectedIds || []).includes(s.id))
    .sort((a, b) => {
      const da = a.startDate ? new Date(a.startDate) : 0;
      const db = b.startDate ? new Date(b.startDate) : 0;
      return da - db;
    });

  // Collect all outcome codes across all periods, preserving first-seen label
  const codeOrder = [];
  const outcomeLabelMap = {};
  for (const row of outcomeTrendData) {
    for (const o of row.outcomes || []) {
      if (!outcomeLabelMap[o.code]) {
        codeOrder.push(o.code);
        outcomeLabelMap[o.code] = o.label || o.code;
      }
    }
  }
  codeOrder.sort((a, b) => a.localeCompare(b));

  // Build Recharts row per period
  const rows = ordered.map((s) => {
    const row = dataMap.get(s.id);
    const point = { period: s.period_name || s.name || row?.periodName || "—" };
    for (const code of codeOrder) {
      const outcome = row?.outcomes?.find((o) => o.code === code);
      point[`${code}_att`] = outcome?.attainmentRate ?? null;
      point[`${code}_avg`] = outcome?.avg ?? null;
    }
    return point;
  });

  const outcomeMeta = codeOrder.map((code, i) => ({
    code,
    label: outcomeLabelMap[code],
    color: OUTCOME_TREND_COLORS[i % OUTCOME_TREND_COLORS.length],
    attKey: `${code}_att`,
    avgKey: `${code}_avg`,
  }));

  return { rows, outcomeMeta };
}

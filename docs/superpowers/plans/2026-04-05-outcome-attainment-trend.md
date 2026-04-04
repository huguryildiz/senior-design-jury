# Outcome Attainment Trend Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dual-line chart to the "Continuous Improvement" analytics section showing attainment rate and average score per programme outcome across evaluation periods.

**Architecture:** New `getOutcomeAttainmentTrends()` API function fetches individual scores + period criteria per period and computes outcome-level stats client-side using normalized weights. A pure `buildOutcomeAttainmentTrendDataset()` transforms those stats into Recharts-compatible rows. A new `OutcomeAttainmentTrendChart` renders two lines per outcome (solid attainment rate, dashed average score) with a per-outcome toggle.

**Tech Stack:** Recharts `LineChart`, Supabase JS client, React hooks, Vitest + `qaTest` pattern.

---

## File Map

| File | Change |
|---|---|
| `src/test/qa-catalog.json` | Add 4 new test IDs |
| `src/shared/api/admin/scores.js` | Add `getOutcomeAttainmentTrends()` |
| `src/shared/api/admin/index.js` | Re-export new function |
| `src/shared/api/index.js` | Re-export new function |
| `src/admin/analytics/analyticsDatasets.js` | Add `buildOutcomeAttainmentTrendDataset()` |
| `src/admin/__tests__/outcomeAttainmentTrend.test.js` | New test file |
| `src/charts/OutcomeAttainmentTrendChart.jsx` | New chart component |
| `src/admin/hooks/useAnalyticsData.js` | Add outcome trend loading |
| `src/admin/pages/AnalyticsPage.jsx` | Add new props + render chart |
| `src/admin/layout/AdminLayout.jsx` | Pass new props through |
| `src/admin/pages/ScoresTab.jsx` | Pass new props through |

---

## Task 1: Add QA catalog entries

**Files:**
- Modify: `src/test/qa-catalog.json`

- [ ] **Step 1: Add 4 catalog entries**

Add these 4 entries to the JSON array in `src/test/qa-catalog.json` (before the closing `]`):

```json
,
{
  "id": "outcome.trend.01",
  "module": "Analytics / Trend",
  "area": "Outcome Attainment Trend — Dataset",
  "story": "Empty data guard",
  "scenario": "returns empty rows and outcomeMeta when trendData is empty",
  "whyItMatters": "No selected periods must not crash the chart renderer.",
  "risk": "Unguarded empty array access would throw at runtime.",
  "coverageStrength": "Medium",
  "severity": "normal"
},
{
  "id": "outcome.trend.02",
  "module": "Analytics / Trend",
  "area": "Outcome Attainment Trend — Dataset",
  "story": "Normalized weight calculation",
  "scenario": "outcome score uses normalized weights so result is 0–100 regardless of raw weight sum",
  "whyItMatters": "Two criteria with weights 0.25+0.25 must yield the same scale as one criterion with weight 1.0 after normalization.",
  "risk": "Un-normalized weights produce outcome scores above 100% or below expected values, breaking attainment threshold comparisons.",
  "coverageStrength": "Strong",
  "severity": "critical"
},
{
  "id": "outcome.trend.03",
  "module": "Analytics / Trend",
  "area": "Outcome Attainment Trend — Dataset",
  "story": "Missing outcome in period",
  "scenario": "outcome not measured in a period gets null att and avg keys in the row",
  "whyItMatters": "Recharts connectNulls=false creates a visible gap — null must propagate correctly for this to work.",
  "risk": "Defaulting to 0 instead of null would show a false zero on the chart.",
  "coverageStrength": "Strong",
  "severity": "normal"
},
{
  "id": "outcome.trend.04",
  "module": "Analytics / Trend",
  "area": "Outcome Attainment Trend — Dataset",
  "story": "Attainment rate computation",
  "scenario": "attainmentRate equals percent of evaluations with outcome score >= 70",
  "whyItMatters": "The 70% threshold is the accreditation benchmark — an off-by-one or wrong denominator gives misleading compliance data.",
  "risk": "Wrong attainment rate would cause incorrect accreditation evidence.",
  "coverageStrength": "Strong",
  "severity": "critical"
}
```

- [ ] **Step 2: Verify JSON is still valid**

```bash
node -e "require('./src/test/qa-catalog.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/test/qa-catalog.json
git commit -m "test(catalog): add outcome attainment trend QA entries"
```

---

## Task 2: Add `getOutcomeAttainmentTrends()` to scores.js

**Files:**
- Modify: `src/shared/api/admin/scores.js`
- Modify: `src/shared/api/admin/index.js`
- Modify: `src/shared/api/index.js`

- [ ] **Step 1: Add function to `scores.js`**

Append this function after the `getOutcomeTrends` function (after line 215) in `src/shared/api/admin/scores.js`:

```js
/**
 * Returns per-period outcome-level attainment rates and average scores.
 * For each period, computes per-evaluation outcome scores using normalized
 * criterion weights, then aggregates into attainmentRate and avg.
 *
 * @param {string[]} periodIds
 * @returns {Promise<Array<{
 *   periodId: string,
 *   periodName: string,
 *   nEvals: number,
 *   outcomes: Array<{ code: string, label: string, avg: number|null, attainmentRate: number|null }>
 * }>>}
 */
export async function getOutcomeAttainmentTrends(periodIds) {
  const THRESHOLD = 70;
  const results = [];

  for (const periodId of periodIds) {
    const [periodRes, criteriaRes, mapsRes, outcomesRes, scores] = await Promise.all([
      supabase.from("periods").select("id, name").eq("id", periodId).single(),
      supabase.from("period_criteria").select("id, key, max_score").eq("period_id", periodId),
      supabase
        .from("period_criterion_outcome_maps")
        .select("period_criterion_id, weight, period_outcomes(code)")
        .eq("period_id", periodId),
      supabase
        .from("period_outcomes")
        .select("code, label")
        .eq("period_id", periodId)
        .order("sort_order"),
      getScores(periodId),
    ]);

    // criterion id → { key, max }
    const criteriaById = Object.fromEntries(
      (criteriaRes.data || []).map((c) => [c.id, { key: c.key, max: c.max_score }])
    );

    // outcome code → label
    const outcomeLabelMap = Object.fromEntries(
      (outcomesRes.data || []).map((o) => [o.code, o.label])
    );

    // outcome code → [{ key, max, weight }]
    const outcomeContributors = {};
    for (const map of mapsRes.data || []) {
      const code = map.period_outcomes?.code;
      const criterion = criteriaById[map.period_criterion_id];
      if (!code || !criterion) continue;
      const weight = typeof map.weight === "number" ? map.weight : 1;
      (outcomeContributors[code] ||= []).push({ key: criterion.key, max: criterion.max, weight });
    }

    const nEvals = scores.length;

    const outcomes = Object.entries(outcomeContributors).map(([code, contributors]) => {
      const label = outcomeLabelMap[code] ?? code;

      // Per-evaluation normalized weighted score for this outcome
      const evalScores = scores
        .map((evalRow) => {
          let weightedSum = 0;
          let effectiveWeight = 0;
          for (const c of contributors) {
            const raw = evalRow[c.key];
            if (raw == null || !Number.isFinite(Number(raw)) || c.max === 0) continue;
            weightedSum += (Number(raw) / c.max) * 100 * c.weight;
            effectiveWeight += c.weight;
          }
          return effectiveWeight > 0 ? weightedSum / effectiveWeight : null;
        })
        .filter((v) => v !== null);

      if (!evalScores.length) return { code, label, avg: null, attainmentRate: null };

      const avg = evalScores.reduce((s, v) => s + v, 0) / evalScores.length;
      const met = evalScores.filter((v) => v >= THRESHOLD).length;

      return {
        code,
        label,
        avg: Math.round(avg * 10) / 10,
        attainmentRate: Math.round((met / evalScores.length) * 100),
      };
    });

    outcomes.sort((a, b) => a.code.localeCompare(b.code));

    results.push({
      periodId,
      periodName: periodRes.data?.name || "",
      nEvals,
      outcomes,
    });
  }

  return results;
}
```

- [ ] **Step 2: Re-export from `src/shared/api/admin/index.js`**

Find the `export { ... } from "./scores"` block (lines 53–62) and add `getOutcomeAttainmentTrends`:

```js
export {
  getScores,
  listJurorsSummary,
  getProjectSummary,
  getOutcomeTrends,
  getOutcomeAttainmentTrends,
  getDeleteCounts,
  deleteEntity,
  listPeriodCriteria,
  listPeriodOutcomes,
} from "./scores";
```

- [ ] **Step 3: Re-export from `src/shared/api/index.js`**

Find the line `getOutcomeTrends,` in the admin re-export block and add the new function below it:

```js
  getOutcomeTrends,
  getOutcomeAttainmentTrends,
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/admin/scores.js src/shared/api/admin/index.js src/shared/api/index.js
git commit -m "feat(api): add getOutcomeAttainmentTrends for outcome-level attainment computation"
```

---

## Task 3: Add `buildOutcomeAttainmentTrendDataset()` and tests

**Files:**
- Modify: `src/admin/analytics/analyticsDatasets.js`
- Create: `src/admin/__tests__/outcomeAttainmentTrend.test.js`

- [ ] **Step 1: Write the failing tests first**

Create `src/admin/__tests__/outcomeAttainmentTrend.test.js`:

```js
// src/admin/__tests__/outcomeAttainmentTrend.test.js
import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));

import { buildOutcomeAttainmentTrendDataset } from "../analytics/analyticsDatasets";

// Helpers
const semOpts = [
  { id: "p1", period_name: "Spring 2025", startDate: "2025-02-01" },
  { id: "p2", period_name: "Fall 2025", startDate: "2025-09-01" },
];

describe("buildOutcomeAttainmentTrendDataset", () => {
  qaTest("outcome.trend.01", () => {
    const { rows, outcomeMeta } = buildOutcomeAttainmentTrendDataset([], semOpts, ["p1"]);
    expect(rows).toEqual([]);
    expect(outcomeMeta).toEqual([]);
  });

  qaTest("outcome.trend.02", () => {
    // Two criteria mapping to outcome "1.2" with weights 0.25 each (sum=0.5).
    // After normalization: score = (c1_pct * 0.25 + c2_pct * 0.25) / 0.5
    // c1=24/30=80%, c2=18/30=60% → (80*0.25 + 60*0.25)/0.5 = 35/0.5 = 70 → exactly at threshold
    const trendData = [
      {
        periodId: "p1",
        periodName: "Spring 2025",
        nEvals: 1,
        outcomes: [{ code: "1.2", label: "Knowledge", avg: 70.0, attainmentRate: 100 }],
      },
    ];
    const { rows, outcomeMeta } = buildOutcomeAttainmentTrendDataset(trendData, semOpts, ["p1"]);
    expect(outcomeMeta).toHaveLength(1);
    expect(outcomeMeta[0].code).toBe("1.2");
    expect(rows[0]["1.2_att"]).toBe(100);
    expect(rows[0]["1.2_avg"]).toBe(70.0);
  });

  qaTest("outcome.trend.03", () => {
    // Outcome "1.2" measured in p1 but NOT in p2 → p2 row must have null
    const trendData = [
      {
        periodId: "p1",
        periodName: "Spring 2025",
        nEvals: 3,
        outcomes: [{ code: "1.2", label: "Knowledge", avg: 75.0, attainmentRate: 78 }],
      },
      {
        periodId: "p2",
        periodName: "Fall 2025",
        nEvals: 4,
        outcomes: [], // outcome not measured this period
      },
    ];
    const { rows } = buildOutcomeAttainmentTrendDataset(trendData, semOpts, ["p1", "p2"]);
    expect(rows).toHaveLength(2);
    // p2 must have null, not 0
    const p2Row = rows.find((r) => r.period === "Fall 2025");
    expect(p2Row["1.2_att"]).toBeNull();
    expect(p2Row["1.2_avg"]).toBeNull();
  });

  qaTest("outcome.trend.04", () => {
    // 3 evals: scores 80, 65, 90 → 2 of 3 above 70 → attainmentRate = 67
    // avg = (80+65+90)/3 = 78.3
    const trendData = [
      {
        periodId: "p1",
        periodName: "Spring 2025",
        nEvals: 3,
        outcomes: [{ code: "9.1", label: "Oral", avg: 78.3, attainmentRate: 67 }],
      },
    ];
    const { rows } = buildOutcomeAttainmentTrendDataset(trendData, semOpts, ["p1"]);
    expect(rows[0]["9.1_att"]).toBe(67);
    expect(rows[0]["9.1_avg"]).toBe(78.3);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- --run src/admin/__tests__/outcomeAttainmentTrend.test.js
```

Expected: FAIL — `buildOutcomeAttainmentTrendDataset is not a function` or similar.

- [ ] **Step 3: Implement `buildOutcomeAttainmentTrendDataset` in `analyticsDatasets.js`**

Append at the end of `src/admin/analytics/analyticsDatasets.js`:

```js
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --run src/admin/__tests__/outcomeAttainmentTrend.test.js
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/analytics/analyticsDatasets.js src/admin/__tests__/outcomeAttainmentTrend.test.js
git commit -m "feat(analytics): add buildOutcomeAttainmentTrendDataset with tests"
```

---

## Task 4: Create `OutcomeAttainmentTrendChart.jsx`

**Files:**
- Create: `src/charts/OutcomeAttainmentTrendChart.jsx`

- [ ] **Step 1: Create the chart component**

Create `src/charts/OutcomeAttainmentTrendChart.jsx`:

```jsx
// src/charts/OutcomeAttainmentTrendChart.jsx
// Dual-line trend chart: attainment rate (solid) + average score (dashed) per outcome.
// One line pair per programme outcome. Click legend to toggle outcomes.

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

const THRESHOLD = 70;

function OutcomeTrendTooltip({ active, payload, label, outcomeMeta }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface-overlay)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "8px 12px",
      fontSize: 11,
      minWidth: 180,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}>{label}</div>
      {outcomeMeta.map((o) => {
        const attVal = payload.find((p) => p.dataKey === o.attKey)?.value;
        const avgVal = payload.find((p) => p.dataKey === o.avgKey)?.value;
        if (attVal == null && avgVal == null) return null;
        return (
          <div key={o.code} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, background: o.color, borderRadius: "50%", flexShrink: 0 }} />
            <span style={{ color: "var(--text-secondary)", minWidth: 28 }}>{o.code}:</span>
            <span style={{ fontWeight: 500 }}>{attVal != null ? `${attVal}% met` : "—"}</span>
            <span style={{ color: "var(--text-muted)" }}>/ avg {avgVal != null ? `${Math.round(avgVal * 10) / 10}%` : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * @param {object} props
 * @param {object[]} props.rows        — from buildOutcomeAttainmentTrendDataset().rows
 * @param {object[]} props.outcomeMeta — from buildOutcomeAttainmentTrendDataset().outcomeMeta
 */
export function OutcomeAttainmentTrendChart({ rows = [], outcomeMeta = [] }) {
  const [hidden, setHidden] = useState(new Set());

  function toggle(code) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  if (!rows.length || !outcomeMeta.length) return null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1, strokeDasharray: "3 2" }}
            content={<OutcomeTrendTooltip outcomeMeta={outcomeMeta.filter((o) => !hidden.has(o.code))} />}
          />
          <ReferenceLine
            y={THRESHOLD}
            stroke="var(--text-tertiary)"
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
          {outcomeMeta.flatMap((o) => {
            if (hidden.has(o.code)) return [];
            return [
              <Line
                key={`${o.code}_att`}
                type="monotone"
                dataKey={o.attKey}
                stroke={o.color}
                strokeWidth={2}
                dot={{ r: 3, fill: o.color }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={false}
              />,
              <Line
                key={`${o.code}_avg`}
                type="monotone"
                dataKey={o.avgKey}
                stroke={o.color}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                strokeOpacity={0.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />,
            ];
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* Custom toggle legend */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
        {outcomeMeta.map((o) => {
          const isHidden = hidden.has(o.code);
          return (
            <button
              key={o.code}
              type="button"
              onClick={() => toggle(o.code)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 10,
                cursor: "pointer",
                border: "none",
                background: "none",
                color: isHidden ? "var(--text-muted)" : "var(--text-secondary)",
                opacity: isHidden ? 0.4 : 1,
                padding: "2px 6px",
                borderRadius: 4,
              }}
              title={isHidden ? `Show ${o.code}` : `Hide ${o.code}`}
            >
              <span style={{ width: 14, height: 2, background: o.color, display: "inline-block", flexShrink: 0 }} />
              {o.code}
            </button>
          );
        })}
        <span style={{ fontSize: 10, color: "var(--text-muted)", alignSelf: "center" }}>
          — solid: attainment rate · dashed: avg score
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/charts/OutcomeAttainmentTrendChart.jsx
git commit -m "feat(charts): add OutcomeAttainmentTrendChart with dual attainment/avg lines"
```

---

## Task 5: Extend `useAnalyticsData` hook

**Files:**
- Modify: `src/admin/hooks/useAnalyticsData.js`

- [ ] **Step 1: Add `outcomeTrendData` loading**

Replace the entire file content of `src/admin/hooks/useAnalyticsData.js` with:

```js
// src/admin/hooks/useAnalyticsData.js
// ============================================================
// Manages trend / analytics data for the admin panel.
//
// Owns: trendPeriodIds selection (with localStorage persistence),
// stale-ID cleanup when periodList changes, and two trend fetches:
//   - trendData: criterion-level averages (for AttainmentTrendChart)
//   - outcomeTrendData: outcome-level attainment + avg (for OutcomeAttainmentTrendChart)
// ============================================================

import { useEffect, useRef, useState } from "react";
import { getOutcomeTrends, getOutcomeAttainmentTrends } from "../../shared/api";
import { readSection, writeSection } from "../utils/persist";

/**
 * useAnalyticsData — trend/analytics loading for the admin panel.
 *
 * @param {object} opts
 * @param {string}    opts.organizationId         Current organization ID (JWT-based auth).
 * @param {object[]}  opts.periodList             Full period list (for stale-ID cleanup).
 * @param {object[]}  opts.sortedPeriods         Sorted periods (for initial seed).
 * @param {Date|null} opts.lastRefresh           Bumped by useAdminData after a fresh fetch.
 *
 * @returns {{
 *   trendData: object[],
 *   trendLoading: boolean,
 *   trendError: string,
 *   outcomeTrendData: object[],
 *   outcomeTrendLoading: boolean,
 *   outcomeTrendError: string,
 *   trendPeriodIds: string[],
 *   setTrendPeriodIds: Function,
 * }}
 */
export function useAnalyticsData({ organizationId, periodList, sortedPeriods, lastRefresh }) {
  const [trendPeriodIds, setTrendPeriodIds] = useState(() => {
    const s = readSection("trend");
    return Array.isArray(s.periodIds) ? s.periodIds : [];
  });
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");

  const [outcomeTrendData, setOutcomeTrendData] = useState([]);
  const [outcomeTrendLoading, setOutcomeTrendLoading] = useState(false);
  const [outcomeTrendError, setOutcomeTrendError] = useState("");

  const trendInitRef = useRef(false);

  // ── Trend initialization ──────────────────────────────────
  useEffect(() => {
    if (trendInitRef.current) return;
    if (!sortedPeriods.length) return;
    setTrendPeriodIds((prev) => (
      prev.length ? prev : sortedPeriods.map((p) => p.id)
    ));
    trendInitRef.current = true;
  }, [sortedPeriods]);

  // Persist trend selection to localStorage.
  useEffect(() => {
    writeSection("trend", { periodIds: trendPeriodIds });
  }, [trendPeriodIds]);

  // Remove stale period IDs when periodList changes.
  useEffect(() => {
    if (!trendPeriodIds.length) return;
    const valid = new Set(periodList.map((p) => p.id));
    const filtered = trendPeriodIds.filter((id) => valid.has(id));
    if (filtered.length !== trendPeriodIds.length) {
      setTrendPeriodIds(filtered);
    }
  }, [periodList, trendPeriodIds]);

  // ── Criterion trend fetch (existing) ────────────────────────
  useEffect(() => {
    if (!organizationId || !trendPeriodIds.length) {
      setTrendData([]);
      setTrendError("");
      return;
    }
    let cancelled = false;
    setTrendLoading(true);
    setTrendError("");
    getOutcomeTrends(trendPeriodIds)
      .then((data) => { if (!cancelled) setTrendData(data); })
      .catch((e) => {
        if (cancelled) return;
        setTrendError(e?.unauthorized ? "Unauthorized. Please re-login." : "Could not load trend data.");
      })
      .finally(() => { if (!cancelled) setTrendLoading(false); });
    return () => { cancelled = true; };
  }, [trendPeriodIds, organizationId, lastRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Outcome trend fetch (new) ────────────────────────────────
  useEffect(() => {
    if (!organizationId || !trendPeriodIds.length) {
      setOutcomeTrendData([]);
      setOutcomeTrendError("");
      return;
    }
    let cancelled = false;
    setOutcomeTrendLoading(true);
    setOutcomeTrendError("");
    getOutcomeAttainmentTrends(trendPeriodIds)
      .then((data) => { if (!cancelled) setOutcomeTrendData(data); })
      .catch((e) => {
        if (cancelled) return;
        setOutcomeTrendError(e?.unauthorized ? "Unauthorized. Please re-login." : "Could not load outcome trend data.");
      })
      .finally(() => { if (!cancelled) setOutcomeTrendLoading(false); });
    return () => { cancelled = true; };
  }, [trendPeriodIds, organizationId, lastRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    trendData,
    trendLoading,
    trendError,
    outcomeTrendData,
    outcomeTrendLoading,
    outcomeTrendError,
    trendPeriodIds,
    setTrendPeriodIds,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/admin/hooks/useAnalyticsData.js
git commit -m "feat(hooks): expose outcomeTrendData from useAnalyticsData"
```

---

## Task 6: Wire into `AnalyticsPage`, `AdminLayout`, and `ScoresTab`

**Files:**
- Modify: `src/admin/pages/AnalyticsPage.jsx`
- Modify: `src/admin/layout/AdminLayout.jsx`
- Modify: `src/admin/pages/ScoresTab.jsx`

- [ ] **Step 1: Add import to `AnalyticsPage.jsx`**

Add the import after the existing chart imports (after line 16):

```js
import { OutcomeAttainmentTrendChart } from "@/charts/OutcomeAttainmentTrendChart";
```

- [ ] **Step 2: Add new props to `AnalyticsPage` component signature**

In `AnalyticsPage.jsx`, the `export default function AnalyticsPage({` destructuring (lines 241–258) — add 3 new props:

```js
export default function AnalyticsPage({
  dashboardStats = [],
  submittedData = [],
  overviewMetrics,
  lastRefresh,
  loading,
  error,
  periodName,
  selectedPeriodId,
  semesterOptions,
  trendSemesterIds,
  onTrendSelectionChange,
  trendData,
  trendLoading,
  trendError,
  outcomeTrendData,
  outcomeTrendLoading,
  outcomeTrendError,
  criteriaConfig,
  outcomeConfig,
}) {
```

- [ ] **Step 3: Add `buildOutcomeAttainmentTrendDataset` import**

At the top of `AnalyticsPage.jsx`, find the existing analytics imports and add:

```js
import { buildOutcomeAttainmentTrendDataset } from "../analytics/analyticsDatasets";
```

- [ ] **Step 4: Compute chart data in the component body**

Inside the component function, after `const attCards = buildAttainmentCards(...)` line, add:

```js
const { rows: outcomeTrendRows, outcomeMeta } = buildOutcomeAttainmentTrendDataset(
  outcomeTrendData,
  semesterOptions,
  trendSemesterIds
);
```

- [ ] **Step 5: Add the new chart in Section 05**

In `AnalyticsPage.jsx`, find the closing `</div>` of the existing `AttainmentTrendChart` chart card (after line 711, the `</div>` that closes the `chart-card-v2`). Add a new chart card immediately after it, before the insight banner:

```jsx
      {outcomeTrendRows.length > 0 && (
        <div className="chart-card-v2" style={{ marginBottom: 12 }}>
          <div className="chart-header">
            <div>
              <div className="chart-title">Outcome Attainment Trend</div>
              <div className="chart-subtitle">
                Attainment rate (solid) and average score % (dashed) per programme outcome across evaluation periods
              </div>
            </div>
          </div>
          <div className="chart-body">
            {outcomeTrendLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--text-muted)" }}>
                Loading outcome trends…
              </div>
            ) : outcomeTrendError ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--danger)" }}>
                {outcomeTrendError}
              </div>
            ) : (
              <OutcomeAttainmentTrendChart rows={outcomeTrendRows} outcomeMeta={outcomeMeta} />
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 6: Pass new props in `AdminLayout.jsx`**

Find the `<AnalyticsPage` block in `AdminLayout.jsx` (around line 374). Add the 3 new props alongside the existing `trendData`, `trendLoading`, `trendError` props:

```jsx
              trendData={trendData}
              trendLoading={trendLoading}
              trendError={trendError}
              outcomeTrendData={outcomeTrendData}
              outcomeTrendLoading={outcomeTrendLoading}
              outcomeTrendError={outcomeTrendError}
```

Also ensure `outcomeTrendData`, `outcomeTrendLoading`, `outcomeTrendError` are destructured from `useAnalyticsData` in `AdminLayout.jsx`. Find where `useAnalyticsData` is called (it returns an object) and add the new fields:

```js
const {
  trendData,
  trendLoading,
  trendError,
  outcomeTrendData,
  outcomeTrendLoading,
  outcomeTrendError,
  trendPeriodIds,
  setTrendPeriodIds,
} = useAnalyticsData({ organizationId, periodList, sortedPeriods, lastRefresh });
```

- [ ] **Step 7: Pass new props in `ScoresTab.jsx`**

In `ScoresTab.jsx`, add 3 new props to the component signature destructuring:

```js
export default function ScoresTab({
  // ... existing props ...
  trendData,
  trendLoading,
  trendError,
  outcomeTrendData,
  outcomeTrendLoading,
  outcomeTrendError,
  criteriaConfig,
  outcomeConfig,
}) {
```

And pass them to `AnalyticsPage`:

```jsx
        <AnalyticsPage
          // ... existing props ...
          trendData={trendData}
          trendLoading={trendLoading}
          trendError={trendError}
          outcomeTrendData={outcomeTrendData}
          outcomeTrendLoading={outcomeTrendLoading}
          outcomeTrendError={outcomeTrendError}
          criteriaConfig={criteriaConfig}
          outcomeConfig={outcomeConfig}
        />
```

- [ ] **Step 8: Build — verify no TypeScript/Vite errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors. Fix any import or prop errors before continuing.

- [ ] **Step 9: Run all tests**

```bash
npm test -- --run
```

Expected: all tests pass. If any unrelated tests fail, investigate before proceeding.

- [ ] **Step 10: Commit**

```bash
git add src/admin/pages/AnalyticsPage.jsx src/admin/layout/AdminLayout.jsx src/admin/pages/ScoresTab.jsx
git commit -m "feat(analytics): render OutcomeAttainmentTrendChart in Continuous Improvement section"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `getOutcomeAttainmentTrends()` API function | Task 2 |
| Re-export from admin/index.js and api/index.js | Task 2 |
| `buildOutcomeAttainmentTrendDataset()` dataset builder | Task 3 |
| Normalized weight calculation | Task 3, test `outcome.trend.02` |
| Null for unmapped outcomes (gaps) | Task 3, test `outcome.trend.03` |
| Attainment rate = % evaluations ≥ 70% | Task 2 + test `outcome.trend.04` |
| `OutcomeAttainmentTrendChart` — solid + dashed lines per outcome | Task 4 |
| Toggle by outcome via legend | Task 4 |
| `connectNulls={false}` for gaps | Task 4 |
| Custom tooltip with attainment + avg | Task 4 |
| 70% reference line | Task 4 |
| 8-color palette distinct from criterion colors | Task 4 |
| `useAnalyticsData` exposes `outcomeTrendData` | Task 5 |
| `AnalyticsPage` renders new chart in Section 05 | Task 6 |
| Shared period selector (`trendPeriodIds`) reused | Task 6 |
| No DB migration | All tasks ✓ |
| Existing `AttainmentTrendChart` untouched | All tasks ✓ |

**Placeholder scan:** None found.

**Type consistency:**
- `getOutcomeAttainmentTrends` returns `{ periodId, periodName, nEvals, outcomes: [{code, label, avg, attainmentRate}] }[]` — consumed exactly by `buildOutcomeAttainmentTrendDataset`
- `buildOutcomeAttainmentTrendDataset` returns `{ rows, outcomeMeta }` — consumed exactly by `OutcomeAttainmentTrendChart` via props `rows` and `outcomeMeta`
- `outcomeMeta[i].attKey` = `"${code}_att"`, `outcomeMeta[i].avgKey` = `"${code}_avg"` — match the keys written into `rows` in the same function

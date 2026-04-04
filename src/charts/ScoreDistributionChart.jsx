// src/charts/ScoreDistributionChart.jsx
// Overview: Score distribution histogram — total scores bucketed into ranges.
// Recharts BarChart. Takes rawScores with total field.
// Mirrors prototype "chart-overview-dist" (Chart.js bar chart, colored bins).

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

// Bin definitions: label, color, test fn (score is 0–100 percentage)
// Prototype colors: ['#ef4444','#f97316','#eab308','#84cc16','#22c55e','#16a34a']
const BINS = [
  { label: "<70",    color: "#ef4444", test: (v) => v < 70 },
  { label: "70–74",  color: "#f97316", test: (v) => v >= 70 && v < 75 },
  { label: "75–79",  color: "#eab308", test: (v) => v >= 75 && v < 80 },
  { label: "80–84",  color: "#84cc16", test: (v) => v >= 80 && v < 85 },
  { label: "85–89",  color: "#22c55e", test: (v) => v >= 85 && v < 90 },
  { label: "90+",    color: "#16a34a", test: (v) => v >= 90 },
];

// rawScores rows have `total` (raw score sum, 0–100: 30+30+30+10 max).
function buildBins(rawScores) {
  const counts = BINS.map(() => 0);
  for (const row of rawScores) {
    if (row.total == null) continue;
    const score = Math.min(100, row.total);
    for (let i = 0; i < BINS.length; i++) {
      if (BINS[i].test(score)) {
        counts[i]++;
        break;
      }
    }
  }
  return BINS.map((b, i) => ({ label: b.label, count: counts[i], color: b.color }));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
      padding: "8px 10px",
      fontSize: 11,
      boxShadow: "var(--shadow-elevated)",
      color: "var(--text-primary)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>{label}</div>
      <div>Evaluations: <strong>{payload[0]?.value}</strong></div>
    </div>
  );
};

/**
 * @param {object} props
 * @param {object[]} props.rawScores — score rows with `total` field
 */
export function ScoreDistributionChart({ rawScores = [] }) {
  const data = useMemo(() => buildBins(rawScores), [rawScores]);
  const total = data.reduce((s, b) => s + b.count, 0);

  if (!total) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, color: "var(--text-tertiary)", fontSize: 12 }}>
        No score data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 4 }} barCategoryGap="22%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

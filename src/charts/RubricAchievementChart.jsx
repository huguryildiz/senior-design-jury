// src/charts/RubricAchievementChart.jsx
// Stacked bar chart: rubric performance band breakdown per criterion.
// Uses recharts BarChart (stacked).

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export const BAND_COLORS = {
  excellent: "#22c55e",
  good: "#a3e635",
  developing: "#f59e0b",
  insufficient: "#ef4444",
};

const BAND_LABELS = ["excellent", "good", "developing", "insufficient"];

function classifyValue(v, rubric) {
  if (!Number.isFinite(v) || !rubric?.length) return null;
  for (const band of rubric) {
    if (v >= band.min && v <= band.max) return band.level?.toLowerCase() ?? null;
  }
  return null;
}

/**
 * @param {object} props
 * @param {object[]} props.submittedData — score rows
 */
export function RubricAchievementChart({ submittedData = [], criteria = [] }) {
  const rows = submittedData || [];

  const data = (criteria || []).map((c) => {
    const vals = rows.map((r) => Number(r[c.id])).filter((v) => Number.isFinite(v));
    const counts = Object.fromEntries(BAND_LABELS.map((k) => [k, 0]));
    vals.forEach((v) => {
      const k = classifyValue(v, c.rubric);
      if (k && k in counts) counts[k] += 1;
    });
    const total = vals.length || 1;
    return {
      name: c.shortLabel,
      excellent: Math.round((counts.excellent / total) * 100),
      good: Math.round((counts.good / total) * 100),
      developing: Math.round((counts.developing / total) * 100),
      insufficient: Math.round((counts.insufficient / total) * 100),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
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
          cursor={false}
          formatter={(v, name) => [`${v}%`, name.charAt(0).toUpperCase() + name.slice(1)]}
        />
        {BAND_LABELS.map((band) => (
          <Bar
            key={band}
            dataKey={band}
            name={band}
            stackId="a"
            fill={BAND_COLORS[band]}
            maxBarSize={40}
          />
        ))}
        <Legend
          iconType="square"
          iconSize={7}
          formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
          wrapperStyle={{ fontSize: 10, paddingTop: 8, color: "var(--text-secondary)" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

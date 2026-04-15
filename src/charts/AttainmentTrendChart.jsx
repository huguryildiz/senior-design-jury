// src/charts/AttainmentTrendChart.jsx
// Line chart: attainment rate (% of evals meeting 70% threshold) over evaluation periods.
// Uses recharts LineChart.

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// DB column keys for trend data (from useAnalyticsData / getOutcomeTrends)
const DB_KEY_MAP = {
  technical: "avgTechnical",
  design: "avgWritten",
  delivery: "avgOral",
  teamwork: "avgTeamwork",
};

/**
 * @param {object} props
 * @param {object[]} props.trendData      — rows from getOutcomeTrends
 * @param {object[]} props.semesterOptions — period list [{ id, period_name }]
 * @param {string[]} props.selectedIds     — selected period IDs
 * @param {object[]} props.criteria        — active criteria with max values
 */
export function AttainmentTrendChart({ trendData = [], semesterOptions = [], selectedIds = [], criteria = [], threshold = 70 }) {
  const activeCriteria = criteria || [];
  const maxMap = Object.fromEntries(activeCriteria.map((c) => [c.id, c.max]));
  const dataMap = new Map((trendData || []).map((row) => [row.periodId, row]));

  const ordered = (semesterOptions || [])
    .filter((s) => (selectedIds || []).includes(s.id))
    .sort((a, b) => {
      // Sort ascending by start date if available, else by array order
      const da = a.startDate ? new Date(a.startDate) : 0;
      const db = b.startDate ? new Date(b.startDate) : 0;
      return da - db;
    });

  const data = ordered.map((s) => {
    const row = dataMap.get(s.id);
    const point = { name: s.period_name || s.name || s.id };
    activeCriteria.forEach((c) => {
      const dbKey = DB_KEY_MAP[c.id];
      const avgRaw = dbKey && row?.[dbKey] != null ? Number(row[dbKey]) : null;
      const max = maxMap[c.id];
      if (avgRaw != null && max > 0) {
        // Attainment rate: % of threshold
        point[c.id] = Math.round((avgRaw / max) * 1000) / 10;
      } else {
        point[c.id] = null;
      }
    });
    return point;
  });

  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
          cursor={{ stroke: "var(--border-strong)", strokeWidth: 1, strokeDasharray: "3 2" }}
          formatter={(v) => (v != null ? `${v}%` : "—")}
        />
        <ReferenceLine
          y={threshold}
          stroke="var(--text-tertiary)"
          strokeDasharray="4 3"
          strokeWidth={1.5}
        />
        {activeCriteria.map((c) => (
          <Line
            key={c.id}
            type="monotone"
            dataKey={c.id}
            name={c.label}
            stroke={c.color}
            strokeWidth={2}
            dot={{ r: 3, fill: c.color }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
        <Legend
          iconType="plainline"
          iconSize={16}
          wrapperStyle={{ fontSize: 10, paddingTop: 8, color: "var(--text-secondary)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

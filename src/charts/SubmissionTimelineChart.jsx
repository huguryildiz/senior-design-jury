// src/charts/SubmissionTimelineChart.jsx
// Overview: Submission activity timeline — juror activity bucketed by hour.
// Recharts AreaChart. Takes allJurors with lastSeenMs timestamps.
// Mirrors prototype "chart-timeline" (Chart.js line chart with cumulative submissions).

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function RotatedTick({ x, y, payload }) {
  const parts = payload.value.split(" ");
  // parts: ["13", "Jun", "2026", "23:00"]
  const dateLine = parts.slice(0, 3).join(" ");
  const timeLine = parts[3] ?? "";
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        textAnchor="end"
        fill="var(--text-tertiary)"
        fontSize={9}
        transform="rotate(-35)"
      >
        <tspan x={0} dy="0">{dateLine}</tspan>
        <tspan x={0} dy="11">{timeLine}</tspan>
      </text>
    </g>
  );
}

/**
 * Build per-hour submission buckets from juror finalSubmittedAt timestamps.
 * Each unique day+hour combination is a separate bucket on the x-axis.
 * Label format: "14 Jun 20:00"
 *
 * @param {object[]} jurors — allJurors array with finalSubmittedAt
 * @returns {Array<{label: string, count: number, cumulative: number}>}
 */
function buildTimelineBuckets(jurors) {
  const submitted = jurors.filter((j) => j.finalSubmittedAt);
  if (!submitted.length) return [];

  // Build a map keyed by sortable "YYYY-MM-DD HH" string
  const buckets = {};
  submitted.forEach((j) => {
    const d = new Date(j.finalSubmittedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}`;
    buckets[key] = (buckets[key] || 0) + 1;
  });

  const sortedKeys = Object.keys(buckets).sort();
  let cumulative = 0;
  return sortedKeys.map((key) => {
    const [datePart, hourPart] = key.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const label = `${day} ${MONTH_ABBR[month - 1]} ${year} ${hourPart}:00`;
    cumulative += buckets[key];
    return { label, count: buckets[key], cumulative };
  });
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
      {payload.map((p) => (
        <div key={p.dataKey}>
          {p.dataKey === "count" ? "Submissions" : "Cumulative"}:{" "}
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/**
 * @param {object} props
 * @param {object[]} props.allJurors — array with lastSeenMs timestamps
 */
export function SubmissionTimelineChart({ allJurors = [] }) {
  const data = useMemo(() => buildTimelineBuckets(allJurors), [allJurors]);

  if (!data.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, color: "var(--text-tertiary)", fontSize: 12 }}>
        No activity data for current period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
        <defs>
          <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--success)" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={<RotatedTick />}
          height={52}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="plainline"
          wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
          formatter={(value) =>
            <span style={{ color: "var(--text-secondary)" }}>{value}</span>
          }
        />
        {/* Cumulative line (secondary) */}
        <Area
          type="monotone"
          dataKey="cumulative"
          name="Cumulative"
          stroke="var(--success)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          fill="url(#cumulativeGradient)"
          dot={false}
        />
        {/* Per-hour activity (primary) */}
        <Area
          type="monotone"
          dataKey="count"
          name="Active jurors"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="url(#timelineGradient)"
          dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// src/charts/OutcomeByGroupChart.jsx
// Grouped bar chart: average score per criterion per project group.
// Uses recharts BarChart.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

const ATTAINMENT_THRESHOLD = 70;

function makeXAxisTick(nameMap) {
  return function CustomXAxisTick({ x, y, payload }) {
    const label = payload.value;
    const fullName = nameMap[label] || label;
    const isCode = /^P\d+$/.test(label);
    // Wrap title into ~14-char chunks for up to 2 lines
    const words = fullName.split(" ");
    const lines = [];
    let current = "";
    for (const w of words) {
      if ((current + " " + w).trim().length > 14 && current) {
        lines.push(current);
        current = w;
      } else {
        current = current ? current + " " + w : w;
      }
    }
    if (current) lines.push(current);
    const displayLines = lines.slice(0, 2);
    if (lines.length > 2) displayLines[1] = displayLines[1] + "…";

    return (
      <g transform={`translate(${x},${y})`}>
        {isCode && (
          <text x={0} y={0} dy={12} textAnchor="middle" fill="var(--accent)" fontSize={10} fontWeight={700}>
            {label}
          </text>
        )}
        {displayLines.map((line, i) => (
          <text
            key={i}
            x={0}
            y={isCode ? 12 : 0}
            dy={(i + 1) * 11}
            textAnchor="middle"
            fill="var(--text-tertiary)"
            fontSize={9}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };
}

/**
 * @param {object} props
 * @param {object[]} props.dashboardStats — array of { id, name, count, avg: { technical, design, delivery, teamwork } }
 */
export function OutcomeByGroupChart({ dashboardStats = [], criteria = [] }) {
  const groups = (dashboardStats || []).filter((s) => s.count > 0);

  const nameMap = {};
  const data = groups.map((g) => {
    const label = g.group_no != null ? `P${g.group_no}` : (g.title || g.id);
    nameMap[label] = g.title || g.name || g.id;
    const row = { name: label };
    (criteria || []).forEach((c) => {
      const raw = Number(g.avg?.[c.id] ?? 0);
      row[c.id] = c.max > 0 ? Math.round((raw / c.max) * 1000) / 10 : 0;
    });
    return row;
  });

  if (!data.length) return null;

  const CustomTick = makeXAxisTick(nameMap);
  // Estimate height needed for tick: code line + up to 2 title lines × 11px + padding
  const tickHeight = 55;
  // Minimum chart width: 100px per group so bars don't crowd on narrow screens
  const minChartWidth = Math.max(data.length * 100, 320);

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
    <div style={{ minWidth: minChartWidth }}>
    <ResponsiveContainer width="100%" height={260 + tickHeight}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: tickHeight }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={<CustomTick />}
          axisLine={false}
          tickLine={false}
          interval={0}
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
          labelFormatter={(label) => nameMap[label] || label}
          formatter={(v, name) => [`${v}%`, name]}
        />
        <ReferenceLine
          y={ATTAINMENT_THRESHOLD}
          stroke="var(--text-tertiary)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        {(criteria || []).map((c) => (
          <Bar key={c.id} dataKey={c.id} name={c.shortLabel} fill={c.color} radius={[2, 2, 0, 0]} maxBarSize={18} />
        ))}
        <Legend
          iconType="square"
          iconSize={7}
          wrapperStyle={{ fontSize: 10, paddingTop: 24, color: "var(--text-secondary)" }}
        />
      </BarChart>
    </ResponsiveContainer>
    </div>
    </div>
  );
}

function bandVar(value, max) {
  if (value == null || max <= 0) return null;
  const pct = (value / max) * 100;
  if (pct >= 90) return "var(--score-excellent-text)";
  if (pct >= 80) return "var(--score-high-text)";
  if (pct >= 75) return "var(--score-good-text)";
  if (pct >= 70) return "var(--score-adequate-text)";
  if (pct >= 60) return "var(--score-low-text)";
  return "var(--score-poor-text)";
}

export default function AvgDonut({ value, max = 100, size = 72, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const hasValue = value != null && max > 0;
  const pct = hasValue ? Math.max(0, Math.min(1, value / max)) : 0;
  const dashOffset = circumference * (1 - pct);
  const color = bandVar(value, max) || "var(--border)";
  const label = hasValue
    ? `Average ${value.toFixed(1)} out of ${max}`
    : "Average not available";

  return (
    <div
      className="avg-donut"
      role="img"
      aria-label={label}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border-subtle, var(--border))"
          strokeWidth={stroke}
        />
        {hasValue && (
          <circle
            data-fill="true"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="avg-donut-center">
        <span className="avg-donut-value">
          {hasValue ? value.toFixed(1) : "\u2014"}
        </span>
        <span className="avg-donut-label">Avg</span>
      </div>
    </div>
  );
}

// src/charts/ThresholdGapChart.jsx
// CSS diverging lollipop chart: gap between criterion attainment rate and 70% threshold.
// Pure HTML/CSS — no canvas library.
// CSS classes match vera.css: .lollipop-stem.positive/.negative, .lollipop-dot.positive/.negative,
// .lollipop-val.positive/.negative (positioned inside .lollipop-track)

import { outcomeValues } from "../shared/stats";

const ATTAINMENT_THRESHOLD = 70;
// Max absolute gap displayed (bars beyond this are clamped)
const MAX_ABS_GAP = 30;

function fmt1(v) {
  return Math.round(v * 10) / 10;
}

// Normalize gap to 0–100 bar position (center = 50% = threshold)
function normalize(gap) {
  const clamped = Math.max(-MAX_ABS_GAP, Math.min(MAX_ABS_GAP, gap));
  return 50 + (clamped / MAX_ABS_GAP) * 50;
}

/**
 * @param {object} props
 * @param {object[]} props.submittedData — score rows
 */
export function ThresholdGapChart({ submittedData = [], criteria = [] }) {
  const rows = submittedData || [];

  // One row per unique outcome code (same approach as attainment cards)
  const outcomeMap = new Map(); // code → { criterionKey, max, color }
  for (const c of criteria || []) {
    for (const code of (c.mudek || [])) {
      if (!outcomeMap.has(code)) {
        outcomeMap.set(code, { criterionKey: c.id, max: c.max, color: c.color });
      }
    }
  }

  const items = [...outcomeMap.entries()].map(([code, { criterionKey, max }]) => {
    const vals = outcomeValues(rows, criterionKey);
    if (!vals.length) return { code, gap: null };
    const aboveThreshold = vals.filter((v) => (v / max) * 100 >= ATTAINMENT_THRESHOLD).length;
    const attRate = fmt1((aboveThreshold / vals.length) * 100);
    const gap = fmt1(attRate - ATTAINMENT_THRESHOLD);
    return { code, gap };
  });

  // Sort: positive gaps first (descending), then negative (descending)
  items.sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity));

  return (
    <div className="lollipop-chart">
      {items.map(({ code, gap }) => {
        const modifier = gap == null ? "" : gap >= 0 ? "positive" : "negative";
        const stemLeft = gap != null ? (gap >= 0 ? "50%" : `${normalize(gap)}%`) : "50%";
        const stemWidth = gap != null ? `${Math.abs(normalize(gap) - 50)}%` : "0%";
        const dotLeft = gap != null ? `${normalize(gap)}%` : "50%";
        // Positive: label anchored to left of dot position, shifted right
        // Negative: label anchored to right edge at dot position, shifted left via transform
        const valStyle = gap == null
          ? { left: "52%", color: "var(--text-tertiary)" }
          : gap >= 0
            ? { left: `calc(${normalize(gap)}% + 14px)` }
            : { left: `calc(${normalize(gap)}% - 14px)`, transform: "translateX(-100%)" };

        return (
          <div key={code} className="lollipop-row">
            <div className="lollipop-label">
              <span style={{ color: "var(--accent)" }}>{code}</span>
            </div>
            <div className="lollipop-track">
              {/* Center threshold line */}
              <div className="lollipop-center" />
              {/* Stem */}
              {gap != null && (
                <div
                  className={`lollipop-stem${modifier ? ` ${modifier}` : ""}`}
                  style={{ left: stemLeft, width: stemWidth }}
                />
              )}
              {/* Dot */}
              {gap != null && (
                <div
                  className={`lollipop-dot${modifier ? ` ${modifier}` : ""}`}
                  style={{ left: dotLeft }}
                />
              )}
              {/* Value label */}
              <div
                className={`lollipop-val${modifier ? ` ${modifier}` : ""}`}
                style={valStyle}
              >
                {gap != null ? `${gap >= 0 ? "+" : ""}${gap}%` : "—"}
              </div>
            </div>
          </div>
        );
      })}
      <div className="lollipop-axis-labels">
        <span>−{MAX_ABS_GAP}</span>
        <span>−{MAX_ABS_GAP / 2}</span>
        <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>70% threshold</span>
        <span>+{MAX_ABS_GAP / 2}</span>
        <span>+{MAX_ABS_GAP}</span>
      </div>
    </div>
  );
}

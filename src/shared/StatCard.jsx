// src/shared/StatCard.jsx

import { useId } from "react";

/**
 * Generic stat card for admin dashboards.
 *
 * @param {string|number} value      - Primary numeric or text value displayed prominently.
 * @param {string}        label      - Short descriptive label below the value.
 * @param {string}        [kicker]   - Small text rendered above the value (e.g. category tag).
 * @param {string}        [sub]      - Secondary line below the label (e.g. "Total assigned").
 * @param {string}        [meta]     - Single meta line shown when metaLines is absent.
 * @param {string[]}      [metaLines]- List of status breakdown lines (takes precedence over meta).
 * @param {{ pct: number, color: string, label?: string }} [ring]
 *   - Progress ring. pct: 0–100. label defaults to "${pct}%"; pass "" to suppress.
 * @param {React.ReactNode} [icon]   - Icon shown in place of the ring when ring is absent.
 */
export default function StatCard({ value, label, kicker, sub, meta, metaLines, ring, icon, tooltip }) {
  const tooltipId = useId();

  const ringLabel = ring
    ? ring.label === undefined
      ? `${ring.pct}%`
      : ring.label
    : null;

  return (
    <div className="stat-card stat-card--minimal">
      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        {kicker && <div className="stat-card-kicker">{kicker}</div>}
        <div className="stat-card-label">
          {label}
          {tooltip && (
            <span className="stat-card-tooltip-wrapper">
              <span
                className="stat-card-tooltip-icon"
                tabIndex={0}
                aria-label="More information"
                aria-describedby={tooltipId}
              >ⓘ</span>
              <span
                id={tooltipId}
                role="tooltip"
                className="stat-card-tooltip-text"
              >
                {tooltip}
              </span>
            </span>
          )}
        </div>
        {sub && <div className="stat-card-sub">{sub}</div>}
        {Array.isArray(metaLines) && metaLines.length > 0 ? (
          <div className="stat-card-meta">
            {metaLines.map((line, i) => (
              <div key={`${i}-${line}`} className="stat-card-meta-line">
                {line}
              </div>
            ))}
          </div>
        ) : (
          meta && <div className="stat-card-meta">{meta}</div>
        )}
      </div>
      {ring ? (
        <div
          className="stat-ring"
          style={{ "--ring-pct": ring.pct, "--ring-color": ring.color }}
        >
          {ringLabel ? <span>{ringLabel}</span> : null}
        </div>
      ) : icon ? (
        <div className="stat-icon-circle">{icon}</div>
      ) : null}
    </div>
  );
}

// src/charts/JurorConsistencyHeatmap.jsx
// HTML table heatmap: Coefficient of Variation (CV = σ/μ × 100) per group × criterion.
// Measures inter-rater agreement; CV >25% = poor agreement.

import { mean, stdDev } from "../shared/stats";

function fmt1(v) {
  return Math.round(v * 10) / 10;
}

function getCvCellClass(cv) {
  if (cv == null) return "";
  if (cv < 10) return "ga-cv-excellent";
  if (cv < 15) return "ga-cv-good";
  if (cv < 25) return "ga-cv-acceptable";
  return "ga-cv-poor";
}

/**
 * @param {object} props
 * @param {object[]} props.dashboardStats — { id, name, count }
 * @param {object[]} props.submittedData  — score rows with projectId
 */
export function JurorConsistencyHeatmap({ dashboardStats = [], submittedData = [], criteria = [] }) {
  const groups = (dashboardStats || []).filter((s) => s.count > 0);
  const rows = submittedData || [];

  if (!groups.length) return null;

  return (
    <div className="ga-heatmap-wrap">
      <table className="ga-heatmap">
        <thead>
          <tr>
            <th>Criterion</th>
            {groups.map((g) => {
              const code = g.group_no != null ? `P${g.group_no}` : null;
              const title = g.title || g.name || "";
              const truncated = title.length > 14 ? title.slice(0, 14) + "…" : title;
              return (
                <th key={g.id} title={title}>
                  {code && <span className="ga-th-code">{code}</span>}
                  <span className="ga-th-name">{truncated}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {(criteria || []).map((c) => (
            <tr key={c.id}>
              <td style={{ fontWeight: 600 }}>
                <span
                  style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: c.color, marginRight: 5, verticalAlign: "middle" }}
                />
                {c.shortLabel}
              </td>
              {groups.map((g) => {
                const vals = rows
                  .filter((r) => r.projectId === g.id)
                  .map((r) => Number(r[c.id]))
                  .filter((v) => Number.isFinite(v));

                let cv = null;
                if (vals.length >= 2) {
                  const m = mean(vals);
                  if (m > 0) {
                    cv = fmt1((stdDev(vals, true) / m) * 100);
                  }
                }

                return (
                  <td key={g.id} className={getCvCellClass(cv)} title={g.title || g.name}>
                    {cv != null ? `${cv}%` : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

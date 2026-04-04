// src/charts/OutcomeAttainmentHeatmap.jsx
// Heatmap: outcomes (rows) × evaluation periods (columns).
// Cell color = attainment rate; secondary label = avg score.

/** Returns a CSS background color for the given attainment rate. */
function attainmentColor(rate) {
  if (rate == null) return "var(--surface-raised)";
  if (rate >= 90) return "rgba(34,197,94,0.30)";
  if (rate >= 80) return "rgba(132,204,22,0.28)";
  if (rate >= 70) return "rgba(234,179,8,0.28)";
  if (rate >= 50) return "rgba(249,115,22,0.28)";
  return "rgba(239,68,68,0.28)";
}

/** Returns a foreground color that stays legible over the cell background. */
function attainmentTextColor(rate) {
  if (rate == null) return "var(--text-muted)";
  if (rate >= 80) return "#86efac";
  if (rate >= 70) return "#fde68a";
  if (rate >= 50) return "#fdba74";
  return "#fca5a5";
}

/**
 * @param {object}   props
 * @param {object[]} props.rows        — from buildOutcomeAttainmentTrendDataset().rows
 * @param {object[]} props.outcomeMeta — from buildOutcomeAttainmentTrendDataset().outcomeMeta
 */
export function OutcomeAttainmentHeatmap({ rows = [], outcomeMeta = [] }) {
  if (!rows.length || !outcomeMeta.length) return null;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{
        width: "100%",
        borderCollapse: "separate",
        borderSpacing: "4px 6px",
        tableLayout: "fixed",
      }}>
        <colgroup>
          <col style={{ width: 220 }} />
        </colgroup>
        <thead>
          <tr>
            {/* Outcome label column header */}
            <th style={{
              textAlign: "left",
              fontSize: 10,
              color: "var(--text-muted)",
              fontWeight: 500,
              paddingBottom: 6,
            }}>
              Outcome
            </th>
            {rows.map((r) => (
              <th key={r.period} style={{
                textAlign: "center",
                fontSize: 10,
                color: "var(--text-muted)",
                fontWeight: 500,
                paddingBottom: 6,
              }}>
                {r.period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {outcomeMeta.map((o) => (
            <tr key={o.code}>
              {/* Outcome label */}
              <td style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                fontWeight: 600,
                paddingRight: 12,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                <span style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: o.color,
                  marginRight: 6,
                  flexShrink: 0,
                }} />
                {o.code}
                {o.label && (
                  <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 5 }}>
                    {o.label.length > 28 ? `${o.label.slice(0, 28)}…` : o.label}
                  </span>
                )}
              </td>
              {rows.map((r) => {
                const att = r[o.attKey];
                const avg = r[o.avgKey];
                return (
                  <td key={r.period} title={att != null ? `Attainment: ${att}%  |  Avg score: ${avg != null ? avg + "%" : "—"}` : "No data"} style={{
                    textAlign: "center",
                    borderRadius: 6,
                    background: attainmentColor(att),
                    padding: "6px 4px",
                    minWidth: 64,
                  }}>
                    {att != null ? (
                      <>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: attainmentTextColor(att),
                          lineHeight: 1.2,
                        }}>
                          {att}%
                        </div>
                        {avg != null && (
                          <div style={{
                            fontSize: 9,
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}>
                            avg {avg}%
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Color scale legend */}
      <div style={{
        display: "flex",
        gap: 12,
        justifyContent: "center",
        marginTop: 14,
        flexWrap: "wrap",
      }}>
        {[
          { label: "≥ 90%", bg: "rgba(34,197,94,0.30)", color: "#86efac" },
          { label: "80–90%", bg: "rgba(132,204,22,0.28)", color: "#bef264" },
          { label: "70–80%", bg: "rgba(234,179,8,0.28)", color: "#fde68a" },
          { label: "50–70%", bg: "rgba(249,115,22,0.28)", color: "#fdba74" },
          { label: "< 50%", bg: "rgba(239,68,68,0.28)", color: "#fca5a5" },
          { label: "No data", bg: "var(--surface-raised)", color: "var(--text-muted)" },
        ].map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{
              display: "inline-block",
              width: 16,
              height: 12,
              borderRadius: 3,
              background: s.bg,
            }} />
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

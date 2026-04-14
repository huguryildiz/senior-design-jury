// src/admin/criteria/CoverageBar.jsx

export default function CoverageBar({ bands, maxScore }) {
  if (!bands || bands.length === 0) return null;

  // Sort bands by min score ascending
  const sorted = [...bands].sort((a, b) => {
    const minA = Number(a.min) || 0;
    const minB = Number(b.min) || 0;
    return minA - minB;
  });

  // Check validity: starts at 0, ends at maxScore, no gaps between bands
  const isValid = (() => {
    if (sorted.length < 1) return false;
    if (Number(sorted[0].min) !== 0) return false;
    if (Number(sorted[sorted.length - 1].max) !== maxScore) return false;
    for (let j = 0; j < sorted.length - 1; j++) {
      if (Number(sorted[j].max) + 1 !== Number(sorted[j + 1].min)) return false;
    }
    return true;
  })();

  const colors = [
    "#22c55e", // green
    "#3b82f6", // blue
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#64748b", // slate
  ];

  // Calculate segment widths as absolute percentages of the track
  const segments = sorted.map((band, idx) => {
    const min = Number(band.min) || 0;
    const max = Number(band.max) || 0;
    const left  = maxScore > 0 ? (min / maxScore) * 100 : 0;
    const width = maxScore > 0 ? ((max - min + 1) / (maxScore + 1)) * 100 : 0;
    return {
      left:  Math.max(left, 0),
      width: Math.max(width, 0),
      color: colors[idx % colors.length],
    };
  });

  const statusText = isValid
    ? `✓ Full coverage (0–${maxScore})`
    : `⚠ Gap detected (expected 0–${maxScore})`;

  // Collect tick values: every band boundary + maxScore
  const ticks = Array.from(
    new Set([
      ...sorted.map((b) => Number(b.min)),
      ...sorted.map((b) => Number(b.max)),
    ])
  ).sort((a, b) => a - b);

  return (
    <div className={`crt-coverage ${isValid ? "valid" : "invalid"}`}>
      <div className="crt-coverage-top">
        <span className="crt-coverage-label">Score Coverage</span>
        <span className="crt-coverage-status">{statusText}</span>
      </div>
      <div className="crt-coverage-track" style={{ position: "relative" }}>
        {segments.map((seg, idx) => (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: `${seg.left}%`,
              width: `${seg.width}%`,
              height: "100%",
              background: seg.color,
            }}
          />
        ))}
      </div>
      <div className="crt-coverage-ticks">
        {ticks.map((val) => {
          const pct = maxScore > 0 ? (val / maxScore) * 100 : 0;
          return (
            <span
              key={val}
              className="crt-coverage-tick"
              style={{ left: `${Math.min(pct, 100)}%` }}
            >
              {val}
            </span>
          );
        })}
      </div>
    </div>
  );
}

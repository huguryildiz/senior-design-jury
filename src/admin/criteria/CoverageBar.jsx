// src/admin/criteria/CoverageBar.jsx

export default function CoverageBar({ bands, maxScore }) {
  if (!bands || bands.length === 0) return null;

  // Sort bands by min score ascending
  const sorted = [...bands].sort((a, b) => {
    const minA = Number(a.min) || 0;
    const minB = Number(b.min) || 0;
    return minA - minB;
  });

  // Check validity: starts at 0, ends at maxScore, at least 2 bands
  const isValid =
    sorted.length >= 2 &&
    (Number(sorted[0].min) || 0) === 0 &&
    (Number(sorted[sorted.length - 1].max) || 0) === maxScore;

  const colors = [
    "#22c55e", // green
    "#3b82f6", // blue
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#64748b", // slate
  ];

  // Calculate segment widths as percentages
  const segments = sorted.map((band, idx) => {
    const min = Number(band.min) || 0;
    const max = Number(band.max) || 0;
    const width = maxScore > 0 ? ((max - min + 1) / (maxScore + 1)) * 100 : 0;
    return {
      width: Math.max(width, 0),
      color: colors[idx % colors.length],
    };
  });

  const statusText = isValid
    ? `✓ Full coverage (0–${maxScore})`
    : `⚠ Gap detected (expected 0–${maxScore})`;

  return (
    <div className={`crt-coverage ${isValid ? "valid" : "invalid"}`}>
      <div className="crt-coverage-top">
        <span className="crt-coverage-label">Score Coverage</span>
        <span className="crt-coverage-status">{statusText}</span>
      </div>
      <div className="crt-coverage-track">
        {segments.map((seg, idx) => (
          <div
            key={idx}
            style={{
              flex: `${seg.width} 0 auto`,
              background: seg.color,
            }}
          />
        ))}
      </div>
    </div>
  );
}

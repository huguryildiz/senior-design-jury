// src/shared/LevelPill.jsx

// ── Gradient palette (module-private) ────────────────────────
// 5 RGB anchor stops spanning low-performance (red) → high-performance (green).
// The t=0.50, t=0.75, and t=1.00 anchors exactly match the existing CSS colors
// for .level-pill--developing, .level-pill--good, and .level-pill--excellent.
const GRADIENT_STOPS = [
  { t: 0.00, bg: [254, 226, 226], text: [220,  38,  38] }, // red
  { t: 0.25, bg: [255, 237, 213], text: [234,  88,  12] }, // orange
  { t: 0.50, bg: [254, 249, 195], text: [202, 138,   4] }, // yellow
  { t: 0.75, bg: [247, 254, 231], text: [101, 163,  13] }, // yellow-green
  { t: 1.00, bg: [220, 252, 231], text: [ 22, 163,  74] }, // green
];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function interpolateGradient(t) {
  const clamped = Math.max(0, Math.min(1, t));
  let lo = GRADIENT_STOPS[0];
  let hi = GRADIENT_STOPS[GRADIENT_STOPS.length - 1];
  for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
    if (clamped >= GRADIENT_STOPS[i].t && clamped <= GRADIENT_STOPS[i + 1].t) {
      lo = GRADIENT_STOPS[i];
      hi = GRADIENT_STOPS[i + 1];
      break;
    }
  }
  const localT = lo.t === hi.t ? 0 : (clamped - lo.t) / (hi.t - lo.t);
  const bg   = lo.bg.map((c, i)   => lerp(c, hi.bg[i],   localT));
  const text = lo.text.map((c, i) => lerp(c, hi.text[i], localT));
  return {
    background: `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`,
    color:      `rgb(${text[0]}, ${text[1]}, ${text[2]})`,
  };
}

// ── Shared helpers ────────────────────────────────────────────

function normalizeVariant(variant) {
  return String(variant || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

const KNOWN_VARIANTS = new Set(["excellent", "good", "developing", "insufficient"]);

/**
 * Returns true if `level` maps to one of the 4 canonical CSS-driven variants.
 * Known variants are handled by CSS class rules and do not need gradient styling.
 */
export function isKnownBandVariant(level) {
  return KNOWN_VARIANTS.has(normalizeVariant(level));
}

/**
 * Returns an inline style object `{ background, color }` for a band at score
 * rank `rank` out of `total` bands (0 = lowest score, total-1 = highest score).
 * Colors are continuously interpolated across the red → green semantic gradient.
 * Works for any band count — not tied to a fixed maximum.
 */
export function getBandPositionStyle(rank, total) {
  const t = total <= 1 ? 1 : rank / (total - 1);
  return interpolateGradient(t);
}

/**
 * Returns the 0-based score rank of `band` within `bands`, sorted ascending by
 * `band.min`. Bands with non-finite min are treated as highest (sorted last).
 *
 * Uses reference equality — `band` must be the same object reference as in the
 * `bands` array (not a spread/cloned copy).
 */
export function getBandScoreRank(bands, band) {
  const sorted = [...bands].sort((a, b) => {
    const minA = Number.isFinite(Number(a.min)) ? Number(a.min) : Infinity;
    const minB = Number.isFinite(Number(b.min)) ? Number(b.min) : Infinity;
    return minA - minB;
  });
  return sorted.indexOf(band);
}

// ── Component ─────────────────────────────────────────────────

export default function LevelPill({ variant, children, className = "", style }) {
  const normalized = normalizeVariant(variant);
  const cls = `level-pill level-pill--${normalized}${className ? " " + className : ""}`;
  return <span className={cls} style={style}>{children}</span>;
}

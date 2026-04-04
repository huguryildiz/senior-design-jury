// src/admin/criteria/criteriaFormHelpers.js
// Pure helper functions for the criteria editor — NO React, NO JSX.

import { RUBRIC_DEFAULT_LEVELS } from "../../shared/constants";
import { normalizeCriterion } from "../../shared/criteria/criteriaHelpers";

// ── Default rubric seed for a new criterion ───────────────────

export function defaultRubricBands(max) {
  const m = Number(max) || 30;
  const [excellent = "Excellent", good = "Good", developing = "Developing", insufficient = "Insufficient"] = RUBRIC_DEFAULT_LEVELS;
  // Excellent: top ~10%, Good: next ~20%, Developing: next ~30%, Insufficient: rest
  const e = Math.round(m * 0.9);
  const g = Math.round(m * 0.7);
  const d = Math.round(m * 0.4);
  return [
    { level: excellent,    min: e,     max: m,     desc: "" },
    { level: good,         min: g,     max: e - 1, desc: "" },
    { level: developing,   min: d,     max: g - 1, desc: "" },
    { level: insufficient, min: 0,     max: d - 1, desc: "" },
  ];
}

export function getConfigRubricSeed(row, criteria = []) {
  const rowKey = String(row?._key ?? "").trim();
  const byKey = rowKey
    ? (criteria || []).find((c) => (c.id ?? c.key) === rowKey)
    : null;
  const rowLabel = String(row?.label ?? "").trim().toLowerCase();
  const byLabel = !byKey && rowLabel
    ? (criteria || []).find((c) => String(c.label ?? "").trim().toLowerCase() === rowLabel)
    : null;
  const matched = byKey || byLabel;
  if (!Array.isArray(matched?.rubric) || matched.rubric.length === 0) return null;
  return matched.rubric.map((band) => ({ ...band }));
}

// ── View-model row shape ──────────────────────────────────────

export function templateToRow(c, idx) {
  const n = normalizeCriterion(c);
  const boundedRubric = clampRubricBandsToCriterionMax(
    n.rubric.length > 0 ? n.rubric : defaultRubricBands(n.max),
    n.max
  );
  return {
    _id:        `row-${idx}-${Date.now()}`,
    _key:       n.key,                          // hidden stable key
    label:      n.label,
    shortLabel: n.shortLabel,
    color:      n.color,
    max:        String(n.max),
    blurb:      n.blurb,
    mudek:      n.mudek,                        // display codes only
    rubric:     boundedRubric,
    _expanded:  false,
    _outcomeOpen: false,
    _rubricOpen: false,
    _rubricTouched: true,
    _fieldTouched: {},
  };
}

export function emptyRow(idx) {
  const id = `row-new-${idx}-${Date.now()}`;
  return {
    _id:        id,
    _key:       "",                             // will be derived on save
    label:      "",
    shortLabel: "",
    color:      "#94A3B8",
    max:        "",
    blurb:      "",
    mudek:      [],
    rubric:     [],
    _expanded:  true,
    _outcomeOpen: false,
    _rubricOpen: false,
    _rubricTouched: false,
    _fieldTouched: {},
  };
}

// ── Band display helpers ──────────────────────────────────────

export function getBandDisplayLabel(bands, bi) {
  const label = bands?.[bi]?.level;
  const trimmed = typeof label === "string" ? label.trim() : "";
  return trimmed || `Band ${bi + 1}`;
}

// ── Clamping helpers ──────────────────────────────────────────

export function clampToCriterionMax(rawValue, criterionMax) {
  if (rawValue === "") return "";
  const n = Number(rawValue);
  if (!Number.isFinite(n)) return rawValue;
  if (n < 0) return "0";
  if (criterionMax === "" || criterionMax === null || criterionMax === undefined) return String(n);
  const max = Number(criterionMax);
  if (!Number.isFinite(max) || max < 0) return String(n);
  if (n > max) return String(max);
  return String(n);
}

export function clampRubricBandsToCriterionMax(rubric, criterionMax) {
  const newMax = Number(criterionMax);
  if (!Number.isFinite(newMax) || newMax < 0) return rubric ?? [];

  const bands = Array.isArray(rubric) ? rubric : [];

  // Simple per-value clamp
  const clamped = bands.map((band) => ({
    ...band,
    min: clampToCriterionMax(band.min, newMax),
    max: clampToCriterionMax(band.max, newMax),
  }));

  if (clamped.length < 2) return clamped;

  // Detect overlaps introduced by clamping
  const sorted = [...clamped]
    .map((b, idx) => ({ ...b, _idx: idx }))
    .sort((a, b) => Number(a.min) - Number(b.min));

  const hasOverlap = sorted.some(
    (b, j) => j < sorted.length - 1 && Number(b.max) >= Number(sorted[j + 1].min)
  );

  if (!hasOverlap) return clamped;

  // Overlaps were introduced by clamping — rebuild ranges proportionally.
  // Pre-existing overlaps in the original rubric are left to the validator.
  const origMax = Math.max(0, ...bands.map((b) => {
    const n = Number(b.max);
    return Number.isFinite(n) ? n : 0;
  }));

  // Only rebuild when we actually reduced the max; skip when origMax <= newMax
  // (overlaps were already there before clamping — not our problem to fix here)
  if (origMax <= 0 || origMax <= newMax) return clamped;

  // Sort by original min to establish band order (lowest range -> highest)
  const sortedByOrigMin = bands
    .map((band, idx) => ({ band, idx }))
    .sort((a, b) => (Number(a.band.min) || 0) - (Number(b.band.min) || 0));

  const n = sortedByOrigMin.length;
  const result = [...clamped];

  // Proportionally scale each band's min/max to [0, newMax]
  sortedByOrigMin.forEach(({ band, idx }, j) => {
    const scaledMin = j === 0 ? 0 : Math.round((Number(band.min) / origMax) * newMax);
    const scaledMax = j === n - 1 ? newMax : Math.round((Number(band.max) / origMax) * newMax);
    result[idx] = {
      ...clamped[idx],
      min: String(Math.max(0, Math.min(scaledMin, newMax))),
      max: String(Math.max(0, Math.min(scaledMax, newMax))),
    };
  });

  // Fix rounding-induced gaps/overlaps between consecutive bands
  const finalSorted = result
    .map((b, idx) => ({ b, idx }))
    .sort((a, b) => Number(a.b.min) - Number(b.b.min));

  for (let j = 0; j < finalSorted.length - 1; j++) {
    const curr = finalSorted[j];
    const next = finalSorted[j + 1];
    if (Number(curr.b.max) !== Number(next.b.min) - 1) {
      const adjusted = { ...result[curr.idx], max: String(Number(next.b.min) - 1) };
      result[curr.idx] = adjusted;
      finalSorted[j].b = adjusted;
    }
  }

  // Guarantee last band ends exactly at newMax
  const lastEntry = finalSorted[finalSorted.length - 1];
  result[lastEntry.idx] = { ...result[lastEntry.idx], max: String(newMax) };

  return result;
}

export function getBandRangeLabel(band) {
  const min = Number(band?.min);
  const max = Number(band?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "";
  return `${min}\u2013${max}`;
}

export function getCriterionTintStyle(color, alpha = "22") {
  const base = String(color || "").trim();
  if (/^#([0-9a-f]{6})$/i.test(base)) {
    return {
      backgroundColor: `${base}${alpha}`,
      borderColor: base,
      color: base,
    };
  }
  return {
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    borderColor: base || "#94A3B8",
    color: base || "#475569",
  };
}

export function getCriterionDisplayName(row, index) {
  return String(row?.label ?? "").trim() || String(row?.shortLabel ?? "").trim() || `Criterion ${index + 1}`;
}

export function getDescPlaceholder(level) {
  const [excellent = "Excellent", good = "Good", developing = "Developing", insufficient = "Insufficient"] = RUBRIC_DEFAULT_LEVELS;
  const norm = String(level).trim().toLowerCase();
  if (norm === excellent.toLowerCase()) return `Describe what ${excellent.toLowerCase()} performance .`;
  if (norm === good.toLowerCase()) return `Describe what ${good.toLowerCase()} performance looks like.`;
  if (norm === developing.toLowerCase()) return `Describe what ${developing.toLowerCase()} performance looks like.`;
  if (norm === insufficient.toLowerCase()) return `Describe what ${insufficient.toLowerCase()} performance looks like.`;
  return "Describe expectations for this band";
}

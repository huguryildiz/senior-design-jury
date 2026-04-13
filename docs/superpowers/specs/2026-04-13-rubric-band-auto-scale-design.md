# Rubric Band Auto-Scale on Weight Change

**Date:** 2026-04-13  
**Status:** Approved

---

## Problem

When a criterion's weight (max score) increases, rubric band ranges are not updated. The
`clampRubricBandsToCriterionMax` function only rescales when clamping introduces overlaps —
which only happens on weight decrease. Weight increases are silently ignored.

Example: weight 10 → 30, bands stay as `[E:9-10, G:7-8, D:4-6, I:0-3]` instead of
becoming `[E:27-30, G:21-26, D:12-20, I:0-11]`.

---

## Goal

Whenever the weight changes, rubric band ranges auto-scale proportionally to the new weight.
Users can still manually edit band ranges after the auto-scale.

---

## Algorithm

**Proportional scaling** based on the current bands' origMax:

1. If `bands` is empty or `newMax` is invalid (≤ 0) → return as-is (no-op)
2. If `origMax === newMax` → return as-is (no change)
3. Sort bands by current `min` (ascending) to establish position order
4. For each band: `scaledMin = round(band.min / origMax * newMax)`, same for `max`
5. Pin first band's min to 0, last band's max to `newMax`
6. Fix rounding gaps: each band's max = next band's min − 1
7. Preserve `level` (name) and `desc` (description) unchanged

This produces the standard percentage thresholds (Excellent 90–100%, Good 70–89%,
Developing 40–69%, Insufficient 0–39%) for default rubrics, and preserves proportional
positions for manually overridden rubrics.

---

## Changes

### 1. `src/admin/criteria/criteriaFormHelpers.js`

Add new exported function `rescaleRubricBandsByWeight(bands, newMax)` implementing the
algorithm above. `clampRubricBandsToCriterionMax` is unchanged — it continues to handle
save-time hard boundary enforcement.

### 2. `src/admin/drawers/EditSingleCriterionDrawer.jsx`

In `setField`, when `field === "max"`:
- Replace `clampRubricBandsToCriterionMax(next.rubric, Number(finalValue))` with
  `rescaleRubricBandsByWeight(next.rubric, Number(finalValue))`
- Only rescale when `next.rubric.length > 0`

### 3. `src/admin/pages/CriteriaPage.jsx`

In `handleWeightChange`:
- Replace `clampRubricBandsToCriterionMax(rubric, newWeight)` with
  `rescaleRubricBandsByWeight(rubric, newWeight)`
- Import `rescaleRubricBandsByWeight` instead of (or alongside) `clampRubricBandsToCriterionMax`

---

## Scope

- 3 files changed
- ~30 lines net
- No DB changes, no API changes, no migration needed
- No new components

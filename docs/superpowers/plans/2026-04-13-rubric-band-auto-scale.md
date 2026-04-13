# Rubric Band Auto-Scale on Weight Change — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-scale rubric band ranges (proportionally) whenever a criterion's weight changes — both upward and downward.

**Architecture:** Add `rescaleRubricBandsByWeight(bands, newMax)` to `criteriaFormHelpers.js`. Call it in the two weight-change paths: `EditSingleCriterionDrawer.setField("max")` and `CriteriaPage.handleWeightChange`. The existing `clampRubricBandsToCriterionMax` is kept unchanged for save-time boundary enforcement.

**Tech Stack:** React, Vitest, pure JS helpers (no DB changes)

---

## File Map

| File | Action |
|---|---|
| `src/admin/criteria/criteriaFormHelpers.js` | Add `rescaleRubricBandsByWeight` |
| `src/test/qa-catalog.json` | Add test IDs for new function |
| `src/admin/__tests__/criteriaFormHelpers.test.js` | Create — unit tests |
| `src/admin/drawers/EditSingleCriterionDrawer.jsx` | Replace `clampRubricBandsToCriterionMax` with `rescaleRubricBandsByWeight` in `setField` |
| `src/admin/pages/CriteriaPage.jsx` | Replace `clampRubricBandsToCriterionMax` with `rescaleRubricBandsByWeight` in `handleWeightChange` |

---

## Task 1: Add test IDs to qa-catalog.json

**Files:**
- Modify: `src/test/qa-catalog.json`

- [ ] **Step 1: Append 5 new entries to qa-catalog.json**

Find the closing `]` of the JSON array and insert before it:

```json
,
{
  "id": "criteria.rescale.01",
  "module": "Criteria",
  "area": "Rubric Band Auto-Scale",
  "story": "rescaleRubricBandsByWeight",
  "scenario": "returns bands unchanged when newMax equals origMax",
  "whyItMatters": "No-op on equal max avoids unnecessary re-renders.",
  "risk": "False rescale would reset user edits without any weight change.",
  "coverageStrength": "Strong",
  "severity": "normal"
},
{
  "id": "criteria.rescale.02",
  "module": "Criteria",
  "area": "Rubric Band Auto-Scale",
  "story": "rescaleRubricBandsByWeight",
  "scenario": "returns bands unchanged when bands array is empty",
  "whyItMatters": "Empty rubric should not be touched — it gets seeded later.",
  "risk": "Mutating an empty array could break the seeding flow.",
  "coverageStrength": "Strong",
  "severity": "normal"
},
{
  "id": "criteria.rescale.03",
  "module": "Criteria",
  "area": "Rubric Band Auto-Scale",
  "story": "rescaleRubricBandsByWeight",
  "scenario": "scales standard 4-band rubric up from weight 10 to 30 producing correct percentage thresholds",
  "whyItMatters": "Core feature — weight increase must produce clean band ranges.",
  "risk": "Bug was bands staying at old values on weight increase.",
  "coverageStrength": "Strong",
  "severity": "critical"
},
{
  "id": "criteria.rescale.04",
  "module": "Criteria",
  "area": "Rubric Band Auto-Scale",
  "story": "rescaleRubricBandsByWeight",
  "scenario": "scales standard 4-band rubric down from weight 30 to 10 producing correct percentage thresholds",
  "whyItMatters": "Weight decrease must also produce clean band ranges.",
  "risk": "Rounding errors could leave gaps or overlaps.",
  "coverageStrength": "Strong",
  "severity": "critical"
},
{
  "id": "criteria.rescale.05",
  "module": "Criteria",
  "area": "Rubric Band Auto-Scale",
  "story": "rescaleRubricBandsByWeight",
  "scenario": "produces contiguous coverage with no gaps or overlaps after scaling",
  "whyItMatters": "validateRubric requires full coverage — any gap would block saving.",
  "risk": "Rounding could leave a gap of 1 between bands.",
  "coverageStrength": "Strong",
  "severity": "critical"
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "require('./src/test/qa-catalog.json'); console.log('OK')"
```

Expected: `OK`

---

## Task 2: Write failing tests for `rescaleRubricBandsByWeight`

**Files:**
- Create: `src/admin/__tests__/criteriaFormHelpers.test.js`

- [ ] **Step 1: Create the test file**

```js
// src/admin/__tests__/criteriaFormHelpers.test.js
import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import { rescaleRubricBandsByWeight } from "../criteria/criteriaFormHelpers.js";

// Standard 4-band rubric at weight=30
const BANDS_30 = [
  { level: "Excellent",    min: "27", max: "30", desc: "" },
  { level: "Good",         min: "21", max: "26", desc: "" },
  { level: "Developing",   min: "12", max: "20", desc: "" },
  { level: "Insufficient", min: "0",  max: "11", desc: "" },
];

// Standard 4-band rubric at weight=10
const BANDS_10 = [
  { level: "Excellent",    min: "9", max: "10", desc: "" },
  { level: "Good",         min: "7", max: "8",  desc: "" },
  { level: "Developing",   min: "4", max: "6",  desc: "" },
  { level: "Insufficient", min: "0", max: "3",  desc: "" },
];

describe("rescaleRubricBandsByWeight", () => {
  qaTest("criteria.rescale.01", "returns bands unchanged when newMax equals origMax", () => {
    const result = rescaleRubricBandsByWeight(BANDS_30, 30);
    expect(result).toEqual(BANDS_30);
  });

  qaTest("criteria.rescale.02", "returns bands unchanged when bands array is empty", () => {
    const result = rescaleRubricBandsByWeight([], 30);
    expect(result).toEqual([]);
  });

  qaTest("criteria.rescale.03", "scales standard 4-band rubric up from weight 10 to 30", () => {
    const result = rescaleRubricBandsByWeight(BANDS_10, 30);
    // Find each band by level name
    const e = result.find((b) => b.level === "Excellent");
    const g = result.find((b) => b.level === "Good");
    const d = result.find((b) => b.level === "Developing");
    const i = result.find((b) => b.level === "Insufficient");
    expect(Number(e.min)).toBe(27);
    expect(Number(e.max)).toBe(30);
    expect(Number(g.min)).toBe(21);
    expect(Number(g.max)).toBe(26);
    expect(Number(d.min)).toBe(12);
    expect(Number(d.max)).toBe(20);
    expect(Number(i.min)).toBe(0);
    expect(Number(i.max)).toBe(11);
  });

  qaTest("criteria.rescale.04", "scales standard 4-band rubric down from weight 30 to 10", () => {
    const result = rescaleRubricBandsByWeight(BANDS_30, 10);
    const e = result.find((b) => b.level === "Excellent");
    const g = result.find((b) => b.level === "Good");
    const d = result.find((b) => b.level === "Developing");
    const i = result.find((b) => b.level === "Insufficient");
    expect(Number(e.min)).toBe(9);
    expect(Number(e.max)).toBe(10);
    expect(Number(g.min)).toBe(7);
    expect(Number(g.max)).toBe(8);
    expect(Number(d.min)).toBe(4);
    expect(Number(d.max)).toBe(6);
    expect(Number(i.min)).toBe(0);
    expect(Number(i.max)).toBe(3);
  });

  qaTest("criteria.rescale.05", "produces contiguous coverage with no gaps or overlaps after scaling", () => {
    const result = rescaleRubricBandsByWeight(BANDS_30, 15);
    const sorted = [...result].sort((a, b) => Number(a.min) - Number(b.min));
    // First band starts at 0
    expect(Number(sorted[0].min)).toBe(0);
    // Last band ends at newMax
    expect(Number(sorted[sorted.length - 1].max)).toBe(15);
    // Each band's max = next band's min - 1 (contiguous, no gaps)
    for (let j = 0; j < sorted.length - 1; j++) {
      expect(Number(sorted[j].max)).toBe(Number(sorted[j + 1].min) - 1);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/admin/__tests__/criteriaFormHelpers.test.js
```

Expected: 5 failures — `rescaleRubricBandsByWeight is not a function` (or similar import error)

---

## Task 3: Implement `rescaleRubricBandsByWeight`

**Files:**
- Modify: `src/admin/criteria/criteriaFormHelpers.js`

- [ ] **Step 1: Add the function after `clampRubricBandsToCriterionMax`**

Open [criteriaFormHelpers.js](src/admin/criteria/criteriaFormHelpers.js) and add after the `clampRubricBandsToCriterionMax` function (around line 200):

```js
/**
 * Rescale rubric band ranges proportionally to a new criterion max.
 * Handles both weight increases and decreases.
 * Preserves band level names and descriptions.
 *
 * @param {Array}  bands   - Array of band objects { level, min, max, desc }
 * @param {number} newMax  - The new criterion max score
 * @returns {Array}        - New array with updated min/max values
 */
export function rescaleRubricBandsByWeight(bands, newMax) {
  const newMaxNum = Number(newMax);
  if (!Array.isArray(bands) || bands.length === 0) return bands ?? [];
  if (!Number.isFinite(newMaxNum) || newMaxNum <= 0) return bands;

  const origMax = Math.max(0, ...bands.map((b) => {
    const n = Number(b.max);
    return Number.isFinite(n) ? n : 0;
  }));

  if (origMax <= 0 || origMax === newMaxNum) return bands;

  // Sort by min to establish positional order (lowest → highest)
  const sorted = [...bands]
    .map((band, idx) => ({ band, idx }))
    .sort((a, b) => (Number(a.band.min) || 0) - (Number(b.band.min) || 0));

  const n = sorted.length;
  const result = bands.map((b) => ({ ...b }));

  // Proportionally scale each band's min/max
  sorted.forEach(({ band, idx }, j) => {
    const scaledMin = j === 0 ? 0 : Math.round((Number(band.min) / origMax) * newMaxNum);
    const scaledMax = j === n - 1 ? newMaxNum : Math.round((Number(band.max) / origMax) * newMaxNum);
    result[idx] = {
      ...result[idx],
      min: String(Math.max(0, Math.min(scaledMin, newMaxNum))),
      max: String(Math.max(0, Math.min(scaledMax, newMaxNum))),
    };
  });

  // Fix rounding-induced gaps between consecutive bands
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

  // Guarantee last band ends at newMax
  const lastEntry = finalSorted[finalSorted.length - 1];
  result[lastEntry.idx] = { ...result[lastEntry.idx], max: String(newMaxNum) };

  return result;
}
```

- [ ] **Step 2: Run tests — all 5 must pass**

```bash
npm test -- --run src/admin/__tests__/criteriaFormHelpers.test.js
```

Expected: 5 passing

- [ ] **Step 3: Commit**

```bash
git add src/admin/criteria/criteriaFormHelpers.js src/admin/__tests__/criteriaFormHelpers.test.js src/test/qa-catalog.json
git commit -m "feat(criteria): add rescaleRubricBandsByWeight helper with tests"
```

---

## Task 4: Wire into EditSingleCriterionDrawer

**Files:**
- Modify: `src/admin/drawers/EditSingleCriterionDrawer.jsx`

- [ ] **Step 1: Add import**

In [EditSingleCriterionDrawer.jsx](src/admin/drawers/EditSingleCriterionDrawer.jsx), find the import from `criteriaFormHelpers` (lines 14–19) and add `rescaleRubricBandsByWeight`:

```js
import {
  templateToRow,
  emptyRow,
  clampRubricBandsToCriterionMax,
  defaultRubricBands,
  getConfigRubricSeed,
  rescaleRubricBandsByWeight,
} from "../criteria/criteriaFormHelpers";
```

- [ ] **Step 2: Replace clamp with rescale in setField**

Find `setField` (around line 110). The current block:

```js
if (field === "max" && finalValue !== "") {
  next.rubric = clampRubricBandsToCriterionMax(next.rubric, Number(finalValue));
}
```

Replace with:

```js
if (field === "max" && finalValue !== "") {
  const newMax = Number(finalValue);
  next.rubric = next.rubric.length > 0
    ? rescaleRubricBandsByWeight(next.rubric, newMax)
    : next.rubric;
}
```

- [ ] **Step 3: Build to verify no errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add src/admin/drawers/EditSingleCriterionDrawer.jsx
git commit -m "feat(criteria): auto-scale rubric bands on weight change in drawer"
```

---

## Task 5: Wire into CriteriaPage inline weight change

**Files:**
- Modify: `src/admin/pages/CriteriaPage.jsx`

- [ ] **Step 1: Update import**

In [CriteriaPage.jsx](src/admin/pages/CriteriaPage.jsx), find the import from `criteriaFormHelpers` (around line 32–35):

```js
import {
  clampRubricBandsToCriterionMax,
  defaultRubricBands,
} from "@/admin/criteria/criteriaFormHelpers";
```

Replace with:

```js
import {
  rescaleRubricBandsByWeight,
  defaultRubricBands,
} from "@/admin/criteria/criteriaFormHelpers";
```

- [ ] **Step 2: Update handleWeightChange**

Find `handleWeightChange` (around line 161). The current inner block:

```js
const scaled = rubric.length > 0
  ? clampRubricBandsToCriterionMax(rubric, newWeight)
  : defaultRubricBands(newWeight);
```

Replace with:

```js
const scaled = rubric.length > 0
  ? rescaleRubricBandsByWeight(rubric, newWeight)
  : defaultRubricBands(newWeight);
```

- [ ] **Step 3: Build to verify no errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/admin/pages/CriteriaPage.jsx
git commit -m "feat(criteria): auto-scale rubric bands on inline weight change"
```

---

## Task 6: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test weight increase in drawer**

1. Admin paneline giriş yap → Criteria sayfasına git
2. Bir criterion'u düzenlemek için drawer'ı aç (Edit)
3. Rubric sekmesine geç — band aralıklarını not al (örn. weight=30: E:27-30)
4. Details sekmesine dön, weight'i 10'a değiştir
5. Rubric sekmesine geç → bandlar E:9-10, G:7-8, D:4-6, I:0-3 olmalı ✓
6. Weight'i tekrar 30'a çevir → E:27-30, G:21-26, D:12-20, I:0-11 olmalı ✓

- [ ] **Step 3: Test inline weight change on CriteriaPage**

1. Criteria sayfasında bir criterion'un weight badge'ine tıkla
2. Değeri değiştir (örn. 30 → 20), Enter'a bas
3. Criterion'u düzenlemek için drawer'ı aç → Rubric sekmesinde bandların ölçeklendiğini doğrula ✓

- [ ] **Step 4: Test manual override still works**

1. Drawer'ı aç → weight değiştir → bandlar auto-scale edilsin
2. Rubric sekmesinde bir bandın range'ini elle değiştir
3. Değişikliğin kalıcı olduğunu doğrula ✓

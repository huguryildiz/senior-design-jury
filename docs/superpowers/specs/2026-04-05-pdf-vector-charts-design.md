# PDF Vector Chart Export

## Problem

Analytics PDF export captures recharts SVG charts via html2canvas at 1.5x scale
with JPEG 85% compression. This rasterizes vector graphics into blurry, pixelated
images that look unprofessional — especially visible on bar labels, axis text, and
threshold reference lines.

## Solution

Replace html2canvas rasterization with svg2pdf.js vector embedding for the 4
recharts (SVG) charts. Upgrade html2canvas settings for the 2 CSS-based charts.
Leave the 3 HTML table charts untouched (already rendered well via jspdf-autotable).

## Chart Categories

| Group | Charts | Strategy |
|-------|--------|----------|
| SVG (recharts) | OutcomeByGroupChart, ProgrammeAveragesChart, RubricAchievementChart | svg2pdf.js vector embed |
| CSS-based | AttainmentRateChart, ThresholdGapChart | html2canvas scale 3 + PNG |
| HTML table | GroupAttainmentHeatmap, JurorConsistencyHeatmap, CoverageMatrix, OutcomeAttainmentHeatmap (trend) | html2canvas scale 3 + PNG |

## Architecture

### New file: `src/admin/analytics/captureSvgForPdf.js`

Single exported function:

```text
captureSvgForPdf(elementId, doc, x, y, width, height) → Promise<boolean>
```

Steps:

1. Find chart container by `elementId`
2. Query the `<svg>` element inside it
3. Deep-clone the SVG (preserve original DOM)
4. Walk all elements in the clone, apply computed styles as inline attributes:
   - Properties: fill, stroke, font-family, font-size, font-weight, opacity,
     stroke-width, stroke-dasharray, stroke-dashoffset
   - Skip elements with `display: none`
   - Force font-family to "Inter" on text elements (matches PDF embedded font)
   - Resolve CSS variables via `getComputedStyle()` on the original elements
5. Preserve viewBox and width/height attributes for correct aspect ratio
6. Lazy-import svg2pdf.js, call `svg2pdf(clonedSvg, doc, { x, y, width, height })`
7. Return `true` on success

### Modified: `src/admin/analytics/captureChartImage.js`

Two changes to the existing `captureChartImage` function:

- `scale: 1.5` changes to `scale: 3`
- `canvas.toDataURL("image/jpeg", 0.85)` changes to `canvas.toDataURL("image/png")`

### Modified: `src/admin/analytics/analyticsExport.js`

Each section gets a `captureMethod` property:

```text
"svg"    → call captureSvgForPdf()
"raster" → call captureChartImage() (improved)
"none"   → skip chart image, table only
```

Section assignments:

| Section | captureMethod |
|---------|--------------|
| Outcome Attainment Rate | raster |
| Threshold Gap Analysis | raster |
| Outcome Achievement by Group | svg |
| Programme-Level Averages | svg |
| Group Attainment Heatmap | raster |
| Inter-Rater Consistency Heatmap | raster |
| Rubric Achievement Distribution | svg |
| Coverage Matrix | raster |
| Attainment Trend | raster |

The section loop branches on `captureMethod`:

- `"svg"`: Calculate target dimensions in mm (imgW for width, aspect-ratio-derived
  height capped at 65% page height). Call `captureSvgForPdf()`. On failure, fall
  back to `captureChartImage()` (raster).
- `"raster"`: Call `captureChartImage()`, embed as PNG via `doc.addImage()`.
- `"none"`: Skip chart image, proceed directly to data table.

The `doc.addImage()` format parameter changes from `"JPEG"` to `"PNG"` for raster
captures.

### Modified: `package.json`

Add `svg2pdf.js` as a production dependency.

## pdf-capture-mode Class

The `pdf-capture-mode` CSS class is only needed for raster captures (html2canvas)
to force light backgrounds. SVG captures do not need it — computed styles are read
from the current DOM state and written inline. If the app is in dark mode, the
`pdf-capture-mode` class should be temporarily added to the chart container before
reading computed styles so that light-theme colors are resolved, then removed
after cloning.

## CSS Variable Resolution

svg2pdf.js cannot read CSS variables or stylesheet rules. The inline style
application in step 4 resolves this:

- For each element in the cloned SVG, `getComputedStyle()` is called on the
  corresponding original element
- Computed values (already resolved from CSS variables) are written as inline
  attributes on the clone
- This happens once per export, on a throwaway clone — no DOM mutation on the
  visible chart

## ResponsiveContainer Handling

Recharts ResponsiveContainer sets SVG dimensions based on parent container size.
The cloned SVG retains whatever dimensions the chart had at capture time. The
svg2pdf.js call receives explicit target dimensions (x, y, width, height in mm)
and scales the SVG to fit, preserving aspect ratio.

## Fallback Strategy

If svg2pdf.js throws on any SVG (unexpected gradients, filters, etc.):

1. Catch the error, log it
2. Fall back to `captureChartImage()` for that specific chart
3. Continue PDF generation — user never sees a missing chart

## File Changes Summary

| File | Change |
|------|--------|
| `package.json` | Add svg2pdf.js dependency |
| `src/admin/analytics/captureSvgForPdf.js` | New file — SVG clone, inline styles, svg2pdf embed |
| `src/admin/analytics/captureChartImage.js` | scale 1.5 to 3, JPEG to PNG |
| `src/admin/analytics/analyticsExport.js` | captureMethod flag, SVG/raster branching, PNG format |

## Out of Scope

- Converting CSS-based charts (AttainmentRate, ThresholdGap) to recharts/SVG
- Changing chart visual design or colors
- Modifying jspdf-autotable table rendering
- Server-side PDF generation

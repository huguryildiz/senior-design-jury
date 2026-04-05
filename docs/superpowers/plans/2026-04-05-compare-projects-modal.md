# Compare Projects Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Compare Projects" modal to the Rankings page — two project selectors, recharts RadarChart, per-criterion stats grid — matching `docs/concepts/vera-premium-prototype.html` 1:1.

**Architecture:** Self-contained `CompareProjectsModal` in `src/admin/modals/`. RankingsPage adds a "Compare" button (shown only when ≥ 2 projects) + mounts the modal passing down `summaryData`, `criteriaConfig`, and `rawScores`. Sigma computed inline in the modal. CSS extends `src/styles/modals.css`.

**Tech Stack:** React, recharts 3.8 (`RadarChart`, `Radar`, `PolarAngleAxis`, `PolarGrid`, `PolarRadiusAxis`, `ResponsiveContainer`, `Tooltip`), `src/shared/ui/Modal`, lucide-react (`X`, `GitCompare`).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/styles/modals.css` | `.fs-modal.compare` size + all `.compare-*` styles |
| Create | `src/admin/modals/CompareProjectsModal.jsx` | Full modal: selectors, legend, radar, stats |
| Modify | `src/admin/pages/RankingsPage.jsx` | Add Compare button, `compareOpen` state, modal mount |
| Modify | `src/test/qa-catalog.json` | Add `compare.01` and `compare.02` entries |
| Modify | `src/admin/__tests__/RankingsTab.test.jsx` | Add `compare.01` and `compare.02` tests |

---

### Task 1: QA catalog entries

**Files:**
- Modify: `src/test/qa-catalog.json`

- [ ] **Step 1: Add two entries to the end of the array in `src/test/qa-catalog.json`**

Append these two objects before the closing `]`. Match the existing entry shape exactly (look at any existing entry for reference).

```json
,
  {
    "id": "compare.01",
    "module": "Scores / Rankings",
    "area": "Compare Projects",
    "story": "Open Compare modal",
    "scenario": "compare button opens modal when ≥ 2 projects exist",
    "whyItMatters": "Admin must be able to compare projects side-by-side from the Rankings page.",
    "risk": "Low modal does not open or crashes on open.",
    "coverageStrength": "Medium"
  },
  {
    "id": "compare.02",
    "module": "Scores / Rankings",
    "area": "Compare Projects",
    "story": "Compare button hidden",
    "scenario": "compare button is absent when fewer than 2 projects exist",
    "whyItMatters": "Modal requires two distinct projects; showing the button with <2 projects would let the user open a broken state.",
    "risk": "Low — button visibility guard.",
    "coverageStrength": "Low"
  }
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('src/test/qa-catalog.json','utf8')); console.log('OK')"
```

Expected output: `OK`

---

### Task 2: CSS — compare modal styles

**Files:**
- Modify: `src/styles/modals.css`

- [ ] **Step 1: Append compare styles to the end of `src/styles/modals.css`**

```css

/* ═══════════════════════════════════════════════════
   COMPARE PROJECTS MODAL
   Prototype reference: docs/concepts/vera-premium-prototype.html
   ═══════════════════════════════════════════════════ */

/* Modal size override */
.fs-modal.compare { max-width: 720px; }

/* Project selectors row */
.compare-selectors {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.compare-select {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 28px 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition: border-color .15s;
}

.compare-select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft, rgba(59,130,246,0.15));
}

.compare-vs {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* Legend */
.compare-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 16px;
}

.compare-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.compare-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

.compare-legend-a { background: rgba(59,130,246,0.7); }
.compare-legend-b { background: rgba(139,92,246,0.7); }

/* Two-column layout: chart left, stats right */
.compare-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 20px;
  align-items: start;
}

/* Stats grid */
.compare-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.compare-stat {
  background: var(--bg-card);
  padding: 12px 14px;
  text-align: center;
}

.compare-stat-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary);
  margin-bottom: 5px;
}

.compare-stat-values {
  display: flex;
  justify-content: center;
  gap: 14px;
}

.compare-stat-val {
  font-family: var(--mono);
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
}

.compare-val-a { color: var(--accent); }
.compare-val-b { color: #8b5cf6; }

/* Dark mode: glass card */
.dark-mode .compare-stat {
  background: rgba(10,15,28,0.50);
}

.dark-mode .compare-val-b { color: #c4b5fd; }

/* Mobile: stack vertically */
@media (max-width: 640px) {
  .compare-grid {
    grid-template-columns: 1fr;
  }
  .compare-selectors {
    flex-direction: column;
    align-items: stretch;
  }
  .compare-vs {
    text-align: center;
  }
}
```

---

### Task 3: CompareProjectsModal component

**Files:**
- Create: `src/admin/modals/CompareProjectsModal.jsx`
- Modify: `src/test/qa-catalog.json` (already done in Task 1)
- Test: `src/admin/__tests__/RankingsTab.test.jsx`

#### Step 3a: Write the failing tests first

- [ ] **Step 1: Add tests to `src/admin/__tests__/RankingsTab.test.jsx`**

Add these imports and mocks at the **top of the file**, right after the existing `vi.mock("@/auth", ...)` block:

```js
vi.mock("recharts", () => ({
  RadarChart: ({ children }) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => null,
  PolarAngleAxis: () => null,
  PolarGrid: () => null,
  PolarRadiusAxis: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Tooltip: () => null,
}));
```

Then append two new `qaTest` calls at the **end of the `describe("RankingsPage", ...)` block** (before its closing `}`):

```js
  qaTest("compare.01", () => {
    const summaryData = [
      { id: "p1", title: "Alpha", members: "", totalAvg: 88, avg: { technical: 26 } },
      { id: "p2", title: "Beta",  members: "", totalAvg: 77, avg: { technical: 22 } },
    ];
    render(
      <RankingsPage
        summaryData={summaryData}
        criteriaConfig={[{ id: "technical", label: "Technical", shortLabel: "Tech", max: 30, color: "#3b82f6" }]}
        periodName="Spring 2026"
      />
    );
    const compareBtn = screen.getByRole("button", { name: /compare/i });
    expect(compareBtn).toBeTruthy();
    fireEvent.click(compareBtn);
    expect(screen.getByText("Compare Projects")).toBeTruthy();
  });

  qaTest("compare.02", () => {
    const summaryData = [
      { id: "p1", title: "Only Project", members: "", totalAvg: 88, avg: {} },
    ];
    render(
      <RankingsPage
        summaryData={summaryData}
        criteriaConfig={[]}
        periodName="Spring 2026"
      />
    );
    expect(screen.queryByRole("button", { name: /compare/i })).toBeNull();
  });
```

- [ ] **Step 2: Run tests — expect both to fail (component does not exist yet)**

```bash
npm test -- --run src/admin/__tests__/RankingsTab.test.jsx
```

Expected: `compare.01` and `compare.02` fail (RankingsPage does not have a Compare button yet).

#### Step 3b: Implement the component

- [ ] **Step 3: Create `src/admin/modals/CompareProjectsModal.jsx`**

```jsx
// src/admin/modals/CompareProjectsModal.jsx
// Compare Projects modal — two-project radar chart + stats side-by-side.
// Prototype reference: docs/concepts/vera-premium-prototype.html
//
// Props:
//   open          — boolean
//   onClose       — () => void
//   projects      — summaryData[] — must have { id, title, avg, totalAvg }
//   criteriaConfig — Criterion[] — { id, label, shortLabel, max }
//   rawScores     — raw juror score rows for sigma computation

import { useMemo, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { X } from "lucide-react";
import Modal from "@/shared/ui/Modal";

// Compute σ of per-juror total scores for one project.
// Returns a formatted string like "2.67", or null if < 2 jurors.
function computeSigma(projectId, rawScores, criteriaConfig) {
  const projScores = rawScores.filter(
    (s) => (s.projectId ?? s.project_id) === projectId
  );
  const byJuror = {};
  for (const s of projScores) {
    const jid = s.jurorId ?? s.juror_id;
    if (!byJuror[jid]) byJuror[jid] = 0;
    for (const c of criteriaConfig) {
      const v = s[c.id];
      if (typeof v === "number") byJuror[jid] += v;
    }
  }
  const totals = Object.values(byJuror);
  if (totals.length < 2) return null;
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  const variance =
    totals.reduce((s, v) => s + (v - mean) ** 2, 0) / totals.length;
  return Math.sqrt(variance).toFixed(2);
}

function CompareTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        borderRadius: 6,
        padding: "8px 12px",
        border: "1px solid var(--border)",
        fontSize: 12,
        lineHeight: 1.6,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          color: "var(--text-tertiary)",
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.stroke }}>
          {p.name}: {Number(p.value).toFixed(0)}%
        </div>
      ))}
    </div>
  );
}

export default function CompareProjectsModal({
  open,
  onClose,
  projects = [],
  criteriaConfig = [],
  rawScores = [],
}) {
  const [aId, setAId] = useState(() => projects[0]?.id ?? "");
  const [bId, setBId] = useState(() => projects[1]?.id ?? "");

  const projectA = useMemo(
    () => projects.find((p) => p.id === aId) ?? projects[0],
    [projects, aId]
  );
  const projectB = useMemo(
    () => projects.find((p) => p.id === bId) ?? projects[1],
    [projects, bId]
  );

  const sigmaA = useMemo(
    () => (projectA ? computeSigma(projectA.id, rawScores, criteriaConfig) : null),
    [projectA, rawScores, criteriaConfig]
  );
  const sigmaB = useMemo(
    () => (projectB ? computeSigma(projectB.id, rawScores, criteriaConfig) : null),
    [projectB, rawScores, criteriaConfig]
  );

  // Radar data: one entry per criterion, values normalized 0–100
  const radarData = useMemo(() => {
    if (!projectA || !projectB || !criteriaConfig.length) return [];
    return criteriaConfig.map((c) => ({
      axis: c.shortLabel || c.label,
      a:
        projectA.avg?.[c.id] != null
          ? (projectA.avg[c.id] / c.max) * 100
          : 0,
      b:
        projectB.avg?.[c.id] != null
          ? (projectB.avg[c.id] / c.max) * 100
          : 0,
    }));
  }, [projectA, projectB, criteriaConfig]);

  if (!projectA || !projectB) return null;

  const nameA = projectA.title || projectA.name || "Project A";
  const nameB = projectB.title || projectB.name || "Project B";

  return (
    <Modal open={open} onClose={onClose} size="compare">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="fs-modal-header">
        <div className="fs-modal-header-row">
          <div className="fs-title-group">
            <div className="fs-title">Compare Projects</div>
          </div>
          <button
            className="fs-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="fs-modal-body">
        {/* Project selectors */}
        <div className="compare-selectors">
          <select
            className="compare-select"
            value={aId}
            onChange={(e) => setAId(e.target.value)}
            aria-label="Project A"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || p.name}
              </option>
            ))}
          </select>
          <span className="compare-vs">vs</span>
          <select
            className="compare-select"
            value={bId}
            onChange={(e) => setBId(e.target.value)}
            aria-label="Project B"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="compare-legend">
          <div className="compare-legend-item">
            <div className="compare-legend-dot compare-legend-a" />
            <span>{nameA}</span>
          </div>
          <div className="compare-legend-item">
            <div className="compare-legend-dot compare-legend-b" />
            <span>{nameB}</span>
          </div>
        </div>

        {/* Chart + Stats */}
        <div className="compare-grid">
          {/* Radar chart */}
          <div>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid
                  gridType="polygon"
                  stroke="rgba(0,0,0,0.06)"
                />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{
                    fontSize: 12,
                    fontWeight: 600,
                    fill: "var(--text-secondary, #475569)",
                  }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name={nameA}
                  dataKey="a"
                  stroke="rgba(59,130,246,0.7)"
                  fill="rgba(59,130,246,0.12)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Radar
                  name={nameB}
                  dataKey="b"
                  stroke="rgba(139,92,246,0.7)"
                  fill="rgba(139,92,246,0.10)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Tooltip content={<CompareTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats grid */}
          <div className="compare-stats">
            {criteriaConfig.map((c) => (
              <div key={c.id} className="compare-stat">
                <div className="compare-stat-label">
                  {(c.shortLabel || c.label).toUpperCase()} /{c.max}
                </div>
                <div className="compare-stat-values">
                  <span className="compare-stat-val compare-val-a">
                    {projectA.avg?.[c.id] != null
                      ? projectA.avg[c.id].toFixed(1)
                      : "—"}
                  </span>
                  <span className="compare-stat-val compare-val-b">
                    {projectB.avg?.[c.id] != null
                      ? projectB.avg[c.id].toFixed(1)
                      : "—"}
                  </span>
                </div>
              </div>
            ))}

            {/* Average row */}
            <div className="compare-stat">
              <div className="compare-stat-label">AVERAGE</div>
              <div className="compare-stat-values">
                <span className="compare-stat-val compare-val-a">
                  {projectA.totalAvg != null
                    ? projectA.totalAvg.toFixed(1)
                    : "—"}
                </span>
                <span className="compare-stat-val compare-val-b">
                  {projectB.totalAvg != null
                    ? projectB.totalAvg.toFixed(1)
                    : "—"}
                </span>
              </div>
            </div>

            {/* Consensus row */}
            <div className="compare-stat">
              <div className="compare-stat-label">CONSENSUS</div>
              <div className="compare-stat-values">
                <span className="compare-stat-val compare-val-a">
                  {sigmaA != null ? `σ${sigmaA}` : "—"}
                </span>
                <span className="compare-stat-val compare-val-b">
                  {sigmaB != null ? `σ${sigmaB}` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Run tests — expect compare.01 and compare.02 still to fail (RankingsPage not wired yet)**

```bash
npm test -- --run src/admin/__tests__/RankingsTab.test.jsx
```

Expected: `compare.01` FAIL ("Compare" button not found), `compare.02` PASS (button absent → correct).

---

### Task 4: Wire CompareProjectsModal into RankingsPage

**Files:**
- Modify: `src/admin/pages/RankingsPage.jsx`

- [ ] **Step 1: Add imports at the top of `src/admin/pages/RankingsPage.jsx`**

After the existing import block (around line 10, after `import SendReportModal`), add:

```js
import { GitCompare } from "lucide-react";
import CompareProjectsModal from "@/admin/modals/CompareProjectsModal";
```

- [ ] **Step 2: Add `compareOpen` state**

Inside `RankingsPage`, after the existing `useState` declarations (around line 244, after `consensusPopoverRef`), add:

```js
const [compareOpen, setCompareOpen] = useState(false);
```

- [ ] **Step 3: Add Compare button to the header actions**

Find this block in the `return` (around line 471–485):

```jsx
        <div className="scores-header-actions">
          <button
            className={`btn btn-outline btn-sm${filterPanelOpen ? " active" : ""}`}
            onClick={() => setFilterPanelOpen((o) => !o)}
          >
            <FilterIcon /> Filter
          </button>
          <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
          <button
            className={`btn btn-outline btn-sm${exportPanelOpen ? " active" : ""}`}
            onClick={() => setExportPanelOpen((o) => !o)}
          >
            <DownloadIcon style={{ verticalAlign: "-1px" }} /> Export
          </button>
        </div>
```

Replace it with:

```jsx
        <div className="scores-header-actions">
          <button
            className={`btn btn-outline btn-sm${filterPanelOpen ? " active" : ""}`}
            onClick={() => setFilterPanelOpen((o) => !o)}
          >
            <FilterIcon /> Filter
          </button>
          <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
          <button
            className={`btn btn-outline btn-sm${exportPanelOpen ? " active" : ""}`}
            onClick={() => setExportPanelOpen((o) => !o)}
          >
            <DownloadIcon style={{ verticalAlign: "-1px" }} /> Export
          </button>
          {summaryData.length >= 2 && (
            <>
              <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setCompareOpen(true)}
              >
                <GitCompare size={14} style={{ verticalAlign: "-1px" }} /> Compare
              </button>
            </>
          )}
        </div>
```

- [ ] **Step 4: Mount the modal at the end of the JSX**

Find the closing `</>` of the outer fragment (the very end of the `return` statement, after `</div>` and the `<SendReportModal ... />`). Add `CompareProjectsModal` right before the final `</>`:

```jsx
      <CompareProjectsModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        projects={summaryData}
        criteriaConfig={criteriaConfig}
        rawScores={rawScores}
      />
```

- [ ] **Step 5: Run all tests — all should pass**

```bash
npm test -- --run src/admin/__tests__/RankingsTab.test.jsx
```

Expected: all tests PASS including `compare.01` and `compare.02`.

- [ ] **Step 6: Run full test suite**

```bash
npm test -- --run
```

Expected: no regressions.

---

### Task 5: Build check + commit

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: no errors or warnings related to the new files.

- [ ] **Step 2: Commit**

```bash
git add src/admin/modals/CompareProjectsModal.jsx \
        src/admin/pages/RankingsPage.jsx \
        src/styles/modals.css \
        src/test/qa-catalog.json \
        src/admin/__tests__/RankingsTab.test.jsx
git commit -m "feat(rankings): add Compare Projects modal with recharts radar chart"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task covering it |
|---|---|
| Two project selectors (A vs B) | Task 3 — `compare-selectors` + `<select>` elements |
| Radar chart, recharts, normalized 0–100 | Task 3 — `RadarChart` + `radarData` computation |
| Blue A / purple B color scheme | Task 2 CSS + Task 3 `Radar` props |
| Stats grid: per-criterion + Average + Consensus | Task 3 — stats section |
| Sigma computation from rawScores | Task 3 — `computeSigma` fn |
| Compare button in RankingsPage header | Task 4 Step 3 |
| Button hidden when < 2 projects | Task 4 Step 3 — `summaryData.length >= 2` guard |
| Dark mode glass on stat cards | Task 2 CSS — `.dark-mode .compare-stat` |
| Mobile stacking | Task 2 CSS — `@media (max-width: 640px)` |
| Escape / backdrop close | Inherited from `Modal` + `useFocusTrap` |
| Prototype 1:1 match | Tasks 2+3 — colors, layout, stat labels match prototype exactly |

**Placeholder scan:** None found.

**Type consistency:** `computeSigma` called in Task 3 with `(projectA.id, rawScores, criteriaConfig)` — matches the function signature defined in the same task. `radarData` uses `c.id`, `c.max`, `c.shortLabel`, `c.label` — all present on `Criterion` objects from `criteriaConfig`.

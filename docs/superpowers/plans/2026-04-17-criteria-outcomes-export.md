# Criteria & Outcomes Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-tab XLSX export (+ CSV/PDF) to CriteriaPage and OutcomesPage following the established hook-based export pattern.

**Architecture:** Two new hooks (`useCriteriaExport`, `useOutcomesExport`) own export logic. Two new XLSX builder functions (`exportCriteriaXLSX`, `exportOutcomesXLSX`) added to `exportXLSX.js`. Each page adds an Export button + `ExportPanel` in its actions area.

**Tech Stack:** React hooks, xlsx-js-style (dynamic import, already used by `exportGridXLSX`), `downloadTable` / `generateTableBlob` for CSV/PDF, `logExportInitiated` for audit.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/admin/utils/exportXLSX.js` | Add `exportCriteriaXLSX` and `exportOutcomesXLSX` |
| Create | `src/admin/hooks/useCriteriaExport.js` | Criteria export workflow (audit + download) |
| Create | `src/admin/hooks/useOutcomesExport.js` | Outcomes export workflow (audit + download) |
| Modify | `src/admin/pages/CriteriaPage.jsx` | State, import, export button, ExportPanel |
| Modify | `src/admin/pages/OutcomesPage.jsx` | State, import, export button, ExportPanel |

---

## Task 1: Add `exportCriteriaXLSX` to exportXLSX.js

**Files:**
- Modify: `src/admin/utils/exportXLSX.js`

The existing `buildExportFilename` is already exported from this file. Add the new function at the bottom, after `exportRankingsXLSX`.

- [ ] **Step 1: Add `exportCriteriaXLSX` to the file**

Open `src/admin/utils/exportXLSX.js`. Append this function after the last `export async function`:

```javascript
export async function exportCriteriaXLSX(criteria, { periodName = "", tenantCode = "" } = {}) {
  const XLSX = await import("xlsx-js-style");

  function makeWs(headers, rows, widths) {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = widths.map((w) => ({ wch: w }));
    return ws;
  }

  // Tab 1 — Criteria
  const criteriaRows = (criteria || []).map((c, i) => [
    i + 1,
    c.label || "",
    c.shortLabel || "",
    c.max ?? "",
    c.blurb || "",
    c.color || "",
  ]);

  // Tab 2 — Rubric (one row per criterion × band, bands high-to-low)
  const rubricRows = [];
  (criteria || []).forEach((c) => {
    const bands = [...(c.rubric || [])].sort((a, b) => (b.min ?? 0) - (a.min ?? 0));
    bands.forEach((band) => {
      rubricRows.push([c.label || "", band.label || band.level || "", band.min ?? "", band.max ?? ""]);
    });
  });

  // Tab 3 — Mappings (one row per criterion × outcome code)
  const mappingRows = [];
  (criteria || []).forEach((c) => {
    (c.outcomes || []).forEach((code) => {
      const type = c.outcomeTypes?.[code] || "direct";
      mappingRows.push([c.label || "", code, type === "direct" ? "Direct" : "Indirect"]);
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeWs(["#", "Ad", "Kısa Ad", "Ağırlık", "Açıklama", "Renk"], criteriaRows, [6, 28, 18, 10, 36, 14]), "Criteria");
  XLSX.utils.book_append_sheet(wb, makeWs(["Kriter", "Bant", "Min", "Max"], rubricRows, [28, 18, 8, 8]), "Rubric");
  XLSX.utils.book_append_sheet(wb, makeWs(["Kriter", "Çıktı Kodu", "Tür"], mappingRows, [28, 14, 12]), "Mappings");
  XLSX.writeFile(wb, buildExportFilename("Criteria", periodName, "xlsx", tenantCode));
}
```

- [ ] **Step 2: Add `exportOutcomesXLSX` immediately after**

```javascript
export async function exportOutcomesXLSX(outcomes, criteria, mappings, { periodName = "", tenantCode = "" } = {}) {
  const XLSX = await import("xlsx-js-style");

  function makeWs(headers, rows, widths) {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = widths.map((w) => ({ wch: w }));
    return ws;
  }

  // Tab 1 — Outcomes summary
  const outcomesRows = (outcomes || []).map((o) => {
    const outcomeMappings = (mappings || []).filter((m) => m.period_outcome_id === o.id);
    const directCount = outcomeMappings.filter((m) => m.coverage_type === "direct").length;
    const indirectCount = outcomeMappings.filter((m) => m.coverage_type === "indirect").length;
    const kapsam = directCount > 0 ? "Direct" : indirectCount > 0 ? "Indirect" : "Unmapped";
    return [o.code || "", o.label || "", o.description || "", kapsam, directCount, indirectCount];
  });

  // Tab 2 — Full mapping table (one row per mapping)
  const mappingRows = (mappings || [])
    .map((m) => {
      const outcome = (outcomes || []).find((o) => o.id === m.period_outcome_id);
      const criterion = (criteria || []).find((c) => c.id === m.period_criterion_id);
      if (!outcome || !criterion) return null;
      return [
        outcome.code || "",
        outcome.label || "",
        criterion.label || "",
        m.coverage_type === "direct" ? "Direct" : "Indirect",
      ];
    })
    .filter(Boolean);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeWs(["Kod", "Ad", "Açıklama", "Kapsam", "Direct", "Indirect"], outcomesRows, [10, 30, 40, 12, 10, 10]), "Outcomes");
  XLSX.utils.book_append_sheet(wb, makeWs(["Çıktı", "Çıktı Adı", "Kriter", "Tür"], mappingRows, [10, 30, 28, 12]), "Mappings");
  XLSX.writeFile(wb, buildExportFilename("Outcomes", periodName, "xlsx", tenantCode));
}
```

- [ ] **Step 3: Verify the file builds without errors**

```bash
cd /Users/huguryildiz/Documents/GitHub/VERA && npm run build 2>&1 | tail -20
```

Expected: Build succeeds, no TypeScript/lint errors related to exportXLSX.js.

- [ ] **Step 4: Commit**

```bash
git add src/admin/utils/exportXLSX.js
git commit -m "feat(export): add exportCriteriaXLSX and exportOutcomesXLSX multi-tab builders"
```

---

## Task 2: Create `useCriteriaExport.js` hook

**Files:**
- Create: `src/admin/hooks/useCriteriaExport.js`

Pattern mirrors `useGridExport.js`. Hook returns `{ generateFile, handleExport }`.
`generateFile(fmt)` → returns a blob for ExportPanel preview.  
`handleExport(fmt)` → blocking audit log, then download.

- [ ] **Step 1: Create the hook file**

```javascript
// src/admin/hooks/useCriteriaExport.js
import { useCallback } from "react";
import { exportCriteriaXLSX } from "../utils/exportXLSX";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import { logExportInitiated } from "@/shared/api";
import { useAuth } from "@/auth";

const COLUMNS = [
  { label: "#",        width: 6  },
  { label: "Ad",       width: 28 },
  { label: "Kısa Ad",  width: 18 },
  { label: "Ağırlık",  width: 10 },
  { label: "Açıklama", width: 36 },
  { label: "Renk",     width: 14 },
];

function getCriteriaTab1Rows(criteria) {
  return (criteria || []).map((c, i) => [
    i + 1,
    c.label || "",
    c.shortLabel || "",
    c.max ?? "",
    c.blurb || "",
    c.color || "",
  ]);
}

export function useCriteriaExport({ criteria, periodName }) {
  const { activeOrganization } = useAuth();
  const tenantCode = activeOrganization?.code || "";
  const orgName = activeOrganization?.name || "";
  const deptName = activeOrganization?.institution || "";
  const organizationId = activeOrganization?.id || null;

  const generateFile = useCallback(
    async (fmt) => {
      const header = COLUMNS.map((c) => c.label);
      const rows = getCriteriaTab1Rows(criteria);
      return generateTableBlob(fmt, {
        filenameType: "Criteria",
        sheetName: "Criteria",
        periodName,
        tenantCode,
        organization: orgName,
        department: deptName,
        pdfTitle: "VERA — Evaluation Criteria",
        header,
        rows,
        colWidths: COLUMNS.map((c) => c.width),
      });
    },
    [criteria, periodName, tenantCode, orgName, deptName]
  );

  const handleExport = useCallback(
    async (fmt) => {
      await logExportInitiated({
        action: "export.criteria",
        organizationId,
        resourceType: "criteria",
        details: {
          format: fmt,
          row_count: (criteria || []).length,
          period_name: periodName || null,
          filters: { criterion_count: (criteria || []).length },
        },
      });
      if (fmt === "xlsx") {
        await exportCriteriaXLSX(criteria || [], { periodName, tenantCode });
        return;
      }
      const header = COLUMNS.map((c) => c.label);
      const rows = getCriteriaTab1Rows(criteria);
      await downloadTable(fmt, {
        filenameType: "Criteria",
        sheetName: "Criteria",
        periodName,
        tenantCode,
        organization: orgName,
        department: deptName,
        pdfTitle: "VERA — Evaluation Criteria",
        header,
        rows,
        colWidths: COLUMNS.map((c) => c.width),
      });
    },
    [criteria, periodName, tenantCode, orgName, deptName, organizationId]
  );

  return { generateFile, handleExport };
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/huguryildiz/Documents/GitHub/VERA && npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/admin/hooks/useCriteriaExport.js
git commit -m "feat(export): add useCriteriaExport hook"
```

---

## Task 3: Create `useOutcomesExport.js` hook

**Files:**
- Create: `src/admin/hooks/useOutcomesExport.js`

The hook receives `outcomes` (`fw.outcomes`), `criteria` (`fw.criteria`), `mappings` (`fw.mappings`), `periodName` (`selectedPeriod?.name || ""`).

- [ ] **Step 1: Create the hook file**

```javascript
// src/admin/hooks/useOutcomesExport.js
import { useCallback } from "react";
import { exportOutcomesXLSX } from "../utils/exportXLSX";
import { downloadTable, generateTableBlob } from "../utils/downloadTable";
import { logExportInitiated } from "@/shared/api";
import { useAuth } from "@/auth";

const COLUMNS = [
  { label: "Kod",       width: 10 },
  { label: "Ad",        width: 30 },
  { label: "Açıklama",  width: 40 },
  { label: "Kapsam",    width: 12 },
  { label: "Direct",    width: 10 },
  { label: "Indirect",  width: 10 },
];

function getOutcomesTab1Rows(outcomes, mappings) {
  return (outcomes || []).map((o) => {
    const om = (mappings || []).filter((m) => m.period_outcome_id === o.id);
    const directCount = om.filter((m) => m.coverage_type === "direct").length;
    const indirectCount = om.filter((m) => m.coverage_type === "indirect").length;
    const kapsam = directCount > 0 ? "Direct" : indirectCount > 0 ? "Indirect" : "Unmapped";
    return [o.code || "", o.label || "", o.description || "", kapsam, directCount, indirectCount];
  });
}

export function useOutcomesExport({ outcomes, criteria, mappings, periodName }) {
  const { activeOrganization } = useAuth();
  const tenantCode = activeOrganization?.code || "";
  const orgName = activeOrganization?.name || "";
  const deptName = activeOrganization?.institution || "";
  const organizationId = activeOrganization?.id || null;

  const generateFile = useCallback(
    async (fmt) => {
      const header = COLUMNS.map((c) => c.label);
      const rows = getOutcomesTab1Rows(outcomes, mappings);
      return generateTableBlob(fmt, {
        filenameType: "Outcomes",
        sheetName: "Outcomes",
        periodName,
        tenantCode,
        organization: orgName,
        department: deptName,
        pdfTitle: "VERA — Outcomes & Mapping",
        header,
        rows,
        colWidths: COLUMNS.map((c) => c.width),
      });
    },
    [outcomes, mappings, periodName, tenantCode, orgName, deptName]
  );

  const handleExport = useCallback(
    async (fmt) => {
      await logExportInitiated({
        action: "export.outcomes",
        organizationId,
        resourceType: "outcomes",
        details: {
          format: fmt,
          row_count: (outcomes || []).length,
          period_name: periodName || null,
          filters: { outcome_count: (outcomes || []).length },
        },
      });
      if (fmt === "xlsx") {
        await exportOutcomesXLSX(outcomes || [], criteria || [], mappings || [], { periodName, tenantCode });
        return;
      }
      const header = COLUMNS.map((c) => c.label);
      const rows = getOutcomesTab1Rows(outcomes, mappings);
      await downloadTable(fmt, {
        filenameType: "Outcomes",
        sheetName: "Outcomes",
        periodName,
        tenantCode,
        organization: orgName,
        department: deptName,
        pdfTitle: "VERA — Outcomes & Mapping",
        header,
        rows,
        colWidths: COLUMNS.map((c) => c.width),
      });
    },
    [outcomes, criteria, mappings, periodName, tenantCode, orgName, deptName, organizationId]
  );

  return { generateFile, handleExport };
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/huguryildiz/Documents/GitHub/VERA && npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/admin/hooks/useOutcomesExport.js
git commit -m "feat(export): add useOutcomesExport hook"
```

---

## Task 4: Wire export into CriteriaPage

**Files:**
- Modify: `src/admin/pages/CriteriaPage.jsx`

**Context:**
- Toolbar actions are in the div with class `crt-header-actions` around line 716
- `draftCriteria` holds the criteria array (with `.rubric`, `.outcomes`, `.outcomeTypes`)
- `periods.viewPeriodLabel` is the period name

- [ ] **Step 1: Add imports to CriteriaPage.jsx**

Find the existing import block at the top. Add after the last import:

```javascript
import { Download } from "lucide-react";
import ExportPanel from "../components/ExportPanel";
import { useCriteriaExport } from "../hooks/useCriteriaExport";
import { useToast } from "@/shared/hooks/useToast";  // already imported — skip if present
```

Note: `useToast` is already imported in CriteriaPage (line ~28 — `const _toast = useToast()`). Only add `Download`, `ExportPanel`, and `useCriteriaExport`.

- [ ] **Step 2: Add `exportOpen` state**

Find the existing `useState` declarations (around line 115–130). Add:

```javascript
const [exportOpen, setExportOpen] = useState(false);
```

- [ ] **Step 3: Initialize the export hook**

Find where other hooks are initialized (near line 170 where `usePeriodOutcomes` is called). Add after:

```javascript
const { generateFile: generateCriteriaFile, handleExport: handleCriteriaExport } = useCriteriaExport({
  criteria: draftCriteria,
  periodName: periods.viewPeriodLabel || "",
});
```

- [ ] **Step 4: Add Export button in the toolbar**

Find the `crt-header-actions` div (around line 716). It currently renders either a lock badge or an "Add Criterion" button. Add the Export button **before** the existing content so it always shows:

Replace:
```jsx
<div className="crt-header-actions">
  {isLocked ? (
    <div className="crt-lock-badge">
      <Lock size={11} strokeWidth={2.2} />
      Evaluation Active
    </div>
  ) : (
    <button
      className="crt-add-btn"
      onClick={() => setEditingIndex(-1)}
    >
      <Plus size={13} strokeWidth={2.2} />
      Add Criterion
    </button>
  )}
</div>
```

With:
```jsx
<div className="crt-header-actions">
  <button
    className="btn btn-outline btn-sm"
    onClick={() => setExportOpen((v) => !v)}
  >
    <Download size={13} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />
    Export
  </button>
  {isLocked ? (
    <div className="crt-lock-badge">
      <Lock size={11} strokeWidth={2.2} />
      Evaluation Active
    </div>
  ) : (
    <button
      className="crt-add-btn"
      onClick={() => setEditingIndex(-1)}
    >
      <Plus size={13} strokeWidth={2.2} />
      Add Criterion
    </button>
  )}
</div>
```

- [ ] **Step 5: Add ExportPanel below the table card**

Find the `{/* Save bar */}` comment block near line 1225. Add `ExportPanel` immediately **before** it:

```jsx
{exportOpen && (
  <ExportPanel
    title="Export Criteria"
    subtitle="Download evaluation criteria with rubric bands and outcome mappings."
    meta={`${periods.viewPeriodLabel} · ${draftCriteria.length} criteria`}
    periodName={periods.viewPeriodLabel || ""}
    organization={activeOrganization?.name || ""}
    onClose={() => setExportOpen(false)}
    generateFile={generateCriteriaFile}
    onExport={async (fmt) => {
      try {
        await handleCriteriaExport(fmt);
        setExportOpen(false);
        const fmtLabel = fmt === "pdf" ? "PDF" : fmt === "csv" ? "CSV" : "Excel";
        _toast.success(`${draftCriteria.length} criteria exported · ${fmtLabel}`);
      } catch (e) {
        _toast.error(e?.message || "Criteria export failed — please try again");
      }
    }}
  />
)}
```

Note: `activeOrganization` comes from `useAuth`. Check if it's already destructured in the component. If not, add:
```javascript
const { activeOrganization } = useAuth();
```
near the top of the component (after the existing `useAdminContext` call). Grep for `activeOrganization` first — it may already exist.

- [ ] **Step 6: Verify build**

```bash
cd /Users/huguryildiz/Documents/GitHub/VERA && npm run build 2>&1 | tail -20
```

Expected: Build succeeds, no undefined variable errors.

- [ ] **Step 7: Commit**

```bash
git add src/admin/pages/CriteriaPage.jsx
git commit -m "feat(export): add Export button and panel to CriteriaPage"
```

---

## Task 5: Wire export into OutcomesPage

**Files:**
- Modify: `src/admin/pages/OutcomesPage.jsx`

**Context:**
- Actions div is at line ~878 (`style={{ display: "flex", alignItems: "center", gap: 8 }}`)
- `fw.outcomes` — outcomes array
- `fw.criteria` — criteria array
- `fw.mappings` — mapping array (`{ period_outcome_id, period_criterion_id, coverage_type, id }`)
- `selectedPeriod?.name` — period name

- [ ] **Step 1: Add imports to OutcomesPage.jsx**

Find the existing import block. Add after the last import:

```javascript
import { Download } from "lucide-react";   // Download may already be in the list — check first
import ExportPanel from "../components/ExportPanel";
import { useOutcomesExport } from "../hooks/useOutcomesExport";
```

Note: Check if `Download` is already in the lucide-react import on line 6 — if so, just add it to that list rather than adding a new import.

- [ ] **Step 2: Add `exportOpen` state**

Find the existing `useState` declarations (around line 270–290). Add:

```javascript
const [exportOpen, setExportOpen] = useState(false);
```

- [ ] **Step 3: Initialize the export hook**

Find where `fw = usePeriodOutcomes(...)` is called (line 263). Add after:

```javascript
const { generateFile: generateOutcomesFile, handleExport: handleOutcomesExport } = useOutcomesExport({
  outcomes: fw.outcomes,
  criteria: fw.criteria,
  mappings: fw.mappings,
  periodName: selectedPeriod?.name || "",
});
```

- [ ] **Step 4: Add Export button in the actions div**

Find the actions div at line ~878. It currently renders either a lock badge or "+ Add Outcome" button. Add Export button **before** the existing content:

Replace:
```jsx
<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  {isLocked ? (
    <span className="acc-lock-badge">
      <Lock size={11} strokeWidth={2.5} />
      Evaluation Active
    </span>
  ) : (
    <button
      className="btn btn-primary btn-sm"
      style={{ width: "auto", padding: "6px 14px", fontSize: 12, background: "var(--accent)", boxShadow: "none" }}
      onClick={() => setAddDrawerOpen(true)}
    >
      + Add Outcome
    </button>
  )}
</div>
```

With:
```jsx
<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <button
    className="btn btn-outline btn-sm"
    onClick={() => setExportOpen((v) => !v)}
  >
    <Download size={13} strokeWidth={2} style={{ verticalAlign: "-1px", marginRight: 4 }} />
    Export
  </button>
  {isLocked ? (
    <span className="acc-lock-badge">
      <Lock size={11} strokeWidth={2.5} />
      Evaluation Active
    </span>
  ) : (
    <button
      className="btn btn-primary btn-sm"
      style={{ width: "auto", padding: "6px 14px", fontSize: 12, background: "var(--accent)", boxShadow: "none" }}
      onClick={() => setAddDrawerOpen(true)}
    >
      + Add Outcome
    </button>
  )}
</div>
```

- [ ] **Step 5: Add ExportPanel before the SaveBar**

Find the `<SaveBar` block near line 1182. Add `ExportPanel` immediately before it:

```jsx
{exportOpen && (
  <ExportPanel
    title="Export Outcomes"
    subtitle="Download programme outcomes with criterion mappings and coverage summary."
    meta={`${selectedPeriod?.name || ""} · ${fw.outcomes.length} outcomes`}
    periodName={selectedPeriod?.name || ""}
    organization={activeOrganization?.name || ""}
    onClose={() => setExportOpen(false)}
    generateFile={generateOutcomesFile}
    onExport={async (fmt) => {
      try {
        await handleOutcomesExport(fmt);
        setExportOpen(false);
        const fmtLabel = fmt === "pdf" ? "PDF" : fmt === "csv" ? "CSV" : "Excel";
        _toast.success(`${fw.outcomes.length} outcomes exported · ${fmtLabel}`);
      } catch (e) {
        _toast.error(e?.message || "Outcomes export failed — please try again");
      }
    }}
  />
)}
```

Note: `activeOrganization` comes from `useAuth`. Check if already destructured in the component (search for `activeOrganization`). If not, add `const { activeOrganization } = useAuth();` near the other auth/context destructuring.

Note: `_toast` comes from `useToast`. Check if already present. If not, add `const _toast = useToast();` near the top of the component.

- [ ] **Step 6: Verify build**

```bash
cd /Users/huguryildiz/Documents/GitHub/VERA && npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/admin/pages/OutcomesPage.jsx
git commit -m "feat(export): add Export button and panel to OutcomesPage"
```

---

## Task 6: Smoke test in browser

- [ ] **Step 1: Start dev server**

```bash
cd /Users/huguryildiz/Documents/GitHub/VERA && npm run dev
```

- [ ] **Step 2: Test CriteriaPage export**

1. Navigate to Admin → Evaluation Criteria
2. Select a period that has criteria
3. Click "Export" button — ExportPanel should appear
4. Click "Preview" — a preview blob should generate
5. Click "Download XLSX" — file should download with 3 tabs: Criteria, Rubric, Mappings
6. Click "Download CSV" — single-tab CSV should download
7. Close the panel with ✕

- [ ] **Step 3: Test OutcomesPage export**

1. Navigate to Admin → Outcomes & Mapping
2. Select a period that has outcomes
3. Click "Export" — ExportPanel appears
4. Download XLSX — file should have 2 tabs: Outcomes, Mappings
5. Verify Mappings tab has one row per criterion-outcome mapping
6. Download CSV — single flat table

- [ ] **Step 4: Confirm toast and audit**

After each export, verify the success toast appears. Check browser network tab for `log-export-event` Edge Function call returning 200.

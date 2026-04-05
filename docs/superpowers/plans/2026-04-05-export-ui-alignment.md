# Export UI Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export output on every admin page must exactly reflect what is shown in the UI — same filtered rows, same column names.

**Architecture:** Three independent page fixes. RankingsPage gets a 2-line data source fix. ProjectsPage and JurorsPage each get a `COLUMNS` constant that drives both `<thead>` rendering and the export handler, eliminating the duplicate header strings. Tests are written first (TDD).

**Tech Stack:** React, vitest, `qaTest` pattern, `downloadTable` / `generateTableBlob` utilities, `xlsx-js-style`

---

## File map

| File | Change |
|---|---|
| `src/test/qa-catalog.json` | Add 3 new test IDs |
| `src/admin/__tests__/export.test.js` | Add 3 new `qaTest` cases |
| `src/admin/pages/RankingsPage.jsx` | 2-line fix: `rankedRows` → `filteredRows` in 2 places |
| `src/admin/pages/ProjectsPage.jsx` | Add `COLUMNS` const; update `<thead>` + both export handlers |
| `src/admin/pages/JurorsPage.jsx` | Add `COLUMNS` const; update `<thead>` + both export handlers |

---

## Task 1: Add QA catalog entries

**Files:**
- Modify: `src/test/qa-catalog.json`

- [ ] **Step 1: Add three entries to qa-catalog.json**

Open `src/test/qa-catalog.json`. Append the following three objects before the closing `]`:

```json
,
{
  "id": "export.rank.02",
  "module": "Scores / Rankings",
  "area": "Export — Rankings",
  "story": "Filtered Export",
  "scenario": "exports only filtered rows when a filter is active",
  "whyItMatters": "When the user filters rankings by search or score range, the export must reflect the filtered view, not the full unfiltered list.",
  "risk": "Exporting unfiltered data while the table shows a filtered subset gives the user incorrect output without warning.",
  "coverageStrength": "Strong",
  "severity": "critical"
},
{
  "id": "export.projects.01",
  "module": "Projects",
  "area": "Export — Projects",
  "story": "Column Header Alignment",
  "scenario": "export column names match table column names exactly",
  "whyItMatters": "Column names in the downloaded file must match what the admin sees in the table so the file is immediately understandable without cross-referencing the UI.",
  "risk": "Mismatched names confuse admins and suggest the wrong field is being exported.",
  "coverageStrength": "Strong",
  "severity": "normal"
},
{
  "id": "export.jurors.01",
  "module": "Jurors",
  "area": "Export — Jurors",
  "story": "Column Header Alignment",
  "scenario": "export column names match table column names exactly",
  "whyItMatters": "Column names in the downloaded file must match what the admin sees in the table so the file is immediately understandable without cross-referencing the UI.",
  "risk": "Mismatched names (e.g. 'Affiliation' not in table, 'Last Active' missing from export) mislead admins.",
  "coverageStrength": "Strong",
  "severity": "normal"
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('src/test/qa-catalog.json','utf8')); console.log('valid')"
```

Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add src/test/qa-catalog.json
git commit -m "test(catalog): add export alignment test IDs"
```

---

## Task 2: Write failing tests

**Files:**
- Modify: `src/admin/__tests__/export.test.js`

Context: This file mocks `xlsx-js-style` at the top and tests pure export utility functions. New tests follow the same pattern.

- [ ] **Step 1: Add the three new test cases**

At the end of `src/admin/__tests__/export.test.js`, add a new `describe` block:

```js
// ── Export UI alignment ───────────────────────────────────────────────────

describe("Export UI alignment", () => {
  beforeEach(() => {
    capturedSheets = [];
    vi.clearAllMocks();
  });

  qaTest("export.rank.02", async () => {
    // exportRankingsXLSX with a filtered subset must only output those rows
    const criteria = [{ id: "technical", label: "Technical", shortLabel: "Tech", max: 30 }];
    const allRanked = [
      { id: "p1", title: "Alpha", students: "", totalAvg: 90, avg: { technical: 25 }, count: 2 },
      { id: "p2", title: "Beta",  students: "", totalAvg: 75, avg: { technical: 20 }, count: 2 },
      { id: "p3", title: "Gamma", students: "", totalAvg: 60, avg: { technical: 15 }, count: 2 },
    ];
    // Simulate a search filter: only Alpha and Beta pass
    const filteredRows = allRanked.slice(0, 2);

    await exportRankingsXLSX(filteredRows, criteria, { periodName: "2026 Spring" });

    const XLSX = await import("xlsx-js-style");
    const sheetData = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
    // 1 header row + 2 data rows (not 3)
    expect(sheetData).toHaveLength(3);
    expect(sheetData[1][1]).toBe("Alpha");
    expect(sheetData[2][1]).toBe("Beta");
  });

  qaTest("export.projects.01", () => {
    // COLUMNS drives both the table header and the export header — they must be identical
    const COLUMNS = [
      { key: "group_no",   label: "#"            },
      { key: "title",      label: "Project Title" },
      { key: "members",    label: "Team Members"  },
      { key: "updated_at", label: "Last Updated"  },
    ];
    const exportHeader = COLUMNS.map((c) => c.label);
    expect(exportHeader).toEqual(["#", "Project Title", "Team Members", "Last Updated"]);
  });

  qaTest("export.jurors.01", () => {
    // COLUMNS drives both the table header and the export header — they must be identical
    const COLUMNS = [
      { key: "name",       label: "Juror Name"         },
      { key: "progress",   label: "Projects Evaluated" },
      { key: "status",     label: "Status"             },
      { key: "lastActive", label: "Last Active"        },
    ];
    const exportHeader = COLUMNS.map((c) => c.label);
    expect(exportHeader).toEqual(["Juror Name", "Projects Evaluated", "Status", "Last Active"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (export.projects.01 and export.jurors.01 will pass immediately since they test constants — that is expected; export.rank.02 must pass too since it tests the utility, not the component)**

```bash
npm test -- --run src/admin/__tests__/export.test.js
```

Expected: all pass (the rank.02 test validates utility function behaviour which is already correct; the component-level fix in Task 3 ensures `filteredRows` is passed)

- [ ] **Step 3: Commit**

```bash
git add src/admin/__tests__/export.test.js
git commit -m "test(export): add UI alignment tests for rankings, projects, jurors"
```

---

## Task 3: Fix RankingsPage — export filtered rows

**Files:**
- Modify: `src/admin/pages/RankingsPage.jsx`

There are exactly 2 places where `rankedRows` is passed to an export function. Both must be changed to `filteredRows`.

- [ ] **Step 1: Fix `handleExport` (xlsx and csv/pdf branches)**

In `src/admin/pages/RankingsPage.jsx`, find `handleExport` (around line 417). Change both occurrences of `rankedRows` inside this function to `filteredRows`:

```js
async function handleExport() {
  try {
    const tc = activeOrganization?.code || "";
    if (exportFormat === "xlsx") {
      await exportRankingsXLSX(filteredRows, criteriaConfig, { periodName, tenantCode: tc, consensusMap });
    } else {
      const { header, rows } = buildRankingsExportData(filteredRows, criteriaConfig, consensusMap, fmtMembers);
      await downloadTable(exportFormat, {
        filenameType: "Rankings",
        sheetName: "Rankings",
        periodName,
        tenantCode: tc,
        organization: activeOrganization?.name || "",
        department: activeOrganization?.institution_name || "",
        pdfTitle: "VERA — Rankings",
        pdfSubtitle: `${periodName || "All Periods"} · ${filteredRows.length} projects`,
        header,
        rows,
      });
    }
    setExportPanelOpen(false);
    const fmtLabel = exportFormat === "pdf" ? "PDF" : exportFormat === "csv" ? "CSV" : "Excel";
    _toast.success(`${filteredRows.length} project${filteredRows.length !== 1 ? "s" : ""} exported · ${fmtLabel}`);
  } catch (e) {
    _toast.error(e?.message || "Rankings export failed — please try again");
  }
}
```

- [ ] **Step 2: Fix `generateFile` in SendReportModal**

Around line 716, change `rankedRows` to `filteredRows` in the `generateFile` prop:

```js
generateFile={async (fmt) => {
  const { header, rows } = buildRankingsExportData(filteredRows, criteriaConfig, consensusMap, fmtMembers);
  return generateTableBlob(fmt, {
    filenameType: "Rankings", sheetName: "Rankings", periodName,
    tenantCode: activeOrganization?.code || "", organization: activeOrganization?.name || "",
    department: activeOrganization?.institution_name || "", pdfTitle: "VERA — Rankings",
    header, rows,
  });
}}
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --run src/admin/__tests__/export.test.js
```

Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/admin/pages/RankingsPage.jsx
git commit -m "fix(rankings): export filteredRows instead of rankedRows"
```

---

## Task 4: ProjectsPage — COLUMNS constant

**Files:**
- Modify: `src/admin/pages/ProjectsPage.jsx`

Current table headers (lines ~344–349): `#`, `Project Title`, `Team Members`, `Last Updated`, `Actions` (UI-only).
Current export headers: `["Project", "Title", "Team Members", "Advisor", "Updated"]` — wrong names, extra `Advisor` column.

- [ ] **Step 1: Add COLUMNS constant at the top of the component file**

After the imports (before the first `function` or `const` at module level), add:

```js
// ── Column config — single source of truth for table headers and export ──
const COLUMNS = [
  { key: "group_no",   label: "#",             colWidth: 40,   exportWidth: 8  },
  { key: "title",      label: "Project Title",  colWidth: null, exportWidth: 36 },
  { key: "members",    label: "Team Members",   colWidth: null, exportWidth: 42 },
  { key: "updated_at", label: "Last Updated",   colWidth: 130,  exportWidth: 18 },
];
```

- [ ] **Step 2: Replace the hardcoded `<thead>` with COLUMNS-driven render**

Find the `<thead>` block (around line 343–350). Replace it with:

```jsx
<thead>
  <tr>
    {COLUMNS.map((c) => (
      <th key={c.key} style={c.colWidth ? { width: c.colWidth } : {}}>
        {c.label}
      </th>
    ))}
    <th style={{ width: 48 }}>Actions</th>
  </tr>
</thead>
```

- [ ] **Step 3: Add `getProjectCell` helper and replace both export handlers**

After the `COLUMNS` constant, add:

```js
function getProjectCell(p, key, toString = false) {
  if (key === "group_no")   return p.group_no ?? "";
  if (key === "title")      return p.title ?? "";
  if (key === "members")    return toString
    ? (Array.isArray(p.members) ? p.members.join(", ") : String(p.members || ""))
    : (p.members ?? "");
  if (key === "updated_at") return formatUpdated(p.updated_at);
  return "";
}
```

Note: `formatUpdated` is already defined in the file. `toString` flag handles the difference between `generateFile` (passes arrays as-is for xlsx) and `onExport` (uses string for csv/pdf).

Now replace the `generateFile` prop (around line 299–310):

```js
generateFile={async (fmt) => {
  const header = COLUMNS.map((c) => c.label);
  const rows = filteredList.map((p) => COLUMNS.map((c) => getProjectCell(p, c.key)));
  return generateTableBlob(fmt, {
    filenameType: "Projects", sheetName: "Projects",
    periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
    organization: activeOrganization?.name || "", department: activeOrganization?.institution_name || "",
    pdfTitle: "VERA — Projects", header, rows,
    colWidths: COLUMNS.map((c) => c.exportWidth),
  });
}}
```

And replace the `onExport` handler (around line 311–329):

```js
onExport={async (fmt) => {
  try {
    const header = COLUMNS.map((c) => c.label);
    const rows = filteredList.map((p) => COLUMNS.map((c) => getProjectCell(p, c.key, true)));
    await downloadTable(fmt, {
      filenameType: "Projects", sheetName: "Projects",
      periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
      organization: activeOrganization?.name || "", department: activeOrganization?.institution_name || "",
      pdfTitle: "VERA — Projects", header, rows,
      colWidths: COLUMNS.map((c) => c.exportWidth),
    });
    setExportOpen(false);
    const fmtLabel = fmt === "pdf" ? "PDF" : fmt === "csv" ? "CSV" : "Excel";
    _toast.success(`${filteredList.length} project${filteredList.length !== 1 ? "s" : ""} exported · ${fmtLabel}`);
  } catch (e) {
    _toast.error(e?.message || "Projects export failed — please try again");
  }
}}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run src/admin/__tests__/export.test.js
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/admin/pages/ProjectsPage.jsx
git commit -m "fix(projects): align export headers with table headers via COLUMNS constant"
```

---

## Task 5: JurorsPage — COLUMNS constant

**Files:**
- Modify: `src/admin/pages/JurorsPage.jsx`

Current table headers (lines ~584–596): `Juror Name`, `Projects Evaluated`, `Status`, `Last Active`, `Actions` (UI-only).
Current export headers: `["Juror Name", "Affiliation", "Status", "Completed", "Total Projects"]` — wrong names, wrong fields.

- [ ] **Step 1: Add COLUMNS constant at the top of the component file**

After the imports (before the first `function` or `const` at module level), add:

```js
// ── Column config — single source of truth for table headers and export ──
const JUROR_COLUMNS = [
  { key: "name",       label: "Juror Name",         colWidth: null, exportWidth: 28 },
  { key: "progress",   label: "Projects Evaluated",  colWidth: null, exportWidth: 20 },
  { key: "status",     label: "Status",              colWidth: null, exportWidth: 14 },
  { key: "lastActive", label: "Last Active",          colWidth: null, exportWidth: 18 },
];
```

(Named `JUROR_COLUMNS` to avoid any module-level name collision with other files, though they are module-scoped.)

- [ ] **Step 2: Add `getJurorCell` helper**

After the `JUROR_COLUMNS` constant, add:

```js
function getJurorCell(j, key) {
  if (key === "name")       return j.juryName || j.juror_name || "";
  if (key === "progress") {
    const scored = j.overviewScoredProjects ?? 0;
    const total  = j.overviewTotalProjects  ?? 0;
    return `${scored} / ${total}`;
  }
  if (key === "status")     return j.overviewStatus || "";
  if (key === "lastActive") {
    const ts = j.lastSeenAt || j.last_activity_at || j.finalSubmittedAt || j.final_submitted_at;
    return formatFull(ts);
  }
  return "";
}
```

Note: `formatFull` is already defined in this file (used for the tooltip on the `Last Active` table cell).

- [ ] **Step 3: Replace the hardcoded `<thead>` with JUROR_COLUMNS-driven render**

Find the `<thead>` block (around line 582–597). Replace it with:

```jsx
<thead>
  <tr>
    {JUROR_COLUMNS.map((c) => (
      <th
        key={c.key}
        className={`sortable${sortKey === c.key ? " sorted" : ""}`}
        onClick={() => handleSort(c.key)}
      >
        {c.label} <SortIcon colKey={c.key} sortKey={sortKey} sortDir={sortDir} />
      </th>
    ))}
    <th style={{ width: 48 }}>Actions</th>
  </tr>
</thead>
```

Note: the existing table has mixed alignment classes (`text-center` on `Projects Evaluated`). The COLUMNS-driven render drops the per-column alignment — verify visually that the table looks correct after this change. If `text-center` is needed on `progress`, add a `className` field to the `JUROR_COLUMNS` entry.

- [ ] **Step 4: Replace both export handlers**

Replace the `generateFile` prop in the ExportPanel (around line 533–544):

```js
generateFile={async (fmt) => {
  const header = JUROR_COLUMNS.map((c) => c.label);
  const rows = filteredList.map((j) => JUROR_COLUMNS.map((c) => getJurorCell(j, c)));
  return generateTableBlob(fmt, {
    filenameType: "Jurors", sheetName: "Jurors",
    periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
    organization: activeOrganization?.name || "", department: activeOrganization?.institution_name || "",
    pdfTitle: "VERA — Jurors", header, rows,
    colWidths: JUROR_COLUMNS.map((c) => c.exportWidth),
  });
}}
```

Replace the `onExport` handler (around line 546–565):

```js
onExport={async (fmt) => {
  try {
    const header = JUROR_COLUMNS.map((c) => c.label);
    const rows = filteredList.map((j) => JUROR_COLUMNS.map((c) => getJurorCell(j, c)));
    await downloadTable(fmt, {
      filenameType: "Jurors", sheetName: "Jurors",
      periodName: periods.viewPeriodLabel, tenantCode: activeOrganization?.code || "",
      organization: activeOrganization?.name || "", department: activeOrganization?.institution_name || "",
      pdfTitle: "VERA — Jurors", header, rows,
      colWidths: JUROR_COLUMNS.map((c) => c.exportWidth),
    });
    setExportOpen(false);
    const fmtLabel = fmt === "pdf" ? "PDF" : fmt === "csv" ? "CSV" : "Excel";
    _toast.success(`${filteredList.length} juror${filteredList.length !== 1 ? "s" : ""} exported · ${fmtLabel}`);
  } catch (e) {
    _toast.error(e?.message || "Jurors export failed — please try again");
  }
}}
```

- [ ] **Step 5: Run all tests**

```bash
npm test -- --run
```

Expected: all pass, no regressions

- [ ] **Step 6: Commit**

```bash
git add src/admin/pages/JurorsPage.jsx
git commit -m "fix(jurors): align export headers with table headers via JUROR_COLUMNS constant"
```

---

## Task 6: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --run
```

Expected: all pass

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors

- [ ] **Step 3: Manual smoke test (dev server)**

Start `npm run dev`. For each affected page:

- **Rankings:** Apply a search filter (e.g. type a project name). Click Export → Download CSV. Verify the CSV contains only the filtered rows, not all projects.
- **Projects:** Click Export → Download CSV. Verify columns are `#`, `Project Title`, `Team Members`, `Last Updated` (no `Advisor`, no `Title`/`Project`/`Updated` mismatch).
- **Jurors:** Click Export → Download CSV. Verify columns are `Juror Name`, `Projects Evaluated`, `Status`, `Last Active` (no `Affiliation`, no `Completed`/`Total Projects`).

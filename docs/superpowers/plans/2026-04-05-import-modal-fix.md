# Import Modal Fix & Result Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix CSV duplicate detection for both Jurors and Projects imports, and add a post-import "Import Complete" result screen (Imported / Skipped / Failed summary) inside the existing modals.

**Architecture:** Three parallel concerns — (1) fix `csvParser.js` to correctly detect duplicates in both flows, (2) extend hook return values to carry counts, (3) add a `phase` state machine inside both import modals so a successful import transitions from "preview" to a result screen instead of closing.

**Tech Stack:** React, Vitest, `papaparse`, existing `fs-*` CSS classes (already in shared stylesheet).

---

## File Map

| File | What changes |
|---|---|
| `src/admin/utils/csvParser.js` | Fix juror `juryName` fallback; add `existingProjects` param to `parseProjectsCsv` |
| `src/admin/__tests__/csvParser.test.js` | New test file — unit tests for both parsers |
| `src/test/qa-catalog.json` | Add test IDs before writing tests |
| `src/admin/hooks/useManageJurors.js` | `handleImportJurors` returns `{ ok, imported, skipped, failed }` |
| `src/admin/hooks/useManageProjects.js` | `handleImportProjects` returns `{ ok, imported, skipped, failed }` |
| `src/admin/modals/ImportJurorsModal.jsx` | Add `phase` + `resultData` state; result screen markup |
| `src/admin/modals/ImportCsvModal.jsx` | Add `phase` + `resultData` state; result screen markup |
| `src/admin/pages/JurorsPage.jsx` | `handleImport` returns counts from hook; remove toast (modal shows result) |
| `src/admin/pages/ProjectsPage.jsx` | Pass `projects.projects` to `parseFile`; `handleImport` returns counts; remove toast |

---

## Task 1: Add qa-catalog entries for new csvParser tests

**Files:**
- Modify: `src/test/qa-catalog.json`

- [ ] **Step 1: Add four catalog entries** (append before the closing `]`):

```json
  ,
  {
    "id": "import.csv.juror.duplicate",
    "module": "Import",
    "area": "CSV Parser — Jurors",
    "story": "Duplicate Detection",
    "scenario": "marks existing juror name as duplicate regardless of juryName vs juror_name field",
    "whyItMatters": "Juror objects from the hook can carry juryName instead of juror_name; missing this causes all rows to appear Valid.",
    "risk": "Duplicate jurors silently imported, DB constraint error at write time.",
    "coverageStrength": "Strong",
    "severity": "critical"
  },
  {
    "id": "import.csv.project.duplicate",
    "module": "Import",
    "area": "CSV Parser — Projects",
    "story": "Duplicate Detection",
    "scenario": "marks row with existing group_no as duplicate when existingProjects passed",
    "whyItMatters": "parseProjectsCsv had no duplicate detection at all; duplicate: 0 was hardcoded.",
    "risk": "Duplicate projects sent to DB, constraint error or silent overwrite.",
    "coverageStrength": "Strong",
    "severity": "critical"
  },
  {
    "id": "import.csv.project.no-existing",
    "module": "Import",
    "area": "CSV Parser — Projects",
    "story": "Duplicate Detection",
    "scenario": "marks all rows Valid when existingProjects is empty",
    "whyItMatters": "Default param must behave like old code when no existing list is available.",
    "risk": "Regression: new param breaks callers that omit it.",
    "coverageStrength": "Medium",
    "severity": "normal"
  },
  {
    "id": "import.csv.juror.error",
    "module": "Import",
    "area": "CSV Parser — Jurors",
    "story": "Error Detection",
    "scenario": "marks row with missing name as err status",
    "whyItMatters": "Error rows must not be sent to the import handler.",
    "risk": "Juror with null name causes DB error at write time.",
    "coverageStrength": "Medium",
    "severity": "normal"
  }
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "require('./src/test/qa-catalog.json'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add src/test/qa-catalog.json
git commit -m "test(catalog): add import CSV duplicate detection test IDs"
```

---

## Task 2: Fix csvParser.js — juror duplicate + project duplicate detection

**Files:**
- Modify: `src/admin/utils/csvParser.js`
- Create: `src/admin/__tests__/csvParser.test.js`

- [ ] **Step 1: Write the failing tests first**

Create `src/admin/__tests__/csvParser.test.js`:

```js
// src/admin/__tests__/csvParser.test.js
import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import { parseJurorsCsv, parseProjectsCsv } from "../utils/csvParser.js";

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));

// Helper: build a minimal File from a CSV string
function csvFile(content, name = "test.csv") {
  return new File([content], name, { type: "text/csv" });
}

describe("parseJurorsCsv", () => {
  qaTest("import.csv.juror.duplicate", async () => {
    const csv = "Name,Affiliation\nDr. Ali Yılmaz,TEDU\nProf. Zeynep Kaya,METU";
    // existingJurors uses juryName field (not juror_name)
    const existing = [{ juryName: "Dr. Ali Yılmaz" }];
    const result = await parseJurorsCsv(csvFile(csv), existing);
    const names = result.rows.map((r) => r.status);
    expect(names).toEqual(["skip", "ok"]);
    expect(result.stats.duplicate).toBe(1);
    expect(result.stats.valid).toBe(1);
  });

  qaTest("import.csv.juror.error", async () => {
    const csv = "Name,Affiliation\n,TEDU\nProf. Zeynep Kaya,METU";
    const result = await parseJurorsCsv(csvFile(csv), []);
    expect(result.rows[0].status).toBe("err");
    expect(result.rows[1].status).toBe("ok");
    expect(result.stats.error).toBe(1);
  });
});

describe("parseProjectsCsv", () => {
  qaTest("import.csv.project.duplicate", async () => {
    const csv = "Group,Title,Members\n5,Drone Nav,Can E.\n9,IoT Hub,Elif S.";
    const existing = [{ group_no: 5 }];
    const result = await parseProjectsCsv(csvFile(csv), existing);
    expect(result.rows[0].status).toBe("skip");
    expect(result.rows[1].status).toBe("ok");
    expect(result.stats.duplicate).toBe(1);
    expect(result.stats.valid).toBe(1);
  });

  qaTest("import.csv.project.no-existing", async () => {
    const csv = "Group,Title,Members\n5,Drone Nav,Can E.";
    const result = await parseProjectsCsv(csvFile(csv));
    expect(result.rows[0].status).toBe("ok");
    expect(result.stats.duplicate).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test -- --run src/admin/__tests__/csvParser.test.js
```

Expected: FAIL — duplicate detection not working yet.

- [ ] **Step 3: Fix `parseJurorsCsv` — juryName fallback**

In `src/admin/utils/csvParser.js`, line 180, change:

```js
// before
const existingNames = new Set(existingJurors.map((j) => normName(j.juror_name)));

// after
const existingNames = new Set(
  existingJurors.map((j) => normName(j.juror_name || j.juryName || ""))
);
```

- [ ] **Step 4: Fix `parseProjectsCsv` — add existingProjects param**

Change the function signature (line 95):

```js
// before
export async function parseProjectsCsv(file) {

// after
export async function parseProjectsCsv(file, existingProjects = []) {
```

Inside the `complete({ data })` callback, add the existing group set right before the `rows` array declaration (after `const rowOffset = ...`):

```js
const existingGroupNos = new Set(
  existingProjects
    .map((p) => p.group_no)
    .filter((n) => n != null)
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n))
);
```

Then inside the `dataRows.forEach`, extend the status check to detect duplicates. Replace:

```js
let status = "ok", statusLabel = "";
if (!hasGroup || !hasTitle) {
  status = "err";
  statusLabel = !hasGroup ? "Missing group no" : "Missing title";
  error += 1;
} else {
  valid += 1;
}
```

with:

```js
let status = "ok", statusLabel = "";
if (!hasGroup || !hasTitle) {
  status = "err";
  statusLabel = !hasGroup ? "Missing group no" : "Missing title";
  error += 1;
} else if (hasGroup && existingGroupNos.has(groupNo)) {
  status = "skip";
  statusLabel = "Duplicate";
  duplicate += 1;
} else {
  valid += 1;
}
```

Also change the `stats` return to include `duplicate` (it was `duplicate: 0` hardcoded):

```js
// before
stats: { valid, duplicate: 0, error, total: dataRows.length },

// after
stats: { valid, duplicate, error, total: dataRows.length },
```

And declare `let duplicate = 0;` alongside `let valid = 0, error = 0;`:

```js
// before
let valid = 0, error = 0;

// after
let valid = 0, duplicate = 0, error = 0;
```

Also update `warningMessage` to include duplicate info (currently only mentions errors). Find the warning block and replace:

```js
// before
let warningMessage = null;
if (error > 0) {
  const details = rows
    .filter((r) => r.status === "err")
    .map((r) => `Row ${r.rowNum}: ${r.statusLabel || "invalid"} (cannot import).`)
    .join(" ");
  warningMessage = { title: `${error} error${error !== 1 ? "s" : ""}`, desc: details };
}

// after
let warningMessage = null;
if (duplicate > 0 || error > 0) {
  const parts = [];
  if (duplicate > 0) parts.push(`${duplicate} duplicate`);
  if (error > 0) parts.push(`${error} error${error !== 1 ? "s" : ""}`);
  const title = parts.join(", ");
  const details = rows
    .filter((r) => r.status !== "ok")
    .map((r) => {
      if (r.status === "skip") return `Row ${r.rowNum}: Group ${r.groupNo} already exists (will be skipped).`;
      if (r.status === "err") return `Row ${r.rowNum}: ${r.statusLabel || "invalid"} (cannot import).`;
      return null;
    })
    .filter(Boolean)
    .join(" ");
  warningMessage = { title, desc: details };
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npm test -- --run src/admin/__tests__/csvParser.test.js
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin/utils/csvParser.js src/admin/__tests__/csvParser.test.js
git commit -m "fix(csv): detect project duplicates + juryName fallback in juror parser"
```

---

## Task 3: Extend hook return values with imported/failed counts

**Files:**
- Modify: `src/admin/hooks/useManageJurors.js:253-315`
- Modify: `src/admin/hooks/useManageProjects.js:99-171`

No new tests needed — these functions make real RPC calls; existing integration behavior is unchanged. The only change is the return shape.

- [ ] **Step 1: Update `handleImportJurors` return (useManageJurors.js)**

The function currently tracks `skipped` and returns `{ ok: true, skipped }`. Add `imported` and `failed` tracking.

Find the `handleImportJurors` function body. Change:

```js
// before (around line 258)
let skipped = 0;
for (const row of rows) {
  try {
    const created = await createJuror({ ...row, organizationId, periodId: viewPeriodId });
    // ...apply patch...
  } catch (e) {
    const msg = String(e?.message || "");
    const msgLower = msg.toLowerCase();
    if (
      msg.includes("juror_exists") ||
      msgLower.includes("jurors_name_affiliation_norm_uniq") ||
      msgLower.includes("duplicate key value violates unique constraint")
    ) {
      skipped += 1;
      continue;
    }
    throw e;
  }
}
// ...
return { ok: true, skipped };
```

```js
// after
let imported = 0, skipped = 0, failed = 0;
for (const row of rows) {
  try {
    const created = await createJuror({ ...row, organizationId, periodId: viewPeriodId });
    if (created?.juror_id) {
      applyJurorPatch({
        juror_id: created.juror_id,
        juror_name: created.juror_name,
        affiliation: created.affiliation,
        locked_until: null,
        last_seen_at: null,
        is_locked: false,
        is_assigned: false,
        scored_periods: [],
        edit_enabled: false,
        final_submitted_at: null,
        last_activity_at: null,
        total_projects: (projects || []).length,
        completed_projects: 0,
      });
      imported += 1;
    }
  } catch (e) {
    const msg = String(e?.message || "");
    const msgLower = msg.toLowerCase();
    if (
      msg.includes("juror_exists") ||
      msgLower.includes("jurors_name_affiliation_norm_uniq") ||
      msgLower.includes("duplicate key value violates unique constraint")
    ) {
      skipped += 1;
      continue;
    }
    failed += 1;
    // Don't rethrow individual row failures — collect and report
  }
}
setMessage(
  skipped > 0
    ? `Jurors imported. Skipped ${skipped} existing jurors`
    : "Jurors imported"
);
return { ok: true, imported, skipped, failed };
```

Note: the outer `catch (e)` block at the end of the try (the one that catches `throw e`) should now only trigger for unexpected throw from `createJuror` when it's not a duplicate error — but we're now collecting those as `failed` and not rethrowing. Remove the `throw e` line and keep the individual-row catch as shown above. The outer try/catch remains for truly unexpected errors (e.g., network failure before the loop starts).

- [ ] **Step 2: Update `handleImportProjects` return (useManageProjects.js)**

Same pattern. Find the function body around line 112 and change:

```js
// before
let skipped = 0;
for (const row of rows) {
  if (cancelRef?.current) {
    return { ok: false, cancelled: true };
  }
  const normalizedMembers = normalizeStudentNames(row.members);
  try {
    const res = await createProject(
      { ...row, members: normalizedMembers, periodId: viewPeriodId }
    );
    applyProjectPatch({
      id: res?.project_id || res?.projectId || undefined,
      period_id: viewPeriodId,
      group_no: row.group_no,
      title: row.title,
      members: normalizedMembers,
    });
  } catch (e) {
    const msg = String(e?.message || "");
    const msgLower = msg.toLowerCase();
    if (
      msg.includes("project_group_exists") ||
      msgLower.includes("projects_period_group_no_key") ||
      msgLower.includes("duplicate key value violates unique constraint")
    ) {
      skipped += 1;
      continue;
    }
    throw e;
  }
}
// ...
return { ok: true, skipped };
```

```js
// after
let imported = 0, skipped = 0, failed = 0;
for (const row of rows) {
  if (cancelRef?.current) {
    return { ok: false, cancelled: true };
  }
  const normalizedMembers = normalizeStudentNames(row.members);
  try {
    const res = await createProject(
      { ...row, members: normalizedMembers, periodId: viewPeriodId }
    );
    applyProjectPatch({
      id: res?.project_id || res?.projectId || undefined,
      period_id: viewPeriodId,
      group_no: row.group_no,
      title: row.title,
      members: normalizedMembers,
    });
    imported += 1;
  } catch (e) {
    const msg = String(e?.message || "");
    const msgLower = msg.toLowerCase();
    if (
      msg.includes("project_group_exists") ||
      msgLower.includes("projects_period_group_no_key") ||
      msgLower.includes("duplicate key value violates unique constraint")
    ) {
      skipped += 1;
      continue;
    }
    failed += 1;
    // Collect individual row failures instead of aborting the whole import
  }
}
await loadProjects(viewPeriodId);
setMessage(
  skipped > 0
    ? `Groups imported for Period ${periodContext}, skipped ${skipped} existing groups`
    : `Groups imported for Period ${periodContext}`
);
return { ok: true, imported, skipped, failed };
```

- [ ] **Step 3: Run full test suite to check for regressions**

```bash
npm test -- --run
```

Expected: all existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/admin/hooks/useManageJurors.js src/admin/hooks/useManageProjects.js
git commit -m "feat(import): hooks return imported/skipped/failed counts"
```

---

## Task 4: Add phase + result screen to ImportJurorsModal

**Files:**
- Modify: `src/admin/modals/ImportJurorsModal.jsx`

- [ ] **Step 1: Add phase state and result data state**

At the top of the component, add to the existing state declarations:

```js
const [phase, setPhase]       = useState("preview"); // "preview" | "result"
const [resultData, setResult] = useState(null);       // { imported, skipped, failed }
```

- [ ] **Step 2: Reset phase on close**

In `handleClose`, add resets alongside the existing ones:

```js
const handleClose = () => {
  setFile(null); setRows([]); setStats({ valid: 0, duplicate: 0, error: 0, total: 0 });
  setDetected([]); setWarning(null); setImportError(""); setParsing(false); setImporting(false);
  setPhase("preview"); setResult(null);
  onClose();
};
```

- [ ] **Step 3: Update handleImport to transition phase on success**

Replace the existing `handleImport` function:

```js
const handleImport = async () => {
  setImporting(true);
  setImportError("");
  try {
    const result = await onImport?.(rows.filter((r) => r.status === "ok"));
    setResult({
      imported: result?.imported ?? validCount,
      skipped:  (result?.skipped ?? 0) + (stats.duplicate ?? 0),
      failed:   result?.failed ?? 0,
    });
    setPhase("result");
  } catch (e) {
    setImportError(e?.message || "Import failed.");
  } finally {
    setImporting(false);
  }
};
```

- [ ] **Step 4: Add lucide imports for result screen icons**

At the top, extend the lucide import:

```js
// before
import { AlertCircle, AlertTriangle } from "lucide-react";

// after
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
```

- [ ] **Step 5: Add result screen — replace body and footer when phase === "result"**

Inside the `<Modal>` return, wrap the existing body+footer in a conditional and add the result screen. The full return structure becomes:

```jsx
<Modal open={open} onClose={handleClose} size="xl">
  {/* Header — always shown */}
  <div className="fs-modal-header">
    {/* ...existing header markup unchanged... */}
  </div>

  {phase === "preview" ? (
    <>
      <div className="fs-modal-body">
        {/* ...all existing body content unchanged... */}
      </div>
      <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={onInputChange} />
      <div className="fs-modal-footer">
        {/* ...existing footer unchanged... */}
      </div>
    </>
  ) : (
    <>
      <div className="fs-modal-body" style={{ textAlign: "center", paddingTop: 8 }}>
        <div className="fs-modal-icon success" style={{ margin: "0 auto 10px" }}>
          <CheckCircle size={20} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          Import Complete
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>
          {resultData.imported} juror{resultData.imported !== 1 ? "s" : ""} added.
        </div>
        <div className="fs-impact">
          <div className="fs-impact-item">
            <div className="fs-impact-value" style={{ color: "var(--success)" }}>{resultData.imported}</div>
            <div className="fs-impact-label">Imported</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value" style={{ color: "var(--warning)" }}>{resultData.skipped}</div>
            <div className="fs-impact-label">Skipped</div>
          </div>
          <div className="fs-impact-item">
            <div className="fs-impact-value" style={{ color: "var(--danger)" }}>{resultData.failed}</div>
            <div className="fs-impact-label">Failed</div>
          </div>
        </div>
        {(resultData.skipped > 0 || resultData.failed > 0) && (
          <div className="fs-alert info" style={{ marginTop: 12, textAlign: "left" }}>
            <div className="fs-alert-icon"><Info size={15} /></div>
            <div className="fs-alert-body">
              <div className="fs-alert-title">What to do next</div>
              <div className="fs-alert-desc">
                Skipped rows already exist for this period. Fix any failed rows manually or re-import a corrected CSV.
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="fs-modal-footer" style={{ justifyContent: "center", borderTop: "none", background: "transparent", paddingTop: 0 }}>
        <button className="fs-btn fs-btn-primary" style={{ minWidth: 140 }} onClick={handleClose}>
          Done
        </button>
      </div>
    </>
  )}
</Modal>
```

- [ ] **Step 6: Build check**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/admin/modals/ImportJurorsModal.jsx
git commit -m "feat(import): add result screen to ImportJurorsModal"
```

---

## Task 5: Add phase + result screen to ImportCsvModal (Projects)

**Files:**
- Modify: `src/admin/modals/ImportCsvModal.jsx`

Exact same changes as Task 4 but with project-specific strings. Apply all the same steps:

- [ ] **Step 1: Add state (same as Task 4)**

```js
const [phase, setPhase]       = useState("preview");
const [resultData, setResult] = useState(null);
```

- [ ] **Step 2: Reset on close (same as Task 4)**

```js
const handleClose = () => {
  setFile(null); setRows([]); setStats({ valid: 0, duplicate: 0, error: 0, total: 0 });
  setDetected([]); setWarning(null); setImportError(""); setParsing(false); setImporting(false);
  setPhase("preview"); setResult(null);
  onClose();
};
```

- [ ] **Step 3: Update handleImport (same as Task 4)**

```js
const handleImport = async () => {
  setImporting(true);
  setImportError("");
  try {
    const result = await onImport?.(rows.filter((r) => r.status === "ok"));
    setResult({
      imported: result?.imported ?? validCount,
      skipped:  (result?.skipped ?? 0) + (stats.duplicate ?? 0),
      failed:   result?.failed ?? 0,
    });
    setPhase("result");
  } catch (e) {
    setImportError(e?.message || "Import failed.");
  } finally {
    setImporting(false);
  }
};
```

- [ ] **Step 4: Add lucide imports**

```js
// before
import { AlertCircle, AlertTriangle } from "lucide-react";

// after
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
```

- [ ] **Step 5: Add result screen markup** (same structure as Task 4, project-specific label)

Wrap existing body+footer in `phase === "preview"` branch, add result branch:

```jsx
{phase === "result" ? (
  <>
    <div className="fs-modal-body" style={{ textAlign: "center", paddingTop: 8 }}>
      <div className="fs-modal-icon success" style={{ margin: "0 auto 10px" }}>
        <CheckCircle size={20} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
        Import Complete
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>
        {resultData.imported} group{resultData.imported !== 1 ? "s" : ""} added.
      </div>
      <div className="fs-impact">
        <div className="fs-impact-item">
          <div className="fs-impact-value" style={{ color: "var(--success)" }}>{resultData.imported}</div>
          <div className="fs-impact-label">Imported</div>
        </div>
        <div className="fs-impact-item">
          <div className="fs-impact-value" style={{ color: "var(--warning)" }}>{resultData.skipped}</div>
          <div className="fs-impact-label">Skipped</div>
        </div>
        <div className="fs-impact-item">
          <div className="fs-impact-value" style={{ color: "var(--danger)" }}>{resultData.failed}</div>
          <div className="fs-impact-label">Failed</div>
        </div>
      </div>
      {(resultData.skipped > 0 || resultData.failed > 0) && (
        <div className="fs-alert info" style={{ marginTop: 12, textAlign: "left" }}>
          <div className="fs-alert-icon"><Info size={15} /></div>
          <div className="fs-alert-body">
            <div className="fs-alert-title">What to do next</div>
            <div className="fs-alert-desc">
              Skipped rows have duplicate group numbers. Fix any failed rows manually or re-import a corrected CSV.
            </div>
          </div>
        </div>
      )}
    </div>
    <div className="fs-modal-footer" style={{ justifyContent: "center", borderTop: "none", background: "transparent", paddingTop: 0 }}>
      <button className="fs-btn fs-btn-primary" style={{ minWidth: 140 }} onClick={handleClose}>
        Done
      </button>
    </div>
  </>
) : (
  <>
    <div className="fs-modal-body">
      {/* ...all existing body content unchanged... */}
    </div>
    <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={onInputChange} />
    <div className="fs-modal-footer">
      {/* ...existing footer unchanged... */}
    </div>
  </>
)}
```

- [ ] **Step 6: Build check**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/admin/modals/ImportCsvModal.jsx
git commit -m "feat(import): add result screen to ImportCsvModal"
```

---

## Task 6: Wire call sites — pages pass existing data and use result counts

**Files:**
- Modify: `src/admin/pages/JurorsPage.jsx:391-396`
- Modify: `src/admin/pages/ProjectsPage.jsx:212-218, 589`

- [ ] **Step 1: Update JurorsPage handleImport — remove toast, return result**

```js
// before (line 391)
async function handleImport(validRows) {
  const result = await jurorsHook.handleImportJurors(validRows);
  if (result?.ok !== false) {
    _toast.success(`Imported ${validRows.length - (result?.skipped || 0)} juror${validRows.length !== 1 ? "s" : ""}`);
  }
}

// after
async function handleImport(validRows) {
  const result = await jurorsHook.handleImportJurors(validRows);
  if (result?.ok === false && result?.formError) {
    throw new Error(result.formError);
  }
  return result;
}
```

The modal now shows the result screen instead of the toast. Remove the `_toast` call.

- [ ] **Step 2: Update ProjectsPage — pass existing projects + remove toast**

Change `parseFile` prop (line 589):

```jsx
// before
parseFile={parseProjectsCsv}

// after
parseFile={(f) => parseProjectsCsv(f, projects.projects)}
```

Change `handleImport` function (line 212):

```js
// before
async function handleImport(validRows) {
  cancelImportRef.current = false;
  const result = await projects.handleImportProjects(validRows, { cancelRef: cancelImportRef });
  if (result?.ok !== false) {
    _toast.success(`Imported ${validRows.length - (result?.skipped || 0)} project${validRows.length !== 1 ? "s" : ""}`);
  }
}

// after
async function handleImport(validRows) {
  cancelImportRef.current = false;
  const result = await projects.handleImportProjects(validRows, { cancelRef: cancelImportRef });
  if (result?.ok === false && result?.formError) {
    throw new Error(result.formError);
  }
  return result;
}
```

- [ ] **Step 3: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass including the new csvParser tests.

- [ ] **Step 4: Commit**

```bash
git add src/admin/pages/JurorsPage.jsx src/admin/pages/ProjectsPage.jsx
git commit -m "feat(import): wire result counts to modals, pass existing data for duplicate detection"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Juror `juryName` fallback in duplicate detection | Task 2 |
| `parseProjectsCsv(file, existingProjects)` signature | Task 2 |
| `existingGroupNos` set for project duplicate check | Task 2 |
| Projects warning message for duplicates | Task 2 |
| Hooks return `{ imported, skipped, failed }` | Task 3 |
| `phase` state in ImportJurorsModal | Task 4 |
| `phase` state in ImportCsvModal | Task 5 |
| Result screen markup — both modals | Tasks 4, 5 |
| JurorsPage passes result to modal, removes toast | Task 6 |
| ProjectsPage passes `projects.projects` to parseFile | Task 6 |
| ProjectsPage removes toast | Task 6 |

All spec sections covered. ✓

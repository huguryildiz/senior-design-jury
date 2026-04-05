# Import Modal Fix & Result Screen Design

**Date:** 2026-04-05
**Scope:** Jurors + Projects CSV import modals

---

## Problem Summary

Three bugs affecting both import flows:

1. **Projects duplicate detection missing** — `parseProjectsCsv` has no `existingProjects`
   param; `duplicate: 0` is hardcoded. Rows that already exist in the period show as
   "Valid" and get sent to the DB, which either rejects or silently overwrites them.

2. **Jurors duplicate detection broken** — `parseJurorsCsv` maps
   `existingJurors.map(j => normName(j.juror_name))` but the hook's juror objects can
   carry `juryName` (not `juror_name`) in some cases (see `useManageJurors.js` line 25).
   Result: all rows appear "Valid" even when the juror already exists.

3. **No post-import result screen** — `handleImport` closes the modal on success with no
   summary. The prototype (`modal-import-result`) shows Imported / Skipped / Failed
   counts plus a "What to do next" guidance banner.

---

## Approach: Phase transition inside existing modals

Add `phase: "preview" | "result"` state to both `ImportJurorsModal` and `ImportCsvModal`.
On successful import the modal stays open and transitions to the result screen — no new
modal component, no parent-level state coordination.

`onImport` callback return type changes from `void` to `{ imported, skipped, failed }`.

---

## Section 1 — CSV Parsing

### `parseJurorsCsv` fix

```js
// before
const existingNames = new Set(existingJurors.map((j) => normName(j.juror_name)));

// after
const existingNames = new Set(
  existingJurors.map((j) => normName(j.juror_name || j.juryName || ""))
);
```

### `parseProjectsCsv` new signature

```js
export async function parseProjectsCsv(file, existingProjects = [])
```

Inside the PapaParse callback, build a set of existing group numbers for the active
period and mark matching rows as `status: "skip"`, `statusLabel: "Duplicate"`:

```js
const existingGroupNos = new Set(
  existingProjects
    .map((p) => p.group_no)
    .filter((n) => n != null)
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n))
);

// inside forEach:
if (existingGroupNos.has(groupNo)) {
  status = "skip";
  statusLabel = "Duplicate";
  duplicate += 1;
}
```

---

## Section 2 — Call-site changes

### ProjectsPage

```jsx
// before
parseFile={parseProjectsCsv}

// after
parseFile={(f) => parseProjectsCsv(f, projects.projects)}
```

### JurorsPage — no change needed

`parseFile={(f) => parseJurorsCsv(f, jurorsHook.jurors)}` is already correct once the
field-name fallback is fixed in the parser.

---

## Section 3 — Hook return values

Both `handleImportJurors` and `handleImportProjects` currently return
`{ ok, formError? }`. Extend to also return counts:

```js
return { ok: true, imported: N, skipped: N, failed: N };
```

`imported` = rows successfully created, `skipped` = DB-level duplicates caught
(safety net) + CSV-level skips already filtered out, `failed` = rows that errored
for non-duplicate reasons.

For the modal's result screen, the modal itself tracks `validCount` (from CSV stats)
and `stats.duplicate` / `stats.error`. So for the result display:

- **Imported** = `validCount - failed`
- **Skipped** = `stats.duplicate` (CSV-level) + hook-returned skipped (DB-level)
- **Failed** = hook-returned failed

---

## Section 4 — Modal phase transition

### State additions (both modals)

```js
const [phase, setPhase]         = useState("preview"); // "preview" | "result"
const [resultData, setResult]   = useState(null);      // { imported, skipped, failed }
```

Reset on `handleClose`:

```js
setPhase("preview");
setResult(null);
```

### Import handler

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

### Result screen markup (phase === "result")

Replaces `fs-modal-body` content and `fs-modal-footer`:

```jsx
{/* Body */}
<div className="fs-modal-body" style={{ textAlign: "center", paddingTop: 8 }}>
  <div className="fs-modal-icon success">
    <CheckCircle size={22} />
  </div>
  <div className="fs-title" style={{ marginTop: 8 }}>Import Complete</div>
  <div className="fs-subtitle" style={{ marginTop: 4 }}>
    {resultData.imported} {itemLabel}s added.
  </div>
  <div className="fs-impact">
    <div className="fs-impact-item">
      <div className="fs-impact-value" style={{ color: "var(--success)" }}>
        {resultData.imported}
      </div>
      <div className="fs-impact-label">Imported</div>
    </div>
    <div className="fs-impact-item">
      <div className="fs-impact-value" style={{ color: "var(--warning)" }}>
        {resultData.skipped}
      </div>
      <div className="fs-impact-label">Skipped</div>
    </div>
    <div className="fs-impact-item">
      <div className="fs-impact-value" style={{ color: "var(--danger)" }}>
        {resultData.failed}
      </div>
      <div className="fs-impact-label">Failed</div>
    </div>
  </div>
  {(resultData.skipped > 0 || resultData.failed > 0) && (
    <div className="fs-alert info" style={{ marginTop: 12, textAlign: "left" }}>
      <Info size={15} />
      <div className="fs-alert-body">
        <div className="fs-alert-title">What to do next</div>
        <div className="fs-alert-desc">
          Skipped rows already exist for this period (or have duplicate group numbers).
          Fix any failed rows manually or re-import a corrected CSV.
        </div>
      </div>
    </div>
  )}
</div>

{/* Footer */}
<div className="fs-modal-footer" style={{ justifyContent: "center", borderTop: "none", background: "transparent" }}>
  <button className="fs-btn fs-btn-primary" style={{ minWidth: 140 }} onClick={handleClose}>
    Done
  </button>
</div>
```

`itemLabel` = `"juror"` in `ImportJurorsModal`, `"group"` in `ImportCsvModal`.

"What to do next" text:
- Jurors: "Skipped rows already exist for this period. Fix any failed rows manually or re-import a corrected CSV."
- Projects: "Skipped rows have duplicate group numbers. Fix any failed rows manually or re-import a corrected CSV."

Only shown when `skipped > 0 || failed > 0`.

---

## CSS requirements

`fs-impact` and `fs-impact-item`/`fs-impact-value`/`fs-impact-label` classes should
already exist in the shared stylesheet (used by the prototype). Verify before adding.
`fs-modal-icon success` also used in prototype.

---

## Files changed

| File | Change |
|---|---|
| `src/admin/utils/csvParser.js` | juror `juryName` fallback + `parseProjectsCsv(file, existingProjects)` |
| `src/admin/modals/ImportJurorsModal.jsx` | `phase` + result view |
| `src/admin/modals/ImportCsvModal.jsx` | `phase` + result view |
| `src/admin/pages/ProjectsPage.jsx` | pass `projects.projects` to `parseFile` |
| `src/admin/hooks/useManageProjects.js` | return `{ imported, skipped, failed }` |
| `src/admin/hooks/useManageJurors.js` | return `{ imported, skipped, failed }` |
| `src/admin/pages/JurorsPage.jsx` | update `handleImport` to pass result to modal |

---

## Out of scope

- Projects page does not currently pass `existingProjects` for group-number deduplication
  *during the period* — this design only deduplicates against the period's existing groups.
  Cross-period import deduplication is not needed.
- No changes to RPC signatures or DB schema.
- No changes to export flows.

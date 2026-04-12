# Audit Log Table Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the audit log table with day separator rows, a monospace event-code metadata line in the action column, and consistently prominent severity badges.

**Architecture:** Two new pure functions added to `auditUtils.js` (`formatEventMeta`, `addDaySeparators`); `AuditLogPage.jsx` table rendering updated to consume them; two CSS classes added to `audit-log.css`. No API, hook, or DB changes.

**Tech Stack:** React, plain CSS (`var()` tokens already defined), Vitest for tests.

---

## File Map

| File | Change |
|---|---|
| `src/admin/utils/auditUtils.js` | Add `formatEventMeta()` and `addDaySeparators()` |
| `src/admin/__tests__/auditUtils.test.js` | Add tests for both new functions |
| `src/admin/pages/AuditLogPage.jsx` | Use `addDaySeparators`; render day rows + event-code line |
| `src/styles/pages/audit-log.css` | Add `.audit-day-header` and `.audit-event-code` |

---

## Task 1: `formatEventMeta()` — tests first

**Files:**
- Modify: `src/admin/__tests__/auditUtils.test.js`
- Modify: `src/admin/utils/auditUtils.js`

- [ ] **Step 1: Add failing tests**

Append to `src/admin/__tests__/auditUtils.test.js` (after the last `describe` block):

```js
// ── formatEventMeta ──────────────────────────────────────────────────────────

import { formatEventMeta } from "../utils/auditUtils.js";

describe("formatEventMeta", () => {
  it("returns the action code when no extras apply", () => {
    const log = { action: "data.period.locked", details: {} };
    expect(formatEventMeta(log)).toBe("data.period.locked");
  });

  it("appends IP for auth events that have details.ip", () => {
    const log = {
      action: "auth.admin.login.success",
      details: { ip: "93.155.48.x", method: "password" },
    };
    expect(formatEventMeta(log)).toBe("auth.admin.login.success · 93.155.48.x");
  });

  it("appends × count and IP for auth failure with count in details", () => {
    const log = {
      action: "auth.admin.login.failure",
      details: { count: 5, ip: "77.246.182.x" },
    };
    expect(formatEventMeta(log)).toBe("auth.admin.login.failure × 5 · 77.246.182.x");
  });

  it("appends × bulkCount and within-N-min for bulk options", () => {
    const log = { action: "data.score.submitted", details: {} };
    expect(formatEventMeta(log, { bulkCount: 12, bulkSpanMs: 4 * 60 * 1000 }))
      .toBe("data.score.submitted × 12 · within 4 min");
  });

  it("appends format and rowCount for export events", () => {
    const log = {
      action: "security.export.scores",
      details: { format: "xlsx", rowCount: 540 },
    };
    expect(formatEventMeta(log)).toBe("security.export.scores · XLSX · 540 rows");
  });

  it("appends first diff summary for config events", () => {
    const log = {
      action: "config.criteria.updated",
      details: { changes: [{ key: "design", from: 30, to: 35 }] },
    };
    // formatDiffChips reads details.changes; first chip: key=design, from=30, to=35
    const result = formatEventMeta(log);
    expect(result).toBe("config.criteria.updated · design 30→35");
  });

  it("returns action code only when details is null", () => {
    const log = { action: "data.period.created", details: null };
    expect(formatEventMeta(log)).toBe("data.period.created");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/huguryildiz/Documents/GitHub/VERA
npm test -- --run --reporter=verbose src/admin/__tests__/auditUtils.test.js 2>&1 | tail -30
```

Expected: `formatEventMeta is not a function` / import errors.

- [ ] **Step 3: Implement `formatEventMeta` in auditUtils.js**

Add after the closing brace of `groupBulkEvents` (around line 1160), before `detectAnomalies`:

```js
// ── formatEventMeta ───────────────────────────────────────────
/**
 * Build the monospace second line shown below the action sentence in the
 * audit table. Always starts with the raw action code, then appends
 * contextual metadata (IP, bulk count, export format, first diff chip).
 *
 * @param {object} log  - Raw audit_logs row
 * @param {{ bulkCount?: number, bulkSpanMs?: number }} [opts]
 * @returns {string}    - Never null; always at least the action code
 */
export function formatEventMeta(log, opts = {}) {
  const action = String(log?.action || "");
  const d = log?.details || {};
  const { bulkCount, bulkSpanMs } = opts;

  // Bulk group: "action × N · within M min"
  if (bulkCount && bulkCount > 1) {
    const base = `${action} × ${bulkCount}`;
    if (bulkSpanMs) {
      const mins = Math.round(bulkSpanMs / 60_000);
      if (mins > 0) return `${base} · within ${mins} min`;
    }
    return base;
  }

  // Auth failure with count in details (anomaly-written events)
  if (action.includes("login.failure") && d.count && d.count > 1) {
    const base = `${action} × ${d.count}`;
    return d.ip ? `${base} · ${d.ip}` : base;
  }

  // Export events: "action · FORMAT · N rows"
  if (d.format) {
    const parts = [action, d.format.toUpperCase()];
    if (d.rowCount != null) parts.push(`${d.rowCount} rows`);
    return parts.join(" · ");
  }

  // Diff-bearing events: append first chip as "key from→to"
  const diffs = formatDiffChips(log);
  if (diffs.length > 0) {
    const first = diffs[0];
    const change = first.from != null && first.to != null
      ? `${first.key} ${first.from}→${first.to}`
      : first.key;
    return `${action} · ${change}`;
  }

  // Auth / generic: append IP if present
  if (d.ip) return `${action} · ${d.ip}`;

  return action;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run --reporter=verbose src/admin/__tests__/auditUtils.test.js 2>&1 | tail -20
```

Expected: all `formatEventMeta` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/utils/auditUtils.js src/admin/__tests__/auditUtils.test.js
git commit -m "feat(audit): add formatEventMeta helper for monospace event-code line"
```

---

## Task 2: `addDaySeparators()` — tests first

**Files:**
- Modify: `src/admin/__tests__/auditUtils.test.js`
- Modify: `src/admin/utils/auditUtils.js`

- [ ] **Step 1: Add failing tests**

Append to `src/admin/__tests__/auditUtils.test.js`:

```js
// ── addDaySeparators ─────────────────────────────────────────────────────────

import { addDaySeparators } from "../utils/auditUtils.js";

describe("addDaySeparators", () => {
  const makeLog = (isoDate) => ({ id: isoDate, created_at: isoDate, user_id: "u1", resource_type: "periods" });

  it("returns empty array for empty input", () => {
    expect(addDaySeparators([], [])).toEqual([]);
  });

  it("inserts a single day header before the first group", () => {
    const logs = [makeLog("2025-04-11T10:00:00Z")];
    const items = [{ type: "single", log: logs[0] }];
    const result = addDaySeparators(items, logs);
    expect(result[0].type).toBe("day");
    expect(result[1].type).toBe("single");
  });

  it("inserts a day header when the date changes between items", () => {
    const log1 = makeLog("2025-04-11T10:00:00Z");
    const log2 = makeLog("2025-04-10T10:00:00Z");
    const allLogs = [log1, log2];
    const items = [
      { type: "single", log: log1 },
      { type: "single", log: log2 },
    ];
    const result = addDaySeparators(items, allLogs);
    // Structure: [day(Apr11), single, day(Apr10), single]
    expect(result.length).toBe(4);
    expect(result[0].type).toBe("day");
    expect(result[2].type).toBe("day");
  });

  it("day header count equals total events on that date in allLogs", () => {
    const log1a = makeLog("2025-04-11T10:00:00Z");
    const log1b = makeLog("2025-04-11T11:00:00Z");
    const log2  = makeLog("2025-04-10T10:00:00Z");
    const allLogs = [log1a, log1b, log2];
    const items = [
      { type: "single", log: log1a },
      { type: "single", log: log1b },
      { type: "single", log: log2 },
    ];
    const result = addDaySeparators(items, allLogs);
    const dayApr11 = result.find((r) => r.type === "day" && r.label.includes("11"));
    expect(dayApr11.count).toBe(2);
  });

  it("uses representative.created_at for bulk items", () => {
    const rep = makeLog("2025-04-11T10:00:00Z");
    const items = [{ type: "bulk", count: 5, representative: rep, logs: [rep] }];
    const result = addDaySeparators(items, [rep]);
    expect(result[0].type).toBe("day");
    expect(result[1].type).toBe("bulk");
  });

  it("day label includes weekday and month name", () => {
    const log = makeLog("2025-04-11T10:00:00Z");
    const items = [{ type: "single", log }];
    const result = addDaySeparators(items, [log]);
    // 2025-04-11 is a Friday
    expect(result[0].label).toMatch(/friday/i);
    expect(result[0].label).toMatch(/april/i);
    expect(result[0].label).toMatch(/11/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run --reporter=verbose src/admin/__tests__/auditUtils.test.js 2>&1 | tail -20
```

Expected: `addDaySeparators is not a function`.

- [ ] **Step 3: Implement `addDaySeparators` in auditUtils.js**

Add immediately after `formatEventMeta` (before `detectAnomalies`):

```js
// ── addDaySeparators ──────────────────────────────────────────
/**
 * Insert `{ type: 'day', label, count }` sentinel items between groups
 * that belong to different calendar days. Uses UTC local-date strings
 * for comparison so timezone-shifted rows don't create phantom boundaries.
 *
 * @param {Array} items     - Output of groupBulkEvents()
 * @param {Array} allLogs   - Full sorted log array (for per-day counts)
 * @returns {Array}         - items with day separators interleaved
 */
export function addDaySeparators(items, allLogs) {
  if (!items.length) return [];

  // Pre-compute per-day counts from the full dataset
  const dayCounts = {};
  for (const log of allLogs) {
    const key = _localDateKey(log.created_at);
    if (key) dayCounts[key] = (dayCounts[key] || 0) + 1;
  }

  const result = [];
  let lastKey = null;

  for (const item of items) {
    const ts = item.type === "bulk"
      ? item.representative?.created_at
      : item.log?.created_at;
    const key = _localDateKey(ts);

    if (key && key !== lastKey) {
      result.push({
        type: "day",
        label: _formatDayLabel(ts),
        count: dayCounts[key] || 0,
      });
      lastKey = key;
    }
    result.push(item);
  }
  return result;
}

function _localDateKey(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  // Use local date parts so the separator matches what the user sees
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function _formatDayLabel(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run --reporter=verbose src/admin/__tests__/auditUtils.test.js 2>&1 | tail -20
```

Expected: all `addDaySeparators` tests PASS, all prior tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/utils/auditUtils.js src/admin/__tests__/auditUtils.test.js
git commit -m "feat(audit): add addDaySeparators helper for day-grouped table view"
```

---

## Task 3: CSS — two new classes

**Files:**
- Modify: `src/styles/pages/audit-log.css`

- [ ] **Step 1: Add classes at the end of the file**

```css
/* ── Day separator row ──────────────────────────────────────── */
.audit-day-header td {
  padding: 5px 16px;
  background: var(--surface-1);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-tertiary);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  pointer-events: none;
  user-select: none;
}
.dark-mode .audit-day-header td {
  background: var(--surface-2);
}

/* ── Event code / metadata second line ──────────────────────── */
.audit-event-code {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text-tertiary);
  margin-top: 3px;
  letter-spacing: -0.1px;
  line-height: 1.3;
}
```

- [ ] **Step 2: Verify build has no errors**

```bash
npm run build 2>&1 | tail -10
```

Expected: `built in` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/pages/audit-log.css
git commit -m "style(audit): add audit-day-header and audit-event-code CSS classes"
```

---

## Task 4: Wire up table rendering in AuditLogPage

**Files:**
- Modify: `src/admin/pages/AuditLogPage.jsx`

- [ ] **Step 1: Update the import line**

Find the existing import on line 16:

```js
import { getActorInfo, formatActionLabel, formatActionDetail, formatSentence, formatDiffChips, detectAnomalies, CATEGORY_META, SEVERITY_META, groupBulkEvents } from "../utils/auditUtils";
```

Replace with:

```js
import { getActorInfo, formatActionLabel, formatSentence, detectAnomalies, CATEGORY_META, SEVERITY_META, groupBulkEvents, formatEventMeta, addDaySeparators } from "../utils/auditUtils";
```

(Removes `formatActionDetail`, `formatDiffChips` — no longer needed in this file.)

- [ ] **Step 2: Update `pagedItems` derivation**

Find (around line 318):

```js
const pagedItems = useMemo(() => groupBulkEvents(pagedLogs), [pagedLogs]);
```

Replace with:

```js
const pagedItems = useMemo(
  () => addDaySeparators(groupBulkEvents(pagedLogs), sortedLogs),
  [pagedLogs, sortedLogs]
);
```

- [ ] **Step 3: Add day separator row rendering**

In the `pagedItems.map((item) => { ... })` block inside `<tbody>`, the very first case check is currently `if (item.type === "bulk")`. Add a new case BEFORE that:

```js
{pagedItems.map((item) => {
  // ── Day separator ──────────────────────────────────
  if (item.type === "day") {
    return (
      <tr key={`day-${item.label}`} className="audit-day-header">
        <td colSpan={4}>
          {item.label} — {item.count} event{item.count !== 1 ? "s" : ""}
        </td>
      </tr>
    );
  }
  // ... rest of existing cases unchanged
```

- [ ] **Step 4: Update bulk row — add event-code line, remove old bulk label**

In the bulk case (currently renders `<span className="audit-bulk-label">{item.count}× {formatActionLabel(log.action)}</span>`), update the action `<td>`:

```jsx
<td data-label="Action">
  <div className="audit-action-row">
    <span className="audit-action-main">
      {item.count}× {formatActionLabel(log.action)}
    </span>
  </div>
  <div className="audit-event-code">
    {(() => {
      const ts0 = item.logs?.[0]?.created_at ? Date.parse(item.logs[0].created_at) : 0;
      const tsN = item.logs?.[item.logs.length - 1]?.created_at
        ? Date.parse(item.logs[item.logs.length - 1].created_at) : 0;
      const spanMs = Math.abs(ts0 - tsN);
      return formatEventMeta(log, { bulkCount: item.count, bulkSpanMs: spanMs });
    })()}
  </div>
</td>
```

- [ ] **Step 5: Update single row — replace diff chips + detail with event-code line**

In the single row case, find the action `<td>` block (currently lines ~706–735). Replace the entire `<td>` contents with:

```jsx
<td data-label="Action">
  <div className="audit-action-row">
    <span className={`audit-action-main${isAuditStaleRefresh ? " opacity-40" : ""}`}>
      {sentence.verb}
      {sentence.resource && (
        <> <span className="audit-action-resource">{sentence.resource}</span></>
      )}
    </span>
    {showSevPill && (
      <span className={`audit-sev-pill audit-sev-${log.severity}`}>
        {SEVERITY_META[log.severity].label}
      </span>
    )}
  </div>
  <div className="audit-event-code">{formatEventMeta(log)}</div>
</td>
```

- [ ] **Step 6: Start dev server and verify visually**

```bash
npm run dev
```

Navigate to `http://localhost:5173/admin/audit-log`. Verify:
- Day separator rows appear between date boundaries (gray background, uppercase label + event count)
- Every row shows a monospace grey second line with the action code
- Auth rows: action code + IP address appended
- Export rows: action code + FORMAT + row count
- Config rows with criteria changes: action code + `field from→to`
- Bulk rows: action code + `× N · within M min`
- HIGH / MED severity pills visible right-aligned in action cell
- Dark mode: separator and code line remain readable
- No JS errors in browser console

- [ ] **Step 7: Run full test suite**

```bash
npm test -- --run 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/admin/pages/AuditLogPage.jsx
git commit -m "feat(audit): day separators + event-code metadata line in table"
```

---

## Self-Review

**Spec coverage:**
- ✅ Day separator rows → Task 2 (`addDaySeparators`) + Task 4 Step 3
- ✅ Action column 2nd line (event code + metadata) → Task 1 (`formatEventMeta`) + Task 4 Steps 4-5
- ✅ Severity badges consistent → Task 4 Step 5 (kept in action row, unchanged `showSevPill` logic)
- ✅ Mobile unchanged → no `.amc` changes in any task

**Placeholder scan:** None found.

**Type consistency:**
- `formatEventMeta(log, opts?)` defined in Task 1, called in Task 4 Steps 4 and 5 with matching signatures
- `addDaySeparators(items, allLogs)` defined in Task 2, called in Task 4 Step 2 with matching signature
- `item.type === 'day'` shape `{ type, label, count }` defined in Task 2 implementation, consumed in Task 4 Step 3 with same property names
- `item.logs` array accessed in Task 4 Step 4 — consistent with `groupBulkEvents` output shape `{ type:"bulk", logs, count, representative }`

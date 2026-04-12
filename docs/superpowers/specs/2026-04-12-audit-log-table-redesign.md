# Audit Log Table Redesign — Design Spec

**Date:** 2026-04-12  
**Scope:** B + Severity — Action column enrichment, day separator rows, prominent severity badges  
**Reference:** `docs/mockups/audit-log-v2-desktop-mobile.html`

---

## Context

The current audit log table shows minimal information per row: a type chip, actor name, and a single-line action sentence. Admins cannot quickly scan *what happened*, *on which day*, or *how severe* an event was without clicking into the detail drawer. The mockup defines a richer row format that surfaces this information inline.

---

## What Changes

### 1. Day Separator Rows

Between rows that belong to different calendar days, insert a full-width separator row:

```
FRIDAY, APRIL 11 — 47 EVENTS
```

- Format: `{WEEKDAY}, {MONTH} {DD} — {N} events` (uppercase, tertiary color, subtle background)
- Event count = number of events on that day in `sortedLogs` (full dataset, not just current page)
- Implemented as a second-pass over `pagedItems` after `groupBulkEvents()`

### 2. Action Column — 2nd Line (Event Code + Metadata)

Below the existing action sentence, add a monospace secondary line:

| Event type | Format |
|---|---|
| Auth success | `auth.admin.login.success · 93.155.48.x` |
| Auth failure | `auth.admin.login.failure × 5 · 77.246.182.x` |
| Bulk scores | `data.score.submitted × 12 · within 4 min` |
| Config change | `config.criteria.updated · design 30→35%` |
| Export | `security.export.scores · XLSX · 540 rows` |
| Generic | `{action}` only |

New helper: `formatEventMeta(log, bulkCount?)` in `auditUtils.js`  
- Reads `log.action`, `log.details.ip`, `log.details.format`, `log.details.row_count`, diff summary
- Returns a string or null (null → no 2nd line rendered)

### 3. Severity Badges — Consistent Visibility

Currently severity pills only show for `medium` / `high` / `critical`. Keep that rule but:
- Position: right-aligned at the end of the action cell (already `.audit-action-row` flex row)
- Existing `.audit-sev-pill` styles are sufficient; no new CSS classes needed here
- `info` and `low` → no badge (unchanged)

---

## Data Flow

```
sortedLogs
  → groupBulkEvents(pagedLogs)   [existing — bulk grouping]
  → addDaySeparators(items, sortedLogs)  [new — inserts day headers]
  → displayItems                 [rendered in table]
```

`displayItems` item shapes:
- `{ type: 'day', label: 'Friday, April 11', count: 47 }`
- `{ type: 'bulk', count: 12, representative: log }`
- `{ type: 'single', log }`

---

## Files

| File | Change |
|---|---|
| `src/admin/utils/auditUtils.js` | Add `formatEventMeta()` + `addDaySeparators()` |
| `src/admin/pages/AuditLogPage.jsx` | Use `addDaySeparators`, render day rows, render event meta line |
| `src/styles/pages/audit-log.css` | Add `.audit-day-header` row styles + `.audit-event-code` monospace line |

No new components. No hook changes. No API changes.

---

## CSS — New Classes

```css
/* Day separator row */
.audit-day-header td {
  padding: 6px 16px;
  background: var(--surface-1);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-tertiary);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

/* Event code / metadata line */
.audit-event-code {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text-tertiary);
  margin-top: 3px;
  letter-spacing: -0.1px;
}
```

---

## Verification

1. `npm run dev` → navigate to `/admin/audit-log`
2. Day headers appear between date boundaries; count matches visible events on that day
3. Every row shows monospace event code line; auth rows show IP; bulk rows show count+time; export rows show format+rows
4. HIGH/MED/CRITICAL pills visible and right-aligned in action cell
5. `info` / `low` rows: no badge rendered
6. Dark mode: day header and event code line readable
7. Mobile card view: unchanged (event meta line not added to mobile cards in this scope)
8. `npm test -- --run`: existing audit utils tests pass

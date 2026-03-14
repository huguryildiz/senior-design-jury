# TEDU Capstone Portal — Audit Planning Report (v3)

**Based on:** audit_report-2026-03-14-v2.md
**Date:** 2026-03-15
**Type:** Action planning — extracted from [UĞUR] comments in v2 + technical review

---

## SECTION 1 — Summary of [UĞUR] Comments

The v2 audit was reviewed and annotated. Most [UĞUR] comments confirmed that recently implemented items were correctly verified (PinStep Show/Hide, save-error retry, MÜDEK badges, accordion, import loading, date shortcuts, ARIA on ScoreGrid, etc.). These require no further action.

Actionable concerns extracted:

| Ref | Comment Summary | Type |
|-----|-----------------|------|
| **SEC-1** | Admin RPC'lere ek bir server-side secret doğrulaması eklenmeli. Yetkisiz doğrudan DB çağrılarına karşı katman gerekiyor. | Code change (DB migration) |
| **R1** | `EvalStep.jsx` 562 satır, tek fonksiyon. Bir sonraki fazda sub-component'lere ayrılmalı. | Code change |
| **R2** | CSV import sonrası başarı özeti eksik: "X adet eklendi, Y adet atlandı" mesajı yok. | Code change (Low effort) |
| **R4** | `ChartDataTable` `<details>` varsayılan kapalı. `prefers-reduced-motion` algılandığında otomatik açık gelmeli. | Code change (Minimal) |
| **R5** | `PinStep` kutularında her kutu için `aria-label` eksik ("Digit 1 of 4"). | Code change (Minimal) |

Technical review added three additional items:

- **B1:** `ScoreGrid` group column headers missing `scope="col"` — complements N3.
- **B2:** `ChartDataTable` should accept `defaultOpen` prop for testability and per-chart override.
- **B4:** Verify `ManagePermissionsPanel` has `isDirty` guard (v2 confirmed 3 panels; 4th unverified).

Low-severity issues carried forward from v2:

- **N2:** On first admin mount, `?tab=overview` is immediately pushed to history instead of replacing.
- **N3:** `ScoreGrid` juror-name cells lack `role="rowheader"`.

---

## SECTION 2 — Action Plan

### Critical

**SEC-1 — RPC Admin Secret Handshake**

*Context:* Admin RPCs currently accept an `admin_password` parameter as the sole auth mechanism. A direct Supabase REST call can bypass the frontend and invoke admin RPCs.

> **[REVIEW]:** The original plan proposed passing `import.meta.env.VITE_RPC_SECRET` from the frontend. This is **security theater** — all `VITE_` variables are compiled into the public JS bundle and are trivially extractable from DevTools or `strings bundle.js`. Sending a secret from the browser that anyone can read provides zero additional protection.

*Correct approach — DB-only secret, no frontend change:*

1. Set `app.rpc_secret` directly in Supabase Dashboard → Database → Configuration (or via SQL):
   ```sql
   ALTER DATABASE postgres SET app.rpc_secret = 'your-secret-value-here';
   ```
2. Inside each admin-gated RPC function in `sql/000_bootstrap.sql`, add at the top:
   ```sql
   IF current_setting('app.rpc_secret', true) IS DISTINCT FROM 'your-secret-value-here' THEN
     RAISE EXCEPTION 'unauthorized';
   END IF;
   ```
3. **No frontend change required.** The secret never leaves the database.

*Why this works:* `current_setting('app.rpc_secret')` is a Postgres server-side variable. It is never transmitted to the client, never visible in the bundle, and cannot be replicated by an attacker who only has the `anon` key.

*Files:* `sql/000_bootstrap.sql` only.
*Risk:* DB migration required. Must be deployed atomically. Test all admin RPCs after applying. If `current_setting` returns NULL (e.g., variable not set), the check fails closed — safe default.
*Caveat:* This is defence-in-depth. If Supabase RLS is correctly scoped, the incremental gain is moderate but meaningful for an academic tool that handles student evaluation data.

---

### Medium

**R1 — EvalStep.jsx Sub-component Decomposition**

*Context:* `EvalStep.jsx` is 562 lines with group navigation, score inputs, rubric panel, lock banner, and error handling all co-located.

*Plan:*
```
src/jury/
  EvalStep.jsx            ← orchestrator only (~150 lines)
  EvalHeader.jsx          ← sticky header: identity, nav buttons, progress bar
  ScoringGrid.jsx         ← criterion cards + score inputs + rubric expand
  GroupStatusPanel.jsx    ← synced banner, lock banner, save-error retry
```

> **[REVIEW]:** `EvalFooter` was the original name for the 4th component — renamed to `GroupStatusPanel.jsx` because these banners appear inline between the scoring grid and the submit button, not visually in a "footer." The name `GroupStatusPanel` better communicates its role.

> **[REVIEW]:** **`useCallback` memoization is required.** When `handleScore`, `handleScoreBlur`, `handleCommentChange`, `handleCommentBlur` are passed as props to `ScoringGrid`, they will be new function references on every parent render (e.g., typing a digit triggers `onChange` → parent re-render → all child props are new refs). Without `useCallback` in EvalStep or `React.memo` on ScoringGrid, 6 groups × 4 criterion inputs will re-render on every keystroke on mid-range mobile. Add `useCallback` to all handler functions before the decomposition PR is merged.

Rules:
- All state remains in `EvalStep.jsx`, passed as props.
- `useJuryState.js` is not touched.
- Existing `EvalStep.test.jsx` must pass without changes (tests render top-level `<EvalStep>`).
- Wrap `ScoringGrid` and `GroupStatusPanel` in `React.memo` or wrap handlers in `useCallback`.

*Files:* `src/jury/EvalStep.jsx` (and 3 new files)
*Effort:* Medium — cut-and-lift plus memoization pass.

---

**R2 — CSV Import Row-Count Summary**

*Context:* After a CSV import, the panel lists individual added group numbers rather than an aggregated count.

> **[REVIEW]:** Code inspection shows `ManageProjectsPanel.jsx` lines 516–566 already computes `toImport.length` (added count), `skippedExisting.length`, and `res?.skipped` (server skip count). All data is present. The fix is **not** "update `onImport` to return counts" — it already returns `res.skipped`. The actual change is reformatting the `successParts` string from listing IDs to showing a count. Effort is **Low**, not Medium as originally described.

*Corrected plan:*
- In `ManageProjectsPanel.jsx` and `ManageJurorsPanel.jsx`, replace the success message builder:
  - Current: `Added group_no: 1, 2, 3.`
  - Target: `Import complete: 3 added, 2 skipped.` (using `toImport.length` and `skippedExisting.length` already in scope)
- If `res.skipped > 0` (server-side skip), append to warning, not success.
- No change to `onImport` callback signature or `AdminPanel.jsx`.

*Files:* `src/admin/ManageProjectsPanel.jsx`, `src/admin/ManageJurorsPanel.jsx`
*Effort:* Low — ~5 lines each.

---

**B4 — Verify `ManagePermissionsPanel` isDirty Guard**

*Context:* The v2 report confirms `isDirty` guards on 3 panels. `ManagePermissionsPanel` is the 4th and controls eval lock — arguably the most sensitive operation.

*Plan:*
- Read `ManagePermissionsPanel.jsx` and confirm `isDirty` + `onDirtyChange` prop is wired.
- If missing, apply the same pattern as the other 3 panels.

*Files:* `src/admin/ManagePermissionsPanel.jsx`
*Effort:* Minimal if missing — same 10-line pattern as existing panels.

---

### Low / Accessibility Polish

**R4 — ChartDataTable Auto-Open for `prefers-reduced-motion`**

*Context:* The `<details>` wrapper hides the data table by default. Users with `prefers-reduced-motion` enabled should see it open automatically.

> **[REVIEW]:** Extend the component signature to accept a `defaultOpen` prop in addition to the `matchMedia` check. This makes it testable (pass `defaultOpen={true}` in tests without needing to mock `matchMedia`) and allows individual charts to force the table open when they have very few data points.

*Plan (in `src/charts/chartUtils.jsx`, `ChartDataTable` component):*
```jsx
export function ChartDataTable({ caption, headers, rows, defaultOpen }) {
  if (!rows || rows.length === 0) return null;
  const reducedMotion =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  const shouldOpen = defaultOpen ?? reducedMotion;
  return (
    <details className="chart-data-table-details" open={shouldOpen}>
      <summary className="chart-data-table-summary">Show data table</summary>
      ...
    </details>
  );
}
```

*Note:* JSDOM guard (`typeof window.matchMedia === "function"`) matches the pattern already used in `DoneStep.jsx`.

*Files:* `src/charts/chartUtils.jsx`
*Effort:* Minimal — 5-line change.

---

**R5 — PinStep Per-Box `aria-label` + Group Container**

*Context:* PinStep's 4 input boxes have no positional labels. Screen readers announce the input type but not which digit position the user is in.

> **[REVIEW]:** Each input already has `name="{inputId}-pin-{i}"` (a machine-generated ID like `:r1:-pin-0`) — meaningless to AT users. Adding `aria-label` overrides this for all screen readers correctly. Additionally: the `<div className="pin-boxes-row">` container has no group semantics. A screen reader user entering the form has no announcement that they're entering a "4-digit PIN". Add `role="group"` + `aria-label="4-digit PIN"` to the row container, in addition to per-box labels.

*Plan (in `src/jury/PinStep.jsx`):*
```jsx
// On the container div:
<div className="pin-boxes-row" role="group" aria-label="4-digit PIN">
  {digits.map((d, i) => (
    <input
      ...
      aria-label={`Digit ${i + 1} of 4`}
    />
  ))}
</div>
```

*Files:* `src/jury/PinStep.jsx`
*Effort:* Minimal — 2-line change.

---

**N3 + B1 — ScoreGrid `role="rowheader"` and `scope="col"`**

*Context:* Two related ARIA gaps in the score grid:
1. Juror-name cells (`<td className="matrix-juror">`) have no `role="rowheader"`.
2. Group column headers (`<th>`) have no `scope="col"`.

Both are needed to complete the semantic grid model so screen readers can announce "Group 3 — Juror Smith — scored 80."

*Plan (in `src/admin/ScoreGrid.jsx`):*
```jsx
// Juror name cell (tbody):
<td className="matrix-juror" role="rowheader" scope="row">

// Group column header (thead th elements for each group):
<th ... scope="col">
```

*Files:* `src/admin/ScoreGrid.jsx`
*Effort:* Minimal — 2 lines.

---

**N2 — First-Mount URL Replacement**

*Context:* On first load with a clean URL, the tab-sync `useEffect` pushes `?tab=overview` immediately, consuming a Back button press.

> **[REVIEW]:** The fix is straightforward: gate the first sync with a `hasInitialPush` ref. First render → `replaceState` (no new history entry). Subsequent changes → `pushState` as before.

*Plan (in `src/AdminPanel.jsx`):*
```jsx
const hasInitialPush = useRef(false);

useEffect(() => {
  // ... existing URL comparison logic ...
  if (currentTab !== adminTab || ...) {
    const nextParams = new URLSearchParams();
    nextParams.set("tab", adminTab);
    if (adminTab === "scores") nextParams.set("view", scoresView || "rankings");
    const method = hasInitialPush.current ? "pushState" : "replaceState";
    window.history[method](null, "", "?" + nextParams.toString());
    hasInitialPush.current = true;
  }
}, [adminTab, scoresView]);
```

*Files:* `src/AdminPanel.jsx`
*Effort:* Minimal — 4-line change.

---

## SECTION 3 — Expected Score Improvement

Scores use the same rubric: Func / UI / UX / Mobile / Perf / A11y / Code / Prod.

| Section | v2 Avg | Expected v3 Avg | Primary driver | Adjustment vs original plan |
|---------|--------|-----------------|----------------|-----------------------------|
| **Settings** | 6.4 | **6.5** (+0.1) | R2: formatting tweak on import message; UX improvement is minor | ↓ from 6.6 — R2 is cosmetic |
| **Rankings** | 7.0 | 7.0 (=) | No change in scope | = |
| **Analytics** | 6.8 | **6.95** (+0.15) | R4 + B2: A11y 6→6.5; `defaultOpen` prop adds testability | ↓ from 7.0 — A11y gain is partial for internal tool |
| **Score Grid** | 7.0 | **7.2** (+0.2) | N3 + B1 together: rowheader + scope="col" complete the ARIA model | ↑ from 7.1 — both fixes applied |
| **Details** | 6.5 | 6.5 (=) | No new items in scope | = |
| **Overview** | 7.5 | 7.5 (=) | No new items in scope | = |
| **EvalStep** | 6.6 | **7.0** (+0.4) | R1: Code 5→7; conservative — Perf risk if `useCallback` missed | ↓ from 7.2 — memoization risk added |
| **PinStep** | 8.0 | **8.2** (+0.2) | R5 + group container: per-box label + role="group" complete the A11y story | ↑ from 8.1 |
| **Security (admin)** | — | **+0.5 on Prod** (if DB-only) or **+0.0** (if VITE_ approach) | SEC-1 DB-only: meaningful defence-in-depth | ↑ corrected upward for proper implementation |

> **Note:** Score improvements are quality/polish — no functional changes. Func/UI/Mobile/Perf unchanged across all sections.

---

## SECTION 4 — Remaining Technical Debt (Accepted Tradeoffs)

| Item | Reason |
|------|--------|
| Prop drilling in `AdminPanel` | Shallow tree; no productivity impact at current scale. |
| 4-digit juror PIN | Familiarity trade-off; DB rate limiting is the primary defence. |
| No Supabase query caching | Fresh data on evaluation day matters more than cache hit rate. |
| Admin password via `useRef` / RPC | Stateless auth is acceptable for a 2-3 day/year internal tool. SEC-1 adds a DB-side layer without changing this. |
| No Web Worker for XLSX export | Data volumes are small; `isExporting` guard sufficient. |

---

## SECTION 5 — Manual Re-test Plan (v3 QA Checklist)

### Per-item checks

**SEC-1**
- [ ] All admin operations work after DB config is set (add juror, delete semester, lock/unlock, full export).
- [ ] Direct Supabase REST call to an admin RPC without the correct DB config → rejected (test via Supabase Studio SQL editor by temporarily unsetting `app.rpc_secret`).
- [ ] No frontend bundle change needed — confirm via `npm run build` diff.

**B4 (ManagePermissionsPanel isDirty)**
- [ ] Change a permission setting, navigate away without saving → confirm dialog.
- [ ] Save the setting, navigate away → no dialog.

**R1 (EvalStep decomposition)**
- [ ] `npx vitest run` — 189/189 pass.
- [ ] Mobile: open EvalStep, type a score → verify no visible lag (memoization check).
- [ ] Verify sticky header scrolls correctly after split.
- [ ] Lock banner and save-error banner appear in their respective states.

**R2 (CSV import summary)**
- [ ] Import 3 valid + 2 duplicate rows → success message: "Import complete: 3 added, 2 skipped."
- [ ] Import empty CSV → no crash.

**R4 + B2 (ChartDataTable)**
- [ ] DevTools → Rendering → prefers-reduced-motion: reduce → Analytics tab: `<details>` open by default.
- [ ] Normal mode: `<details>` collapsed.
- [ ] `npx vitest run` — no `matchMedia` errors.

**R5 (PinStep ARIA)**
- [ ] VoiceOver: navigate to PIN screen → group announced as "4-digit PIN"; each box as "Digit N of 4".
- [ ] Show/Hide toggle still functions correctly.

**N2 (first-mount URL)**
- [ ] Load admin panel at `/` → address bar shows `?tab=overview` (replaced, not pushed).
- [ ] Press Back once → returns to previous page, not to clean `/`.

**N3 + B1 (ScoreGrid ARIA)**
- [ ] Keyboard: tab into grid → juror name announced as row header.
- [ ] Column headers announced with column context.

### Regression checks (carry forward)
- [ ] Browser back/forward in admin panel
- [ ] Juror flow end-to-end (EvalStep decomposition)
- [ ] XLSX export from Rankings
- [ ] Admin panel on mobile (≤ 480px): single-open accordion

---

## Implementation Priority Order

1. **R5 + B1 + N3** — All minimal 1–2 line fixes, zero risk. Do in a single commit.
2. **N2** — 4-line fix in `AdminPanel.jsx`.
3. **R4 + B2** — `chartUtils.jsx` `defaultOpen` + `matchMedia` guard. Single file.
4. **B4** — Verify + patch `ManagePermissionsPanel` if needed.
5. **R2** — Reformat import success message. ~5 lines per panel.
6. **R1** — Dedicated session: decompose EvalStep, add `useCallback`, run full test suite.
7. **SEC-1** — Coordinate DB migration separately; no frontend change needed.

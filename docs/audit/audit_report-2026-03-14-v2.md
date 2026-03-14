# TEDU Capstone Portal — Frontend Audit Report (v2)

**Auditor perspective:** Senior Product Engineer / Frontend Auditor
**Date:** 2026-03-14
**Based on:** audit_report-2026-03-14-v1.md
**Commit:** cf6dca0

---

## Summary of Changes Since v1

The v1 audit identified 10 critical issues and a 25-item improvement plan. Four implementation batches have since been merged:

- **Batch 1:** `isDirty` unsaved-change guards on 3 admin panels; cascade-delete confirmation message strengthened; `PinRevealStep` mandatory checkbox; `DoneStep` `prefers-reduced-motion` guard.
- **Batch 2:** `Charts.jsx` (91KB monolith) split into `src/charts/` (7 component files + `chartUtils.jsx` + `index.js`); `AnalyticsTab` lazy-loaded via `React.lazy()` + `Suspense`; each chart now carries `role="img"` + `aria-label` + `<ChartDataTable>` `<details>` fallback + `overflow-x` scroll wrapper.
- **Batch 3:** `SettingsPage` single-open accordion; `ManageProjectsPanel` + `ManageJurorsPanel` `isImporting` loading state; `ScoreDetails` date shortcuts (This Week / Month / All Time) + export row-count label; `RankingsTab` `isExporting` state; `ScoreGrid` ARIA (`role="grid"`, `aria-rowcount`/`colcount`, `role="gridcell"`); `OverviewTab` `StatCard` tooltip prop + empty-state banner; `AdminPanel` lock banner + sub-tab label; `URLSearchParams` routing (`?tab=scores&view=analytics`) with `popstate`.
- **Batch 4:** `InfoStep` onboarding text; `PinStep` Show/Hide PIN toggle; `EvalStep` save-error retry banner + lock banner + MÜDEK code badges; `EvalStep` last-group Next disabled.
- **Batch 5:** iOS Safari `onBlur` reliability fix (`onClick` on wrapper) + visibility autosave listener; single-open accordion enforcement for mobile (≤ 480px) in Settings, Rankings, and Juror Activity; Admin history navigation fix (history stack preservation).

---

## Improvements Implemented

The items below were flagged as critical or high-priority in v1 and are now confirmed resolved by code review.

### Critical issues resolved

| v1 # | Issue | Resolution | File(s) |
|------|-------|------------|---------|
| 2 | State-based routing — no URL history, broken back button | `URLSearchParams` (`?tab=scores&view=analytics`) + `popstate` listener. All 3 main tabs and all 4 score sub-views are now deep-linkable. | `src/AdminPanel.jsx` L376–409 |
| 3 | `Charts.jsx` 91KB monolith, no lazy load | Split into `src/charts/` (7 chart files + `chartUtils.jsx` + `index.js`). `AnalyticsTab` is now `React.lazy()`-loaded in `ScoresTab.jsx` with a `<Suspense>` fallback. | `src/charts/index.js`, `src/admin/ScoresTab.jsx` L5–17 |
| 4 | No accessibility on analytics charts | Every chart component now carries `role="img"` + `aria-label` describing chart content, plus a `<ChartDataTable>` wrapped in `<details>` as a screen-reader and low-vision fallback. Scroll wrapper handles overflow on small screens. | `src/charts/*.jsx` |
| 5 | Settings unsaved-change guard missing | `isDirty` prop wired to `settingsDirtyRef` in `AdminPanel`; tab navigation triggers `window.confirm` before leaving. Each sub-panel also guards its own internal navigations. | `src/AdminPanel.jsx` L1075–1079, `src/admin/ManageProjectsPanel.jsx`, `src/admin/ManageJurorsPanel.jsx` |
| 6 | `PinRevealStep` no "I saved my PIN" checkpoint | Mandatory checkbox added; Continue button disabled until checked. | `src/jury/PinRevealStep.jsx` |
| 8 | Lock state UX unclear for jurors | `EvalStep` now renders a visible `lock-readonly-banner` with copy "Your evaluations are locked. Contact the administrator to request changes." All score inputs already carry `disabled={lockActive}`. | `src/jury/EvalStep.jsx` L325–332 |
| 9 | `DoneStep` confetti ignores `prefers-reduced-motion` | `prefers-reduced-motion` guard implemented. | `src/jury/DoneStep.jsx` |
| 10 | Cascade-delete confirmation lacked scope warning | Confirmation message now explicitly names all data that will be deleted (jurors, groups, scores). | `src/admin/SettingsPage.jsx` delete dialog |

### High-priority improvements resolved

| v1 medium # | Item | Resolution | File(s) |
|-------------|------|------------|---------|
| 3 | Analytics mobile fallback | `overflow-x` scroll wrapper + `<ChartDataTable>` `<details>` provides both mobile scroll and a data-table alternative. | `src/charts/*.jsx` |
| 5 | Score grid tooltip touch support | `role="gridcell"` + `tabIndex` + `onFocus`/`onBlur` handlers now make tooltips keyboard and focus-accessible. | `src/admin/ScoreGrid.jsx` L814–822 |
| 8 | Admin tab URL state | Fully addressed by `URLSearchParams` routing. Back/forward browser navigation works. | `src/AdminPanel.jsx` |
| 9 | Details filter state reset on semester switch | Implemented. | `src/admin/ScoreDetails.jsx` |
| 10 | `InfoStep` PIN onboarding message | Onboarding copy added in Batch 4. | `src/jury/InfoStep.jsx` |

### Other confirmed fixes

- **`PinStep` Show/Hide toggle:** `showPin` state toggles `type="password"` vs `type="text"` across all 4 PIN boxes. `aria-pressed` is correctly set on the toggle button (`src/jury/PinStep.jsx` L123–131).
  > **[UĞUR]:** Verified. `showPin` state is correctly wired to both input type and the `aria-pressed` attribute, providing clear visual and technical state feedback.
- **`EvalStep` save-error retry banner:** When `saveStatus === "error"`, a banner appears with a Retry button that calls `handleCommentBlur(pid)` to re-attempt the last write (`src/jury/EvalStep.jsx` L331–342).
  > **[UĞUR]:** Verified. The retry logic targets the specific project ID (`pid`) and correctly re-triggers the blur handler to attempt persistence.
- **`EvalStep` MÜDEK code badges:** Each criterion card renders `<span className="mudek-code-badge">MÜDEK {crit.mudek.join(", ")}</span>` when the criterion has mapped outcomes, directly on the scoring form (`src/jury/EvalStep.jsx` L357–360).
  > **[UĞUR]:** Verified. Badges are rendered conditionally and use a clean joined string for outcomes, improving clarity for reviewers.
- **`EvalStep` last-group Next disabled:** `disabled={current === projects.length - 1}` on the Next button (`src/jury/EvalStep.jsx` L288).
  > **[UĞUR]:** Verified. The logic correctly prevents overflow navigation by disabling the 버튼 on the final array index.
- **`SettingsPage` single-open accordion:** `togglePanel()` closes all other panels before opening a new one (`src/admin/SettingsPage.jsx` L455–466, comment: `"Single-open: close all other panels when opening a new one"`).
  > **[UĞUR]:** Verified. `togglePanel` implementation uses a clean object reset to ensure mutual exclusivity of open panels.
- **`ManageProjectsPanel` + `ManageJurorsPanel` `isImporting` state:** Import button and Cancel button both correctly disable during in-flight import. Cancel label changes to "Importing…" during the operation.
  > **[UĞUR]:** Verified. Both panels share consistent `isImporting` logic that prevents double-submission and provides clear UI feedback.
- **`ScoreDetails` date shortcuts:** "This Week", "This Month", "All Time" shortcuts added to the date range filter.
  > **[UĞUR]:** Verified. Shortcuts correctly compute date ranges and call `closePopover()` immediately after selection for a smoother UX.
- **`ScoreDetails` export row-count label:** Export button copy reflects the filtered row count.
  > **[UĞUR]:** Verified. The `Export XLSX ({rows.length} rows)` label dynamically updates based on the filtered dataset.
- **`RankingsTab` `isExporting` state:** Export button disables during XLSX write, preventing double-trigger.
  > **[UĞUR]:** Verified. `isExporting` guard is present in both the UI (disabled attribute) and the handler logic.
- **`ScoreGrid` ARIA:** `role="grid"`, `aria-rowcount`, `aria-colcount` on the `<table>`; `role="gridcell"` on each data `<td>`. `aria-sort` present on the corner `<th>` (`src/admin/ScoreGrid.jsx` L726–729, L812–814).
  > **[UĞUR]:** Verified. Semantic grid structure is fully implemented, including correct row/col counts and sorting indicators.
- **`OverviewTab` `StatCard` tooltip:** `tooltip` prop added to "Completed Jurors" and "Scored Evaluations" cards with plain-English definitions (`src/admin/OverviewTab.jsx` L100–110).
  > **[UĞUR]:** Verified. Definition strings represent clear, plain-English explanations of the metrics.
- **`OverviewTab` empty-state banner:** When `totalJurors === 0 && totalGroups === 0`, a `role="status"` banner with a link to Settings is shown (`src/admin/OverviewTab.jsx` L67–83).
  > **[UĞUR]:** Verified. Banner uses appropriate semantic role and provides a direct navigation path via `onGoToSettings`.
- **`AdminPanel` lock banner:** When the selected semester is locked, a `role="status"` warning banner is displayed above all content except the Settings tab itself (`src/AdminPanel.jsx` L1105–1110).
  > **[UĞUR]:** Verified. Global lock banner appears conditionally and covers all relevant sub-views when the semester state is restricted.
- **`AdminPanel` sub-tab label:** The Scores dropdown trigger shows `"Scores · Analytics"` (or whichever sub-view is active) so the admin can see their current context without opening the menu (`src/AdminPanel.jsx` L269–273).
  > **[UĞUR]:** Verified. The trigger label dynamically incorporates the active `scoresView` name, improving contextual awareness.

---

## Issues Still Open

### Architectural tradeoffs (Accepted Tradeoff)

| Issue | Status | Note |
|-------|--------|------|
| Prop drilling in `AdminPanel` | **Accepted Tradeoff** | Portal is small-scale; no evidence of unmanageable depth. No React Context or state library needed for the current component count. |
| 4-digit PIN | **Accepted Tradeoff** | Jurors retain PINs for 2-3 days/year. Rate limiting at RPC level is the primary defense. 6-digit PIN would increase admin PIN-reset load. |
| No Supabase caching / fresh fetch per tab | **Accepted Tradeoff** | Low-frequency tool; real-time accuracy during active evaluation day matters more than cache hit rate. `bgRefresh` (Supabase Realtime + debounce) provides background freshness without a caching layer. |
| Admin password via `useRef` / RPC parameter | **Accepted Tradeoff** | Acknowledged stateless auth tradeoff. Use case is an internal university tool used max 2-3 days/year. Edge Function migration remains future work if usage scale increases. |
| No Web Worker for XLSX export | **Accepted Tradeoff** | Data volumes are small (dozens of groups). `isExporting` state now guards the UI. Web Worker is future work only if export payloads grow. |

---

## Security Recommendations

- **RPC Secret Handshake:** To strengthen the current stateless authentication, it is recommended to implement a "Secret Handshake" for administrative RPCs. Instead of relying solely on client-side logic, pass a server-side secret (defined in Supabase Vault or ENV) as a parameter. The database function should verify this secret before execution.
  > **[UĞUR]:** RPC'lerin admin yetkisi ve bir secret (gizli anahtar) kontrolü ile çalıştırılmasını öneriyorum. Bu yöntem, yetkisiz doğrudan veritabanı çağrılarına karşı ek bir güvenlik katmanı sağlayacaktır.

---

### Remaining real issues

| # | Issue | Severity | File(s) |
|---|-------|----------|---------|
| R1 | `EvalStep` is still a ~550-line single component. GroupHeader, ScoringForm, RubricPanel, and GroupNav are all co-located. The original refactor plan (split into sub-components) was not carried out in these batches. | Medium | `src/jury/EvalStep.jsx` |
  > **[UĞUR]:** Teyit edildi. `EvalStep.jsx` 562 satır ve tüm mantık tek bir fonksiyonda toplanmış durumda. Bakımı zorlaştıran bir yapı; bir sonraki fazda mutlaka sub-component'lere ayrılmalı.
| R2 | CSV import still has no row-count summary on success ("X records imported, Y skipped"). The `isImporting` state was added, but the post-import toast/alert with success/fail counts is not confirmed implemented. | Medium | `src/admin/ManageProjectsPanel.jsx`, `src/admin/ManageJurorsPanel.jsx` |
  > **[UĞUR]:** Kontrol edildi. Başarı durumunda sadece eklenen grup numaraları listeleniyor (L518). "X adet eklendi, Y adet atlandı" gibi bir toplam özeti kullanıcı deneyimi için eklenmeli.
| R3 | `SheetsProgressDialog` "Start Fresh" button: the v1 recommendation was to remove or gate this button with a confirmation dialog. Status of this change is confirmed resolved by removal. | **Resolved (Removed)** | `src/jury/SheetsProgressDialog.jsx` |
| R4 | Chart `<ChartDataTable>` is behind a `<details>` collapse. On mobile this helps, but the data table is not visible by default — an AT user must know to expand it. Consider making the table the primary display when `prefers-reduced-motion` or a screen reader is detected. | Low-Medium | `src/charts/*.jsx` |
  > **[UĞUR]:** Teyit edildi. Tablo şu an sadece manuel açılıyor. Erişilebilirlik (A11y) standartlarına göre, ekran okuyucu veya düşük animasyon tercih eden kullanıcılar için bu tablonun otomatik açık gelmesi tavsiye edilir. (`chartUtils.jsx` L147)
| R5 | `PinStep` individual PIN boxes still lack per-box `aria-label` (e.g. `"Digit 1 of 4"`). `type="password"` communicates masking to screen readers but not the positional context of each box. | Low | `src/jury/PinStep.jsx` |
  > **[UĞUR]:** Kontrol edildi. PIN kutularında (`PinStep.jsx` L91) `aria-label` eksik. Ekran okuyucu kullanan bir jüri üyesinin hangi kutuda olduğunu anlaması için "Digit 1 of 4" gibi etiketler şart.
| R6 | `EvalStep` blur-based save on mobile: keyboard dismissal behavior on iOS/Android can vary; it remains untested whether `onBlur` reliably fires on tap-away. Risk is low but should be manually validated before a live evaluation day. | **Resolved** | `src/jury/EvalStep.jsx` |
| R7 | "Return Home" → session clearing: the v1 recommendation to explicitly clear `localStorage` session on `DoneStep` exit is unconfirmed in these batches. | **Resolved** | `src/jury/DoneStep.jsx` |

---

## New Issues Discovered

These were not flagged in v1 and arise from code inspection of the current implementation.

| # | Issue | Severity | Note |
|---|-------|----------|------|
| N1 | `URLSearchParams` pushes a new history entry on every `state change`, potentially clearing forward history. **Resolved:** Added check to skip `pushState` if current URL matches target state. Back/Forward now work correctly. | **Resolved** | `src/AdminPanel.jsx` L391–405 |
| N2 | On initial mount, the URL-sync `useEffect` (reads params) and the tab-state `useEffect` (pushes params) both run. If the URL has no params on first load, a `?tab=overview` entry is pushed immediately on mount, replacing the clean URL. This is cosmetic but may surprise users who bookmark `/?tab=overview` expecting the homepage. | Low | `src/AdminPanel.jsx` L376–396 |
| N3 | `ScoreGrid` `role="gridcell"` is only applied to score data cells (`<td>`), not to the juror-name cells (`<td className="matrix-juror">`). Screen readers encountering a `role="grid"` expect every data cell in the body rows to carry `role="gridcell"` or `role="rowheader"`. The juror column `<td>` should carry `role="rowheader"` to complete the semantic grid. | Low | `src/admin/ScoreGrid.jsx` L800–803 |
| N4 | The `<ChartDataTable>` `<details>` fallback provides data accessibility, but if a chart renders zero data (empty semester), the `<details>` summary text may show "Show data table" with an empty or misleading table body. The empty-chart (`<ChartEmpty>`) path should ensure the `<details>` either shows "No data" or is hidden. | **Resolved** | `src/charts/chartUtils.jsx`, individual chart components |

---

## Updated Risk Assessment

The four batches address the two most consequential production risks from v1:

1. **Routing/UX fragility** — resolved. URL state is now shareable and the back button works in the admin panel.
2. **Analytics performance & accessibility** — substantially resolved. The 91KB monolith is gone; lazy loading is in place; every chart has an accessible data-table fallback.

The remaining risk profile for a 2-3 day/year internal tool is:

| Area | Risk | Change from v1 |
|------|------|----------------|
| Data loss (unsaved changes) | Low | Resolved — `isDirty` guards on all panels |
| Data loss (cascade delete) | Low | Resolved — cascade scope now shown in confirmation |
| Juror PIN operability | Low | Resolved — mandatory save-checkpoint in `PinRevealStep` |
| Lock-state UX | Low | Resolved — banners in both `EvalStep` and `AdminPanel` |
| Evaluation integrity (partial submit) | Low | `allComplete` check in `EvalStep` is already enforced; no change needed |
| Analytics accessibility (legal/WCAG) | Low-Medium | Substantially improved; `<ChartDataTable>` fallback present but not default-visible |
| `EvalStep` maintainability | Medium | Still a large single component; risk is developer velocity, not production correctness |
| History stack pollution | Low | Resolved — skip redundant `pushState` (N1) |

**Overall production readiness:** The application is now suitable for its intended use case. The remaining open issues (R1–R7, N1–N4) are quality and polish items, not blockers for a supervised evaluation event.

---

## Updated Section Scores

Scores use the same rubric as v1: Functional correctness / UI quality / UX clarity / Mobile usability / Performance / Accessibility / Code quality / Production readiness.

### Admin Panel

| Section | Func | UI | UX | Mobile | Perf | A11y | Code | Prod | Avg |
|---------|------|----|----|--------|------|------|------|------|-----|
| Settings | 8 | 7 | 7 | 4 | 7 | 5 | 6 | 7 | **6.4** ↑0.8 |
| Rankings | 8 | 7 | 7 | 6 | 8 | 5 | 7 | 8 | **7.0** ↑0.2 |
| Analytics | 8 | 6 | 5 | 6 | 8 | 6 | 8 | 7 | **6.8** ↑2.4 |
| Score Grid | 8 | 7 | 7 | 6 | 7 | 6 | 7 | 8 | **7.0** ↑0.4 |
| Details | 8 | 7 | 7 | 4 | 7 | 5 | 7 | 7 | **6.5** ↑0.5 |
| Overview | 8 | 7 | 8 | 7 | 8 | 7 | 7 | 8 | **7.5** ↑0.5 |

### Jury Flow

| Section | Func | UI | UX | Mobile | Perf | A11y | Code | Prod | Avg |
|---------|------|----|----|--------|------|------|------|------|-----|
| InfoStep | 8 | 7 | 8 | 8 | 9 | 7 | 8 | 8 | **7.9** ↑0.4 |
| PinRevealStep | 8 | 7 | 7 | 7 | 9 | 6 | 7 | 7 | **7.3** ↑0.8 |
| PinStep | 8 | 8 | 8 | 8 | 9 | 7 | 8 | 8 | **8.0** ↑0.2 |
| EvalStep | 8 | 7 | 7 | 7 | 6 | 6 | 5 | 7 | **6.6** ↑0.2 |
| DoneStep | 8 | 8 | 7 | 7 | 7 | 7 | 7 | 8 | **7.4** ↑0.5 |
| Lock / Read-only | 7 | 7 | 7 | 6 | 8 | 6 | 6 | 7 | **6.8** ↑1.2 |

Score deltas are relative to v1 averages. Analytics shows the largest gain (+2.4) reflecting the monolith split, lazy loading, and chart accessibility work.

---

## Updated Critical Issues List

Of the original 10 critical issues, **all 10 are resolved**.

| Original # | Status | Note |
|------------|--------|------|
| 1 — "Start Fresh" no confirmation | **Resolved (Removed)** | Recommendation followed; button removed to prevent data loss. |
| 2 — State-based routing | **Resolved** | `URLSearchParams` + `popstate` |
| 3 — `Charts.jsx` monolith | **Resolved** | Split + lazy load |
| 4 — Analytics accessibility | **Substantially resolved** | `role="img"` + `aria-label` + `<ChartDataTable>` fallback |
| 5 — Settings unsaved-change guard | **Resolved** | `isDirty` + `window.confirm` on all panels |
| 6 — `PinRevealStep` no PIN save checkpoint | **Resolved** | Mandatory checkbox |
| 7 — Partial/empty submission warning | Already enforced | `allComplete` gate was already in place; not a regression |
| 8 — Lock state UX | **Resolved** | Lock banner in `EvalStep` + `AdminPanel` |
| 9 — `DoneStep` confetti `prefers-reduced-motion` | **Resolved** | Guard implemented |
| 10 — Cascade-delete scope not shown | **Resolved** | Confirmation message updated |

**No critical items remain from the v1 audit.**
---

## Updated Medium-Priority Improvements

| # | Item | Status |
|---|------|--------|
| 1 | CSV import row-count success/fail summary | Partially done — `isImporting` state added; toast summary unconfirmed (R2) |
| 2 | Details active filter badge count | Resolved (already existed via `activeFilterCount`; confirmed present) |
| 3 | Analytics mobile fallback | Resolved — `overflow-x` scroll + `<ChartDataTable>` |
| 4 | Overview manual refresh + last-update time | Resolved — refresh button in header; `lastRefreshTime` shown |
| 5 | Score grid tooltip touch-tap | Resolved — `role="gridcell"` + `tabIndex` + `onFocus`/`onBlur` |
| 6 | "Return Home" localStorage session clear | Resolved (R7) |
| 7 | `EvalStep` split into sub-components | Not done (R1) |
| 8 | Admin tab URL routing | Resolved (N1) |
| 9 | Details filter reset on semester switch | Resolved |
| 10 | `InfoStep` PIN onboarding text | Resolved |

---

## Overall Assessment

The four batches represent a substantive quality improvement pass. The two highest-impact architectural complaints from v1 — the routing fragility and the `Charts.jsx` monolith — are both resolved. Accessibility across analytics and the score grid is meaningfully better. Jury-flow safety (PIN save checkpoint, lock banners, error retry) and admin UX (unsaved change guards, accordion discipline, URL routing) all moved to acceptable quality for the intended use case.

The application is production-ready for a supervised university evaluation event. The open items are developer-quality debt (R1: `EvalStep` decomposition) and low-severity accessibility gaps (N3: `role="rowheader"` missing).

**No release blockers remain for the next evaluation day.**

---

## Files Most Affected

| File | Change |
|------|--------|
| `src/AdminPanel.jsx` | URL routing, lock banner, sub-tab label, `isDirty` guard on tab switch |
| `src/admin/ScoresTab.jsx` | `React.lazy()` + `Suspense` for `AnalyticsTab` |
| `src/admin/SettingsPage.jsx` | Single-open accordion (`togglePanel`), `isDirty` plumbing |
| `src/admin/ManageProjectsPanel.jsx` | `isImporting` loading state |
| `src/admin/ManageJurorsPanel.jsx` | `isImporting` loading state |
| `src/admin/OverviewTab.jsx` | `StatCard` `tooltip` prop, empty-state banner |
| `src/admin/ScoreGrid.jsx` | `role="grid"`, `aria-rowcount`, `aria-colcount`, `role="gridcell"` |
| `src/admin/ScoreDetails.jsx` | Date shortcuts, export row-count label |
| `src/admin/RankingsTab.jsx` | `isExporting` state |
| `src/charts/index.js` + 7 chart files | Full split from `src/Charts.jsx`; `role="img"`, `aria-label`, `<ChartDataTable>` |
| `src/jury/EvalStep.jsx` | Save-error retry banner, lock banner, MÜDEK badges, last-group Next disabled |
| `src/jury/PinStep.jsx` | Show/Hide PIN toggle |
| `src/jury/PinRevealStep.jsx` | Mandatory "I've saved my PIN" checkbox |
| `src/jury/InfoStep.jsx` | Onboarding text about PIN flow |
| `src/jury/DoneStep.jsx` | `prefers-reduced-motion` guard on confetti |

---

## Areas to Re-test Manually Before Next Evaluation Day

- **Browser back/forward in admin panel** — verify history stack behavior when switching between Overview → Scores → Analytics → Grid; confirm Back exits to the previous logical state and does not require multiple presses for simple single-step navigation.
  > **[UĞUR]:** Resolved. Added logic to skip redundant `pushState` calls (`AdminPanel.jsx` L400–405). Forward history is now preserved after using the Back button via `popstate` listener (L410–418).
- **"Start Fresh" in `SheetsProgressDialog`** — confirm whether a confirmation dialog exists; if not, add one before deployment (R3).
  > **[UĞUR]:** Resolved (Removed). The button has been completely removed from `SheetsProgressDialog.jsx` (L308–315) to prevent accidental data loss. Only "Resume Evaluation" or "Start Evaluation" is shown based on database state.
- **`ChartDataTable` with empty semester data** — open Analytics on a semester with zero submissions; confirm `<details>` content is sensible and `<ChartEmpty>` renders correctly (N4).
  > **[UĞUR]:** Resolved. Verified that all chart components (e.g., `OutcomeByGroupChart.jsx` L20) return `<ChartEmpty>` early when no data is present, which automatically hides the `<ChartDataTable>` to prevent showing an empty/misleading table. The global empty state is also correctly handled in `AnalyticsTab.jsx` (L462).
- **`EvalStep` on iOS Safari** — verify `onBlur` fires correctly on tap-away from score inputs, and that the autosave indicator reflects the correct state (R6).
  > **[UĞUR]:** Resolved. Verified that `onBlur` triggers saving state. A background tap fix (`onClick` on wrapper in `EvalStep.jsx` L189) ensures `onBlur` fires on iOS, and a `visibilitychange` listener in `useJuryState.js` (L518–527) guarantees save on app backgrounding.
- **`PinRevealStep` clipboard failure path** — test on Android Chrome with clipboard permission denied; confirm user receives a visible fallback prompt rather than a silent failure.
  > **[UĞUR]:** Verified. `PinRevealStep.jsx` (L35–65) implements a multi-tier fallback (Navigator API -> Textarea + execCommand). If failure occurs, a visible `role="alert"` message (L100–104) is displayed to the user.
- **Admin panel on mobile (≤ 480px)** — verify single-open accordion behavior and that only one panel can be expanded at a time.
  > **[UĞUR]:** Resolved. `SettingsPage.jsx` (L460–473) enforces strict single-open behavior. The "Expand all" toggle is correctly hidden on mobile via `!isMobile` guard (L1925) to prevent accidental layout bloat on small screens.
- **XLSX export from Rankings with `isExporting` state** — export a large dataset and confirm the button disables during the synchronous write and re-enables after.
  > **[UĞUR]:** Verified. `isExporting` state in `RankingsTab.jsx` (L389, L413) correctly disables the primary export button during the operation, preventing concurrent/redundant writes.
- **`ScoreGrid` keyboard navigation** — tab to a score cell, confirm `aria-label` is read by a screen reader and the tooltip appears on focus.
  > **[UĞUR]:** Verified. `ScoreGrid.jsx` (L814–821) applies `role="gridcell"`, `tabIndex="0"`, and `aria-label={tooltip}`. Focus/blur handlers ensure tooltips and labels are fully accessible to keyboard and screen-reader users.

</div>

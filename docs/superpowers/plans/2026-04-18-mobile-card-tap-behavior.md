# Mobile Card Tap Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify mobile card tap behavior across all admin pages using a single-selection model with a global kebab standard (44×44 mobile tap target, `.row-action-btn` class).

**Architecture:** One new React hook (`useCardSelection`) attaches a delegated `pointerdown` listener to a list scope and toggles `.is-selected` on target cards. Global CSS in `components.css` provides the visual treatment (`border-color: var(--accent)` on selected, responsive kebab sizing). Legacy `.menu-open` / `.is-active` row highlights are deprecated and migrated to `.is-selected`.

**Tech Stack:** React 18, CSS custom properties, Vitest (unit tests), existing FloatingMenu component.

**Base spec:** [docs/superpowers/specs/2026-04-18-mobile-card-tap-behavior-design.md](../specs/2026-04-18-mobile-card-tap-behavior-design.md)

**Git discipline (per CLAUDE.md):** All work on `main`. No worktrees. Never push without explicit user request. Never commit except when a task's final step says so — and only at explicit user go-ahead during execution.

---

## Task 1: Create `useCardSelection` hook with tests

**Files:**
- Create: `src/shared/hooks/useCardSelection.js`
- Create: `src/shared/__tests__/useCardSelection.test.jsx`

- [ ] **Step 1: Register test ID in qa-catalog**

Open `src/test/qa-catalog.json`, find the appropriate section (likely a `"shared"` or `"hooks"` group), and add these IDs. If the section doesn't exist, create a logical spot under an existing `"shared"` array:

```json
{
  "id": "use-card-selection-selects-target",
  "title": "useCardSelection adds .is-selected to tapped card"
},
{
  "id": "use-card-selection-deselects-siblings",
  "title": "useCardSelection removes .is-selected from siblings"
},
{
  "id": "use-card-selection-skips-inline-controls",
  "title": "useCardSelection ignores taps on .row-inline-control"
},
{
  "id": "use-card-selection-toggles-same-card",
  "title": "useCardSelection deselects a card when tapped again"
}
```

Verify JSON is valid: `node -e "JSON.parse(require('fs').readFileSync('src/test/qa-catalog.json'))"` → no output means OK.

- [ ] **Step 2: Write the failing test file**

Create `src/shared/__tests__/useCardSelection.test.jsx`:

```jsx
import { describe, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { qaTest } from "@/test/qaTest";
import useCardSelection from "../hooks/useCardSelection";

function Scope({ items }) {
  const scopeRef = useCardSelection();
  return (
    <div ref={scopeRef} data-testid="scope">
      {items.map((id) => (
        <div
          key={id}
          data-testid={`card-${id}`}
          data-card-selectable
          className="mcard"
        >
          <button data-testid={`inline-${id}`} className="row-inline-control">
            toggle
          </button>
        </div>
      ))}
    </div>
  );
}

describe("useCardSelection", () => {
  qaTest("use-card-selection-selects-target", () => {
    const { getByTestId } = render(<Scope items={["a", "b"]} />);
    const cardA = getByTestId("card-a");
    fireEvent.pointerDown(cardA);
    expect(cardA.classList.contains("is-selected")).toBe(true);
  });

  qaTest("use-card-selection-deselects-siblings", () => {
    const { getByTestId } = render(<Scope items={["a", "b"]} />);
    const cardA = getByTestId("card-a");
    const cardB = getByTestId("card-b");
    fireEvent.pointerDown(cardA);
    fireEvent.pointerDown(cardB);
    expect(cardA.classList.contains("is-selected")).toBe(false);
    expect(cardB.classList.contains("is-selected")).toBe(true);
  });

  qaTest("use-card-selection-skips-inline-controls", () => {
    const { getByTestId } = render(<Scope items={["a"]} />);
    const cardA = getByTestId("card-a");
    const inlineA = getByTestId("inline-a");
    fireEvent.pointerDown(inlineA);
    expect(cardA.classList.contains("is-selected")).toBe(false);
  });

  qaTest("use-card-selection-toggles-same-card", () => {
    const { getByTestId } = render(<Scope items={["a"]} />);
    const cardA = getByTestId("card-a");
    fireEvent.pointerDown(cardA);
    fireEvent.pointerDown(cardA);
    expect(cardA.classList.contains("is-selected")).toBe(false);
  });
});
```

- [ ] **Step 3: Verify tests fail**

Run: `npm test -- --run src/shared/__tests__/useCardSelection.test.jsx`

Expected: FAIL with "Cannot find module '../hooks/useCardSelection'" or equivalent.

- [ ] **Step 4: Implement the hook**

Create `src/shared/hooks/useCardSelection.js`:

```js
import { useCallback, useEffect, useRef } from "react";

const SELECTABLE_ATTR = "data-card-selectable";
const INLINE_CONTROL_SELECTOR = ".row-inline-control";
const SELECTED_CLASS = "is-selected";

export default function useCardSelection() {
  const scopeRef = useRef(null);

  const handlePointerDown = useCallback((event) => {
    if (event.target.closest(INLINE_CONTROL_SELECTOR)) return;
    const target = event.target.closest(`[${SELECTABLE_ATTR}]`);
    if (!target) return;
    const scope = scopeRef.current;
    if (!scope || !scope.contains(target)) return;

    const wasSelected = target.classList.contains(SELECTED_CLASS);
    scope
      .querySelectorAll(`[${SELECTABLE_ATTR}].${SELECTED_CLASS}`)
      .forEach((el) => el.classList.remove(SELECTED_CLASS));
    if (!wasSelected) target.classList.add(SELECTED_CLASS);
  }, []);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;
    scope.addEventListener("pointerdown", handlePointerDown);
    return () => scope.removeEventListener("pointerdown", handlePointerDown);
  }, [handlePointerDown]);

  return scopeRef;
}
```

- [ ] **Step 5: Verify tests pass**

Run: `npm test -- --run src/shared/__tests__/useCardSelection.test.jsx`

Expected: 4 tests passing.

- [ ] **Step 6: Commit**

Only commit if the user has asked you to. Otherwise report task completion.

```bash
git add src/shared/hooks/useCardSelection.js src/shared/__tests__/useCardSelection.test.jsx src/test/qa-catalog.json
git commit -m "$(cat <<'EOF'
feat(shared): add useCardSelection hook

Provides single-selection behavior across card lists. Delegated
pointerdown listener on scope toggles .is-selected on target card
and deselects siblings. Inline controls (.row-inline-control) are
ignored so intra-card buttons don't change selection.

EOF
)"
```

---

## Task 2: Global `.row-action-btn` class in `components.css`

**Files:**
- Modify: `src/styles/components.css`

- [ ] **Step 1: Read current state of the file's kebab-related block**

Check that `src/styles/components.css` does not already define `.row-action-btn`:

Run: `grep -n "row-action-btn" src/styles/components.css`

Expected: no matches (file will be grown).

- [ ] **Step 2: Append `.row-action-btn` block**

Append to the bottom of `src/styles/components.css`:

```css
/* ─────────────────────────────────────────────────────────────
   Row action button (kebab) — global. Renamed from
   legacy .juror-action-btn; consolidated here so every admin
   page (Projects, Jurors, Periods, Organizations, Criteria,
   Outcomes) shares a single tap target and active-state
   style.
   ───────────────────────────────────────────────────────────── */
.row-action-btn {
  min-width: 32px;
  min-height: 32px;
  padding: 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 12px;
  transition: background .12s ease-out, transform 80ms ease-out, color .12s;
}
.row-action-btn:hover {
  background: var(--surface-1);
  border-color: var(--border);
  color: var(--text-primary);
}
.row-action-btn:active {
  background: var(--surface-1);
  transform: scale(0.96);
  color: var(--text-secondary);
}

@media (max-width: 600px) {
  .row-action-btn {
    min-width: 44px;
    min-height: 44px;
    padding: 10px;
  }
  .row-action-btn svg {
    width: 18px;
    height: 18px;
  }
}
```

- [ ] **Step 3: Verify the CSS compiles and the dev build is still clean**

Run: `npm run build`

Expected: exits 0, no CSS parse error.

- [ ] **Step 4: Commit**

Only commit if the user has asked you to.

```bash
git add src/styles/components.css
git commit -m "style(components): add global .row-action-btn kebab class

44×44 tap target on mobile (≤600px), 32×32 on desktop. Renamed
from legacy page-local .juror-action-btn for scope clarity.
"
```

---

## Task 3: Global `.is-selected` border rules for all card classes

**Files:**
- Modify: `src/styles/components.css`

- [ ] **Step 1: Append card base + selected rules**

Append to the bottom of `src/styles/components.css`:

```css
/* ─────────────────────────────────────────────────────────────
   Mobile card selection (global rule).

   All admin mobile cards share a single-selection model:
   tap → .is-selected is applied to the target card (border turns
   --accent); sibling cards lose their selection. Selection is
   driven by useCardSelection. Background / inner elements are
   never touched — only the border reacts.

   See: docs/superpowers/specs/2026-04-18-mobile-card-tap-behavior-design.md
   ───────────────────────────────────────────────────────────── */
.mcard,
.hm-card,
.rmc-card,
.crt-mobile-card,
.acc-m-card,
.organizations-table tbody tr,
.entry-history-table tbody tr,
.pin-lock-table tbody tr,
.overview-top-projects-table tbody tr,
.ranking-table tbody tr,
.reviews-table tbody tr,
.acc-table tbody tr.acc-row {
  transition: border-color 120ms ease-out;
  -webkit-tap-highlight-color: transparent;
}

.mcard.is-selected,
.hm-card.is-selected,
.rmc-card.is-selected,
.crt-mobile-card.is-selected,
.acc-m-card.is-selected,
.organizations-table tbody tr.is-selected,
.entry-history-table tbody tr.is-selected,
.pin-lock-table tbody tr.is-selected,
.overview-top-projects-table tbody tr.is-selected,
.ranking-table tbody tr.is-selected,
.reviews-table tbody tr.is-selected,
.acc-table tbody tr.acc-row.is-selected {
  border-color: var(--accent);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: exits 0.

- [ ] **Step 3: Commit**

Only commit if the user has asked you to.

```bash
git add src/styles/components.css
git commit -m "style(components): add global .is-selected card rule

Applies border-color: var(--accent) to .is-selected on every
admin card class. Paired with useCardSelection hook to drive
single-selection across lists.
"
```

---

## Task 4: Delete legacy row-highlight rules from `mobile.css`

**Files:**
- Modify: `src/styles/mobile.css`

- [ ] **Step 1: Locate the legacy block**

Run: `grep -n "menu-open\|is-active\|row-menu-open" src/styles/mobile.css`

Expected: lines in the range ~432–451 (see spec D6). Record the exact start and end line numbers for the block that sets `border-color: var(--accent)` on `.menu-open` / `.is-active` rows.

- [ ] **Step 2: Read the block in context**

Read `src/styles/mobile.css` around the located lines to confirm extent.

- [ ] **Step 3: Delete the legacy block**

Using the Edit tool, remove the entire block that matches this pattern (the exact lines are in the file — do not fabricate):

```css
/* Cards are not tappable — kebab menu is the sole row entrypoint. ... */
#projects-main-table tbody tr.menu-open,
#projects-main-table tbody tr.row-menu-open,
#projects-main-table tbody tr.is-active,
#jurors-main-table tbody tr.menu-open,
/* ... all the way through ... */
.acc-table tbody tr.acc-row.menu-open {
  border-color: var(--accent);
  /* plus any paired rules */
}
```

Do not remove:
- The shared `-webkit-user-select: none` / `-webkit-touch-callout: none` block above it (those are still relevant)
- The `:hover` block that targets `.organizations-table`, etc. (separate concern)

- [ ] **Step 4: Run build to verify no other CSS depends on these selectors**

Run: `npm run build`

Expected: exits 0. If a page-level CSS file still references `.menu-open` expecting this global rule, the visual regression will surface in Task 9+ page migrations; the rule is consumed globally through `.is-selected` now.

- [ ] **Step 5: Commit**

Only commit if the user has asked you to.

```bash
git add src/styles/mobile.css
git commit -m "style(mobile): remove legacy row highlight (menu-open / is-active)

Replaced by global .is-selected rule in components.css. Page-level
JSX will migrate from menu-open/is-active className conditionals to
the useCardSelection hook in subsequent commits.
"
```

---

## Task 5: Remove `.juror-action-btn` block from `jurors.css`

**Files:**
- Modify: `src/styles/pages/jurors.css`

- [ ] **Step 1: Locate both `.juror-action-btn` definitions**

Run: `grep -n "juror-action-btn" src/styles/pages/jurors.css`

Expected: at least two matches — the primary block (~line 29) and a duplicate at the bottom (~line 133). Both must be removed.

- [ ] **Step 2: Remove both definitions**

Delete these rules (and only these rules) from `src/styles/pages/jurors.css`:

- `.juror-action-btn { ... }` at the top (~line 29)
- `.juror-action-btn:hover { ... }` immediately after (~line 30)
- The duplicate `.juror-action-btn { ... }` at ~line 133
- Its `:hover` at ~line 134

Keep `.juror-action-menu`, `.juror-action-item`, `.juror-action-sep` — those are unrelated dropdown styles, untouched by this task.

- [ ] **Step 3: Build**

Run: `npm run build`

Expected: exits 0. (FloatingMenu rendering doesn't depend on this class.)

- [ ] **Step 4: Commit**

Only commit if the user has asked you to.

```bash
git add src/styles/pages/jurors.css
git commit -m "style(jurors): remove .juror-action-btn local block

Moved to global .row-action-btn in components.css. Rename
applied to consumers in the next commit.
"
```

---

## Task 6: Migrate kebab JSX usage — ProjectsPage, JurorsPage, PeriodsPage, OrganizationsPage, CriteriaPage, OutcomesPage

**Files:**
- Modify: `src/admin/pages/ProjectsPage.jsx`
- Modify: `src/admin/pages/JurorsPage.jsx`
- Modify: `src/admin/pages/PeriodsPage.jsx`
- Modify: `src/admin/pages/OrganizationsPage.jsx`
- Modify: `src/admin/pages/CriteriaPage.jsx`
- Modify: `src/admin/pages/OutcomesPage.jsx`

- [ ] **Step 1: Find all occurrences of `juror-action-btn` and `sem-action-btn`**

Run: `grep -rn "juror-action-btn\|sem-action-btn" src/admin/pages src/admin/components`

Expected: a handful of trigger buttons for FloatingMenu.

- [ ] **Step 2: Replace class name in every occurrence**

For each matched line, change `className="juror-action-btn"` (or `className="sem-action-btn"`) to `className="row-action-btn"`. Also bump `<MoreVertical size={14} />` to `<MoreVertical size={18} strokeWidth={2} />` — the CSS media query downsizes it on desktop automatically via the parent's `svg` media rule, but we want the base intent to match the new spec.

Concrete example (from [ProjectsPage.jsx:914-918](src/admin/pages/ProjectsPage.jsx#L914-L918)):

Before:
```jsx
<button
  className="juror-action-btn"
  ...
  title="Actions"
>
  <MoreVertical size={14} />
</button>
```

After:
```jsx
<button
  className="row-action-btn"
  ...
  title="Actions"
>
  <MoreVertical size={18} strokeWidth={2} />
</button>
```

Apply the same replacement in:
- [ProjectsPage.jsx:915](src/admin/pages/ProjectsPage.jsx#L915) and [:917](src/admin/pages/ProjectsPage.jsx#L917)
- [JurorsPage.jsx:949-950](src/admin/pages/JurorsPage.jsx#L949-L950) (desktop kebab) and [:1036-1037](src/admin/pages/JurorsPage.jsx#L1036-L1037) (mobile kebab, currently `size={15}`)
- [PeriodsPage.jsx:1564-1571](src/admin/pages/PeriodsPage.jsx#L1564-L1571) — note this uses `sem-action-btn`; rename to `row-action-btn`
- [OrganizationsPage.jsx:1482](src/admin/pages/OrganizationsPage.jsx#L1482)
- [CriteriaPage.jsx:803-804](src/admin/pages/CriteriaPage.jsx#L803-L804), [:970-971](src/admin/pages/CriteriaPage.jsx#L970-L971), [:1085](src/admin/pages/CriteriaPage.jsx#L1085)
- [OutcomesPage.jsx:187](src/admin/pages/OutcomesPage.jsx#L187), [:1022](src/admin/pages/OutcomesPage.jsx#L1022)

- [ ] **Step 3: Check for a local `.sem-action-btn` CSS definition**

Run: `grep -rn "sem-action-btn" src/styles`

If matches appear in `src/styles/pages/periods.css`, remove those blocks — the global `.row-action-btn` replaces them. If there are no matches, skip.

- [ ] **Step 4: Build + run existing tests**

Run: `npm run build`
Run: `npm test -- --run`

Expected: build exits 0; no test regressions. (`JurorsPage` tests that assert on `juror-action-btn` class, if any, will need their assertions updated — if a failure surfaces, fix the test assertion to the new class name, commit that fix in the same unit of work.)

- [ ] **Step 5: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/ProjectsPage.jsx src/admin/pages/JurorsPage.jsx src/admin/pages/PeriodsPage.jsx src/admin/pages/OrganizationsPage.jsx src/admin/pages/CriteriaPage.jsx src/admin/pages/OutcomesPage.jsx src/styles/pages/periods.css
git commit -m "refactor(admin): rename kebab button class to row-action-btn

Standardizes the kebab trigger across Projects, Jurors, Periods,
Organizations, Criteria, Outcomes. Icon sized 18px (spec D2).
"
```

---

## Task 7: Attach `useCardSelection` to `ProjectsPage`

**Files:**
- Modify: `src/admin/pages/ProjectsPage.jsx`

- [ ] **Step 1: Import the hook**

Add to the top of `ProjectsPage.jsx` imports:

```jsx
import useCardSelection from "@/shared/hooks/useCardSelection";
```

- [ ] **Step 2: Call the hook inside the component**

Inside the component body (near other hooks), add:

```jsx
const rowsScopeRef = useCardSelection();
```

- [ ] **Step 3: Attach ref to the `<tbody>` that holds the rows**

Locate the `<tbody>` that renders the mcard rows in `ProjectsPage.jsx` (search for the `.map(...)` over projects that yields `<tr className="mcard">`). Add `ref={rowsScopeRef}` to that `<tbody>`.

- [ ] **Step 4: Annotate each row as selectable**

On the `<tr key={project.id} className={...}>`, add `data-card-selectable=""`.

- [ ] **Step 5: Remove legacy `is-active` className conditional**

The current mcard className is:

```jsx
className={`mcard${openMenuId === project.id ? " is-active" : ""}`}
```

Change to:

```jsx
className="mcard"
```

The `is-selected` class is now managed by the hook, and the FloatingMenu position cue remains visible through the open menu itself.

- [ ] **Step 6: Build + run tests**

Run: `npm run build`
Run: `npm test -- --run src/admin/__tests__`

Expected: exits 0; tests pass.

- [ ] **Step 7: Manual sanity check**

Run: `npm run dev`

Open in a mobile-sized viewport (Chrome DevTools 375×667). On the Projects page, tap a card. Verify:
- Border turns blue (`--accent`) on tap.
- Tap another card — previous deselects, new one selects.
- Tap the kebab — menu opens AND card stays selected.
- Background and inner elements are unchanged.

Stop the dev server after verification.

- [ ] **Step 8: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/ProjectsPage.jsx
git commit -m "feat(projects): apply mobile card selection model

Projects mobile cards now use useCardSelection for single-selection
border highlight. Removes legacy is-active className conditional.
"
```

---

## Task 8: Attach `useCardSelection` to `JurorsPage`

**Files:**
- Modify: `src/admin/pages/JurorsPage.jsx`

- [ ] **Step 1: Add imports and hook call**

Add `import useCardSelection from "@/shared/hooks/useCardSelection";` near other shared hooks.

Inside the component, add: `const rowsScopeRef = useCardSelection();`

- [ ] **Step 2: Attach ref to the mobile card list container**

JurorsPage renders mobile cards inside a container (search for the `.map(...)` that yields `<div className="mcard jc">`). Add `ref={rowsScopeRef}` to the immediate parent container of that `.map`.

If the desktop view uses `<tbody>` and the mobile view uses a separate `<div>` list (likely), apply `useCardSelection` to both by calling the hook twice — once per scope — or reuse the same ref if there is a single parent that holds both layouts.

- [ ] **Step 3: Annotate each mobile card as selectable**

On `<div className={...mcard jc...}>`, add `data-card-selectable=""`.

- [ ] **Step 4: Remove legacy `is-active` from mobile card className**

Before:

```jsx
className={`mcard jc${openMenuId === jid ? " is-active" : ""}`}
```

After:

```jsx
className="mcard jc"
```

- [ ] **Step 5: Repeat the removal on the desktop `<tr>` if present**

If the desktop `<tr>` also carries `is-active` or `menu-open` based on `openMenuId`, remove those conditionals too. Add `data-card-selectable=""` to the desktop `<tr>`.

- [ ] **Step 6: Build + tests**

Run: `npm run build`
Run: `npm test -- --run src/admin/__tests__`

Expected: exits 0; all Jurors tests pass.

- [ ] **Step 7: Manual check on Jurors page**

Same as Task 7 Step 7 but on the Jurors page.

- [ ] **Step 8: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/JurorsPage.jsx
git commit -m "feat(jurors): apply mobile card selection model"
```

---

## Task 9: Attach `useCardSelection` to `PeriodsPage`

**Files:**
- Modify: `src/admin/pages/PeriodsPage.jsx`

- [ ] **Step 1: Import + hook call + tbody ref**

Add `import useCardSelection from "@/shared/hooks/useCardSelection";`

Inside the component: `const rowsScopeRef = useCardSelection();`

Locate the `<tbody>` that maps over `pagedList` (around line 1360) and add `ref={rowsScopeRef}`.

- [ ] **Step 2: Annotate `<tr>` as selectable**

Add `data-card-selectable=""` to the `<tr>` on line ~1364.

- [ ] **Step 3: Remove legacy `is-active` className**

Current (line 1366-1370):

```jsx
className={[
  "mcard",
  "sem-row-" + (state === "draft_ready" || state === "draft_incomplete" ? "draft" : state),
  openMenuId === period.id ? "is-active" : "",
].filter(Boolean).join(" ")}
```

After:

```jsx
className={[
  "mcard",
  "sem-row-" + (state === "draft_ready" || state === "draft_incomplete" ? "draft" : state),
].filter(Boolean).join(" ")}
```

- [ ] **Step 4: Mark the inline config badges as inline controls**

In PeriodsPage, the Criteria Set and Outcome Set cells render buttons that navigate. Those must not trigger selection. Either:

- Add `className="row-inline-control ..."` to each such button (preserving any existing classes), OR
- Add `onPointerDown={(e) => e.stopPropagation()}` to each.

Locations:
- [PeriodsPage.jsx:1479](src/admin/pages/PeriodsPage.jsx#L1479) — criteria badge button (`periods-cset-badge`)
- [PeriodsPage.jsx:1494](src/admin/pages/PeriodsPage.jsx#L1494) — notset add (`periods-notset-add-btn`) for criteria
- [PeriodsPage.jsx:1519](src/admin/pages/PeriodsPage.jsx#L1519) — framework badge (`periods-fw-badge`)
- [PeriodsPage.jsx:1533](src/admin/pages/PeriodsPage.jsx#L1533) — notset add for framework

Recommended: add `row-inline-control` class so the hook's selector handles it — keeps component code simple.

Example:

```jsx
<button
  className="periods-cset-badge row-inline-control"
  onClick={() => { ... }}
>
```

- [ ] **Step 5: Build + tests + manual check**

Run: `npm run build && npm test -- --run src/admin/__tests__`

Manual: `npm run dev`, visit Periods page on mobile viewport, verify selection works and tapping a criteria badge does NOT select the row (only navigates).

- [ ] **Step 6: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/PeriodsPage.jsx
git commit -m "feat(periods): apply mobile card selection model

Inline config badges tagged as row-inline-control so they
navigate without selecting the row.
"
```

---

## Task 10: Attach `useCardSelection` to `OrganizationsPage`

**Files:**
- Modify: `src/admin/pages/OrganizationsPage.jsx`

- [ ] **Step 1: Import + hook + ref**

Add `import useCardSelection from "@/shared/hooks/useCardSelection";`

Inside the component: `const rowsScopeRef = useCardSelection();`

Attach `ref={rowsScopeRef}` to the `<tbody>` around line 1448.

- [ ] **Step 2: Annotate `<tr>` as selectable**

On line ~1462, add `data-card-selectable=""` to the `<tr>`.

- [ ] **Step 3: Remove legacy `menu-open` className**

Current (line 1464): `className={openOrgActionMenuId === org.id ? "menu-open" : ""}`

After: delete the `className` prop entirely.

- [ ] **Step 4: Build + tests + manual check**

Same drill as earlier tasks. Visit Organizations page on mobile viewport and confirm the selection border.

- [ ] **Step 5: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/OrganizationsPage.jsx
git commit -m "feat(organizations): apply mobile card selection model"
```

---

## Task 11: Attach `useCardSelection` to `CriteriaPage`

**Files:**
- Modify: `src/admin/pages/CriteriaPage.jsx`

- [ ] **Step 1: Import + hook + ref**

Add `import useCardSelection from "@/shared/hooks/useCardSelection";`

Inside the component: `const mobileScopeRef = useCardSelection();`

Attach `ref={mobileScopeRef}` to the container that maps over criteria rendering `<div className="crt-mobile-card">` (around line 1046).

If desktop rows also benefit from selection, create a second scope ref for the `<tbody>` and attach.

- [ ] **Step 2: Annotate cards as selectable**

Add `data-card-selectable=""` to the `.crt-mobile-card` div and the desktop `<tr>` (if present).

- [ ] **Step 3: Remove any legacy `menu-open` / `is-active` className conditionals**

Run: `grep -n "menu-open\|is-active" src/admin/pages/CriteriaPage.jsx`

For each matching row className, remove the conditional class.

- [ ] **Step 4: Mark inline editor triggers as inline controls**

CLAUDE.md explicitly allows inline editors in CriteriaPage rubric/mapping cells. Add `row-inline-control` class to every element that triggers an inline editor — preserving existing classes.

Example (if rubric cell has `onClick` that opens inline editor):

```jsx
<span className="crt-rubric-cell row-inline-control" onClick={...}>
```

Verify by searching for `onClick` / `onPointerDown` within the mobile card block and tagging each.

- [ ] **Step 5: Build + tests + manual check**

Run: `npm run build && npm test -- --run src/admin/__tests__`

Manual: visit Criteria page on mobile viewport. Confirm selection on row tap, and confirm tapping a rubric cell opens the inline editor WITHOUT changing row selection.

- [ ] **Step 6: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/CriteriaPage.jsx
git commit -m "feat(criteria): apply mobile card selection model

Inline editor triggers tagged as row-inline-control to preserve
the cell-editing UX while adopting the global selection pattern.
"
```

---

## Task 12: Attach `useCardSelection` to `OutcomesPage`

**Files:**
- Modify: `src/admin/pages/OutcomesPage.jsx`

- [ ] **Step 1: Import + hook + ref**

Add `import useCardSelection from "@/shared/hooks/useCardSelection";`

Inside the component: `const mobileScopeRef = useCardSelection();`

Attach `ref={mobileScopeRef}` to the container that maps over outcomes rendering `.acc-m-card`.

- [ ] **Step 2: Annotate `.acc-m-card` as selectable**

Add `data-card-selectable=""`.

- [ ] **Step 3: Remove legacy `menu-open` / `is-active` className conditionals**

Run: `grep -n "menu-open\|is-active" src/admin/pages/OutcomesPage.jsx`

Remove any conditional classes bound to `openMenuId === ...`.

- [ ] **Step 4: Build + tests + manual check**

Same as Task 11.

- [ ] **Step 5: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/OutcomesPage.jsx
git commit -m "feat(outcomes): apply mobile card selection model"
```

---

## Task 13: Attach `useCardSelection` to `RankingsPage`

**Files:**
- Modify: `src/admin/pages/RankingsPage.jsx`

- [ ] **Step 1: Import + hook + tbody ref**

Add `import useCardSelection from "@/shared/hooks/useCardSelection";`

Inside the component: `const rowsScopeRef = useCardSelection();`

Attach `ref={rowsScopeRef}` to the `<tbody>` around line 867.

- [ ] **Step 2: Annotate `<tr>` as selectable**

On line 867, add `data-card-selectable=""`.

- [ ] **Step 3: Build + tests + manual check**

Same as before. Rankings has no kebab so verify only: tap selects, tap another moves selection, no other visual change.

- [ ] **Step 4: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/RankingsPage.jsx
git commit -m "feat(rankings): apply mobile card selection model"
```

---

## Task 14: Attach `useCardSelection` to `ReviewsPage` / `ReviewMobileCard`

**Files:**
- Modify: `src/admin/pages/ReviewsPage.jsx`
- Modify: `src/admin/components/ReviewMobileCard.jsx`

- [ ] **Step 1: Identify scope and card**

`ReviewMobileCard` renders a `.rmc-card` div. It is the card root. Its parent on `ReviewsPage` is the container that maps over review items.

- [ ] **Step 2: Add hook at the parent (ReviewsPage)**

Add `import useCardSelection from "@/shared/hooks/useCardSelection";`

Inside the component: `const rowsScopeRef = useCardSelection();`

Attach `ref={rowsScopeRef}` to the container that maps `ReviewMobileCard` instances (the parent wrapping the `.map(...)`).

- [ ] **Step 3: Annotate the card root as selectable**

In `ReviewMobileCard.jsx`, find the top-level `<div className="rmc-card">` (line ~103) and add `data-card-selectable=""` to it.

- [ ] **Step 4: Tag the comment toggle button**

In `ReviewMobileCard.jsx` around line 160, add `row-inline-control` to the comment toggle button's className (preserving existing classes):

```jsx
<button
  className="rmc-comment-toggle row-inline-control"
  ...
>
```

- [ ] **Step 5: Build + tests + manual check**

Run: `npm run build && npm test -- --run src/admin/__tests__/ReviewMobileCard.test.jsx`

Manual: visit Reviews page on mobile viewport. Confirm selection on card tap; confirm comment toggle still works without affecting selection.

- [ ] **Step 6: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/ReviewsPage.jsx src/admin/components/ReviewMobileCard.jsx
git commit -m "feat(reviews): apply mobile card selection model

Comment toggle tagged as row-inline-control so it remains an
intra-card disclosure without triggering row selection.
"
```

---

## Task 15: Attach `useCardSelection` to `JurorHeatmapCard`

**Files:**
- Modify: `src/admin/pages/HeatmapPage.jsx` (or parent that renders `HeatmapMobileList`)
- Modify: `src/admin/pages/JurorHeatmapCard.jsx`

- [ ] **Step 1: Locate the list scope**

`HeatmapMobileList.jsx` renders multiple `JurorHeatmapCard` plus a single `ProjectAveragesCard`. The scope is the list element inside `HeatmapMobileList`.

- [ ] **Step 2: Add hook + ref at `HeatmapMobileList`**

Open `src/admin/pages/HeatmapMobileList.jsx`. Add:

```jsx
import useCardSelection from "@/shared/hooks/useCardSelection";
```

Inside the component: `const scopeRef = useCardSelection();`

Attach `ref={scopeRef}` to the wrapper element of the mapped cards.

- [ ] **Step 3: Annotate only `JurorHeatmapCard` as selectable**

`JurorHeatmapCard.jsx` line 86 — the `<article className="hm-card">`. Add `data-card-selectable=""` to this article.

**Do NOT** add `data-card-selectable` to `ProjectAveragesCard` — the spec excludes it from selection (footer summary).

- [ ] **Step 4: Keep the existing expand/collapse button untouched**

The card's internal `<button className="hm-card-toggle">` already consumes the pointer event for expand. Because our hook uses `pointerdown` on the scope (delegated), both handlers fire in order: the hook adds `.is-selected`, and the button's React click fires separately to toggle `.is-expanded`. No change needed here.

- [ ] **Step 5: Build + tests + manual check**

Run: `npm run build && npm test -- --run src/admin/__tests__`

Manual: visit Heatmap page on mobile viewport. Tap a juror card. Verify: card expands AND border turns accent. Tap another juror card: previous collapses (or keeps its own state — that's already controlled locally), previous loses `.is-selected`, new one gets it. `ProjectAveragesCard` never selects.

- [ ] **Step 6: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/HeatmapMobileList.jsx src/admin/pages/JurorHeatmapCard.jsx
git commit -m "feat(heatmap): apply mobile card selection model to juror cards

ProjectAveragesCard excluded from selection (footer summary,
not a per-row card).
"
```

---

## Task 16: Migrate `AuditLogPage` — remove legacy `is-active`, adopt `useCardSelection`

**Files:**
- Modify: `src/admin/pages/AuditLogPage.jsx`

- [ ] **Step 1: Import + hook + ref**

Add `import useCardSelection from "@/shared/hooks/useCardSelection";`

Inside the component: `const rowsScopeRef = useCardSelection();`

Attach `ref={rowsScopeRef}` to the parent that wraps the `.map(...)` rendering `.mcard.amc` cards.

- [ ] **Step 2: Remove legacy `is-active` from className**

Current (line 835):

```jsx
className={["mcard", "amc", isWarning ? "amc-warning" : "", isSelected ? "is-active" : ""].filter(Boolean).join(" ")}
```

After:

```jsx
className={["mcard", "amc", isWarning ? "amc-warning" : ""].filter(Boolean).join(" ")}
```

Keep the `isWarning` class. The `is-active` visual is now replaced by `is-selected` from the hook.

- [ ] **Step 3: Annotate as selectable**

Add `data-card-selectable=""` to the same element (around line 835).

- [ ] **Step 4: Keep the existing card onClick that opens the AuditEventDrawer**

AuditLog is an exception to Pattern B — tapping the card opens the drawer (Pattern A behavior, already present). Retain that onClick. Selection and drawer open will now happen together: the hook's pointerdown runs first, then the click/onClick fires.

- [ ] **Step 5: Build + tests + manual check**

Run: `npm run build && npm test -- --run src/admin/__tests__`

Manual: visit Audit Log page on mobile viewport. Tap an audit card. Verify:
- Border becomes accent (via `.is-selected`).
- Drawer opens (existing behavior).
- Tap another audit card → previous deselects, new one selects, drawer updates.

- [ ] **Step 6: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/AuditLogPage.jsx
git commit -m "feat(audit-log): replace is-active with global is-selected

Adopts useCardSelection. Existing drawer-on-tap behavior
preserved; selection and drawer open state are now unified.
"
```

---

## Task 17: Attach `useCardSelection` to `EntryControlPage`, `PinBlockingPage`, `OverviewPage`

**Files:**
- Modify: `src/admin/pages/EntryControlPage.jsx`
- Modify: `src/admin/pages/PinBlockingPage.jsx`
- Modify: `src/admin/pages/OverviewPage.jsx`

For each file, repeat the same three-step pattern. Below for `EntryControlPage`; apply identically to the others.

- [ ] **Step 1: Import + hook + ref**

Add `import useCardSelection from "@/shared/hooks/useCardSelection";`

Inside the component: `const rowsScopeRef = useCardSelection();`

- [ ] **Step 2: Locate the `<tbody>` that holds the relevant table**

- `EntryControlPage`: `<tbody>` inside `.entry-history-table`.
- `PinBlockingPage`: `<tbody>` inside `.pin-lock-table`.
- `OverviewPage`: `<tbody>` inside `.overview-top-projects-table`.

Attach `ref={rowsScopeRef}` to that tbody.

- [ ] **Step 3: Annotate each `<tr>` as selectable**

Add `data-card-selectable=""` to the `<tr>` inside the map.

- [ ] **Step 4: Remove any legacy `menu-open` / `is-active` conditional classNames**

Run: `grep -n "menu-open\|is-active" src/admin/pages/EntryControlPage.jsx src/admin/pages/PinBlockingPage.jsx src/admin/pages/OverviewPage.jsx`

Remove any matches bound to an open-menu state. Leave unrelated `is-active` classes (e.g., active filters in filter bars) alone.

- [ ] **Step 5: Build + tests + manual check**

Run: `npm run build && npm test -- --run src/admin/__tests__`

Manual: visit each page on mobile viewport, confirm selection works.

- [ ] **Step 6: Commit**

Only commit if the user has asked you to.

```bash
git add src/admin/pages/EntryControlPage.jsx src/admin/pages/PinBlockingPage.jsx src/admin/pages/OverviewPage.jsx
git commit -m "feat(misc-tables): apply mobile card selection model

Entry Control, Pin Blocking, Overview top-projects. Kebab-less
cards — selection only.
"
```

---

## Task 18: Final verification

**Files:** none (read-only checks)

- [ ] **Step 1: Full build**

Run: `npm run build`

Expected: exits 0.

- [ ] **Step 2: Full test suite**

Run: `npm test -- --run`

Expected: all tests pass.

- [ ] **Step 3: No-native-select guard**

Run: `npm run check:no-native-select`

Expected: exits 0.

- [ ] **Step 4: Nested panels guard**

Run: `npm run check:no-nested-panels`

Expected: exits 0.

- [ ] **Step 5: Grep for residual legacy classes**

Run: `grep -rn "juror-action-btn\|sem-action-btn" src/`

Expected: no matches (all renamed).

Run: `grep -rn "menu-open\|row-menu-open" src/admin src/styles/mobile.css`

Expected: no matches on row-highlight className usages; unrelated occurrences (e.g., filter panel states) are fine.

- [ ] **Step 6: Visual regression sweep**

Run: `npm run dev`

In Chrome DevTools mobile viewport (375×667, portrait), visit each page and confirm:

- Projects, Jurors, Periods, Organizations, Criteria, Outcomes — kebab is 44×44 tap target, card selection border works, inline controls don't trigger selection.
- Rankings, Reviews, Heatmap, Audit Log — card selection border works.
- Entry Control, Pin Blocking, Overview top projects — card selection border works.
- Dark mode (toggle): selection border still visible.

- [ ] **Step 7: Commit any test fixes (if needed)**

Only commit if the user has asked you to. If any test failed and was updated to reflect the new class names or removed legacy classes, add those changes to a final housekeeping commit:

```bash
git add <touched test files>
git commit -m "test(admin): align assertions with row-action-btn rename"
```

- [ ] **Step 8: Report done**

Summarize: classes migrated, pages touched, tests updated. Suggest the user push when ready.

---

## Spec Coverage Check

- D1 Tap Model (Pattern B + persistent selection) → Tasks 1, 7–17 (hook + per-page adoption)
- D2 Kebab 44×44 mobile tap target → Task 2 (+ icon size bumps in Task 6)
- D3 Global `.row-action-btn` rename → Tasks 2, 5, 6
- D4 Card selection feedback (`.is-selected` + `--accent`) → Tasks 1, 3, 7–17
- D5 Kebab `:active` pressed state → Task 2 (within `.row-action-btn` block)
- D6 Deprecate `.menu-open` / `.is-active` row highlights → Tasks 4, 6, 7–17
- D7 Reviews (no kebab, inline toggle preserved) → Task 14
- Exception: ProjectAveragesCard excluded → Task 15 Step 3 (explicit "do NOT annotate")
- Exception: AuditLog replaces is-active with is-selected → Task 16
- CLAUDE.md rule addition → handled locally during the brainstorm (CLAUDE.md is gitignored — rule is applied to the user's working copy)

# Admin Panel — Phase 2 — Implementation Plan

> **Status as of 2026-04-02:** All tasks complete. Task 16 (visual verification) blocked pending DB migration to new schema.

## Context

Phase 1 (Foundation) is complete — all design tokens, typography, base components migrated. The real codebase now has the correct color palette, fonts, shadows, and component dimensions matching `docs/concepts/vera-premium-prototype.html`.

**Problem:** The admin panel has 15 pages that need to match the prototype visually AND functionally. A significant amount of structural work (page decomposition, layout components, hooks) is already done in unstaged changes (~84 files), but needs to be committed, naming-updated, CSS-migrated, and enhanced with new features the prototype requires.

**Goal:** Complete the admin UI migration — commit existing work, apply naming updates, migrate remaining legacy CSS, add missing features, and ensure all 15 admin pages match the prototype 1:1 in both light and dark mode.

**Spec:** `docs/superpowers/specs/2026-04-01-prototype-to-code-design.md` (Phase 2 section)

**Prototype:** `docs/concepts/vera-premium-prototype.html`

**Tech Stack:** Tailwind CSS v4, shadcn/ui (base-nova), Plus Jakarta Sans, JetBrains Mono, Recharts (charts)

---

## Phase 1: Commit Existing Work & Naming Updates ✅

### Task 1: Commit core layout + infrastructure ✅

**Commit:** `a95607e feat(admin): add layout components, sidebar, header, and extracted hooks`

- [x] **Step 1:** Identify all new/modified layout, hook, and UI component files via `git status`
- [x] **Step 2:** Stage and commit core layout + hooks + new UI components
- [x] **Step 3:** Run `npm run build` — must pass
- [x] **Step 4:** Run `npm test -- --run` — must pass
- [x] **Step 5:** Commit message: `feat(admin): add layout components, sidebar, header, and extracted hooks`

---

### Task 2: Commit page decomposition ✅

**Commit:** `47475ef feat(admin): decompose settings into 8 standalone page components`

- [x] **Step 1:** Stage page components, deleted files, and AdminPanel changes
- [x] **Step 2:** Run `npm run build` && `npm test -- --run` — must pass
- [x] **Step 3:** Commit message: `feat(admin): decompose settings into 8 standalone page components`

---

### Task 3: Commit remaining unstaged component changes ✅

**Commit:** `e3db91d feat: update components for new admin layout and theme integration`

- [x] **Step 1:** Review remaining `git diff` for any problematic changes
- [x] **Step 2:** Stage all remaining modified source files
- [x] **Step 3:** Run build + tests
- [x] **Step 4:** Commit message: `feat: update components for new admin layout and theme integration`

---

### Task 4: Naming updates — UI text only ✅

**Commits:** `b1ec8af`, `c0dfab3 refactor(admin): apply UI naming updates`

Renames applied: Semester → Period, Department → Affiliation, Project Title → Title, Supervisor → Advisor, Students → Team Members, Tenant → Organization.

- [x] **Step 1:** Search and replace UI-visible strings across all admin files
- [x] **Step 2:** Update test files that assert on renamed text
- [x] **Step 3:** Run build + tests — must pass
- [x] **Step 4:** Commit message: `refactor(admin): apply UI naming updates (Period, Affiliation, Advisor, Team Members, Organization)`

---

## Phase 2: Legacy CSS Migration

### Task 5: Migrate admin-matrix.css → Tailwind (ScoreGrid) ✅

**Commit:** `a2fcbcd refactor(scores): migrate ScoreGrid from legacy CSS to Tailwind (Phase 5C)`

- [x] **Step 1:** Catalog all CSS classes used from admin-matrix.css in ScoreGrid.jsx
- [x] **Step 2:** Map each to Tailwind utilities using new design tokens
- [x] **Step 3:** Replace className strings in ScoreGrid.jsx
- [x] **Step 4:** Update scoreHelpers.js color class references to use Tailwind
- [x] **Step 5:** Remove import from AdminPanel.jsx
- [x] **Step 6:** Delete `src/styles/admin-matrix.css`
- [x] **Step 7:** Run build + tests — must pass
- [x] **Step 8:** Commit: `refactor(scores): migrate ScoreGrid from legacy CSS to Tailwind`

---

### Task 6: Migrate admin-details.css → Tailwind (ScoreDetails) ✅

**Commit:** `1ff364b refactor(scores): migrate ScoreDetails from legacy CSS to Tailwind`

**Branch/Worktree:** `feat/admin-details-tailwind` at `.worktrees/admin-details`

- [x] **Step 1:** Catalog all CSS classes used from admin-details.css
- [x] **Step 2:** Map to Tailwind utilities (design tokens + globals.css for JS-toggled/shared classes)
- [x] **Step 3:** Replace in ScoreDetailsTable.jsx, ScoreDetailsFilters.jsx, ScoreDetailsHeader.jsx, ScoreDetails.jsx
- [x] **Step 4:** Remove import from AdminPanel.jsx
- [x] **Step 5:** Delete `src/styles/admin-details.css`
- [x] **Step 6:** Run build + tests — 53 files, 403 tests passed
- [x] **Step 7:** Commit: `refactor(scores): migrate ScoreDetails from legacy CSS to Tailwind`

---

### Task 7: Restyle Rankings table ✅

**Commit:** `084bf8b feat(scores): restyle Rankings table to match prototype`

- [x] **Step 1:** Compare current markup with prototype Rankings page
- [x] **Step 2:** Replace legacy classes/inline styles with Tailwind
- [x] **Step 3:** Use shadcn Table component if not already
- [x] **Step 4:** Run build + tests
- [x] **Step 5:** Commit: `feat(scores): restyle Rankings table to match prototype`

---

## Phase 3: New Features & Functions

### Task 8: Overview — "Needs Attention" card ✅

**Commit:** `375e976 feat(overview): add Needs Attention card with auto-detected issues`

- [x] **Step 1:** Write `computeNeedsAttention` in `overviewMetrics.js` + unit test
- [x] **Step 2:** Create `NeedsAttentionCard.jsx`
- [x] **Step 3:** Integrate into `OverviewTab.jsx`
- [x] **Step 4:** Run tests
- [x] **Step 5:** Commit: `feat(overview): add Needs Attention card with auto-detected issues`

---

### Task 9: Overview — "Period Snapshot" card ✅

**Commit:** `dd5ee64 feat(overview): add Period Snapshot summary card`

- [x] **Step 1:** Create `PeriodSnapshotCard.jsx` with key-value grid layout
- [x] **Step 2:** Integrate into `OverviewTab.jsx`
- [x] **Step 3:** Run tests
- [x] **Step 4:** Commit: `feat(overview): add Period Snapshot summary card`

---

### Task 10: Overview — "Top Projects" highlight ✅

**Commits:** `095663d`, `ec85180 feat(overview): add Top Projects highlight card with auto-ranking`

- [x] **Step 1:** Write `computeTopProjects` in `overviewMetrics.js` + unit test
- [x] **Step 2:** Create `TopProjectsCard.jsx`
- [x] **Step 3:** Integrate into `OverviewTab.jsx`
- [x] **Step 4:** Run tests
- [x] **Step 5:** Commit: `feat(overview): add Top Projects highlight card with auto-ranking`

---

### Task 11: Sidebar navigation labels update ✅

**Commits:** `7ebc3ee feat(admin): restructure sidebar navigation to match prototype sections`, `a5e2495`

Sections: Overview / Evaluation: Rankings, Analytics, Grid, Details / Manage: Jurors, Projects, Periods / Configuration: Evaluation Criteria, Outcomes & Mapping / System: Entry Control, Audit Log, Export, Settings.

- [x] **Step 1:** Update `NAV_SECTIONS` array in AdminSidebar.jsx
- [x] **Step 2:** Add new tab IDs for "criteria" and "outcomes" in useAdminTabs
- [x] **Step 3:** Add page rendering in AdminPanel.jsx for new tab IDs
- [x] **Step 4:** Run build + tests
- [x] **Step 5:** Commit: `feat(admin): restructure sidebar navigation to match prototype sections`

---

### Task 12: Score-based field locking UI ✅

**Commits:** `3816aab feat(criteria): add score-based field locking UI with info banner`, `1a63520`

- [x] **Step 1:** Read current CriteriaManager + CriterionEditor
- [x] **Step 2:** Add info banner: "Scores exist — weights and rubric ranges are locked"
- [x] **Step 3:** Add lock icon overlay on weight/rubric inputs when locked
- [x] **Step 4:** Style disabled fields with reduced opacity + cursor-not-allowed
- [x] **Step 5:** Run tests
- [x] **Step 6:** Commit: `feat(criteria): add score-based field locking UI with info banner`

---

### Task 13: Analytics chart theme integration ✅

**Commits:** `972abc5`, `416bc42`, `c98c8c9 feat/fix(charts): integrate chart colors with design token system`

- [x] **Step 1:** Update `chartUtils.jsx` with token-based color getters
- [x] **Step 2:** Update each chart component to use token colors
- [x] **Step 3:** Verify charts render correctly in both modes
- [x] **Step 4:** Run build
- [x] **Step 5:** Commit: `feat(charts): integrate chart colors with design token system`

---

### Task 14: Form drawer/modal visual polish ✅

**Commits:** `f1f4685 feat(admin): polish form drawers and modals to match prototype`, `7221b6a`

- [x] **Step 1:** Audit each form for prototype compliance
- [x] **Step 2:** Standardize headers, footers, field sizing
- [x] **Step 3:** Run build + tests
- [x] **Step 4:** Commit: `feat(admin): polish form drawers and modals to match prototype`

---

## Phase 4: Testing & Final Verification

### Task 15: Update all admin tests ✅

All 403 tests already pass after Task 6 migration (CSS class names preserved in globals.css, no selector renames). ScoreDetails.test.jsx and ScoreDetails.filter.test.jsx both pass. No additional fixes needed.

---

### Task 16: Final visual verification ⏳ Blocked

**Blocker:** PostgREST migration (commit `b33d3c8`) rewrote `src/shared/api/admin/auth.js`
to query the new `memberships` + `organizations` tables, but demo Supabase (`kmprsxrofnemmsryjhfj`)
still runs the old schema (`tenant_admin_memberships` + `tenants`). Login always lands on the
"Application Pending" screen because `getSession()` gets an error → `organizations = []` → `isPending = true`.

**Pre-condition:** Apply DB migration (`001–004` SQL files) to demo Supabase first (see `phase-3-db-rest-migration.md`).

After DB migration is applied:

- [ ] **Step 1:** Run `npm run dev` and compare each admin page side-by-side with prototype
- [ ] **Step 2:** Check both light and dark mode for all 15 pages
- [ ] **Step 3:** Verify responsive behavior (sidebar collapse, mobile layout)
- [ ] **Step 4:** Ensure no console errors or warnings
- [ ] **Step 5:** Run `npm run build` — production build must succeed
- [ ] **Step 6:** Run `npm test -- --run` — all tests pass

---

## DB-Dependent Features (Deferred — Stubs Only)

| Feature | DB Change Needed | Stub Approach |
|---------|-----------------|---------------|
| Advisor field on projects | ADD `advisor` column | Show field in form, disabled with "Coming soon" tooltip |
| Description field on projects/periods | ADD `description` columns | Same stub approach |
| Email field on jurors | ADD `email` column | Same stub approach |
| Direct/Indirect outcome mapping | ADD `coverage_override` column | Show toggle UI, disabled with info banner |
| Framework per period | Potential schema change | Show selector, use MUDEK as default |

---

## Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Commit + Naming | Tasks 1–4 | ✅ All done |
| Phase 2: CSS Migration | Tasks 5–7 | ✅ All done |
| Phase 3: New Features | Tasks 8–14 | ✅ All done |
| Phase 4: Testing + Verify | Tasks 15–16 | Task 15 ✅, Task 16 ⏳ blocked |

**Remaining:** Task 16 (visual verify) — blocked until DB migration (`phase-3-db-rest-migration.md`) is applied to demo Supabase.

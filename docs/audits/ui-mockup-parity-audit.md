# UI Mockup Parity Audit

## Scope

- **Mockup source:** `docs/concepts/vera-premium-prototype.html`
- **Implementation source:** `.worktrees/ui-rewrite/` (branch `feat/ui-rewrite`, commit `f4295e4`)
- **Screens analyzed:** Shared shell/theme, Overview, Analytics, Heatmap, Reviews
- **Date:** 2026-04-02

## Root Cause Classification

| Code | Root Cause | Description |
| ---- | ---------- | ----------- |
| T | Theme Drift | Shared CSS or global style diverges from prototype |
| P | Page-level Divergence | Sections restructured/reordered vs prototype |
| J | Wrong JSX Transformation | Incorrect text/label in React translation |
| W | Never Ported | Content exists in prototype but was never implemented |

## Findings

### Area 1 -- Shared Admin Shell / Theme Layer

**Overall: EXCELLENT match.** Dark-mode gradients, glassmorphism, sidebar colors exact.

#### F-001 -- Light-mode background gradient simplified

- **Severity:** Low
- **Type:** T
- **Prototype:** 2 radial glow gradients overlaid on `#f0f4f8`
- **Worktree:** Solid `var(--bg-page)` = `#f4f7fb`
- **Assessment:** Dark mode has full gradient. Light simplified intentionally.

#### F-002 -- Light-mode header shade

- **Severity:** Low
- **Type:** T
- **Prototype:** `#f6f8fb`
- **Worktree:** `var(--bg-card)` = `#fafbfd`
- **Assessment:** Negligible visual difference.

#### Verified matches (shell layer)

- Dark-mode admin-main 3-layer gradient: EXACT MATCH
- Dark-mode header glassmorphism (blur, saturate, inset shadow): EXACT MATCH
- Sidebar background `#0f172a`: EXACT MATCH
- Sidebar active item `rgba(59,130,246,0.15)` + `#93c5fd`: EXACT MATCH
- Dark dropdown glassmorphism: EXACT MATCH
- Sidebar tenant menu glassmorphism: EXACT MATCH
- Card base styles: MATCH
- Typography (Plus Jakarta Sans, JetBrains Mono): MATCH

### Area 2 -- Overview Page

**Overall: GOOD match.** Core structure present, 3 sections never ported.

#### Verified matches (Overview)

| Component | Status |
| --------- | ------ |
| Page title "Overview" | EXACT MATCH |
| Subtitle "Real-time evaluation progress and jury activity" | EXACT MATCH |
| KPI Grid (Active Jurors, Projects/Groups, Completion%, Avg Score) | MATCH |
| Live Jury Activity table | MATCH (labeled "Live Jury Activity" vs "Live Feed" in table header) |
| Needs Attention card | MATCH |
| Period Snapshot card | MATCH |
| Completion by Group card | MATCH |
| Top Projects card | MATCH |

#### F-010 -- Live Feed card missing

- **Severity:** Medium
- **Type:** W
- **Prototype:** Real-time event log with 4 event types: scored (star icon), started (play), idle warning (triangle), completed (sun)
- **Worktree:** Not implemented
- **Prototype location:** Lines 11864-11914

#### F-011 -- Submission Timeline chart missing

- **Severity:** Medium
- **Type:** W
- **Prototype:** Canvas line chart showing scoring activity over time, subtitle "Peak activity: 13:20 -- 14:10"
- **Worktree:** Not implemented
- **Prototype location:** Lines 11951-11957

#### F-012 -- Score Distribution chart missing

- **Severity:** Medium
- **Type:** W
- **Prototype:** Canvas histogram showing score distribution, subtitle "Most scores clustered in 73--88 range"
- **Worktree:** Not implemented
- **Prototype location:** Lines 11958-11962

### Area 3 -- Analytics Page

**Overall: SIGNIFICANT GAPS.** Core attainment sections never ported.

#### Verified matches (Analytics)

| Component | Status |
| --------- | ------ |
| KPI summary strip (4 metrics) | MATCH |
| MUDEK badge with popover | MATCH |
| Export buttons (PDF, Excel) | MATCH (simplified from panel) |
| Outcome by Group chart | MATCH (renumbered from section 03 to 01) |
| Programme Overview charts | MATCH |
| Continuous Improvement / Trends | MATCH |
| Assessment Reliability heatmap | MATCH |

#### F-020 -- Analytics page title/subtitle not rendered

- **Severity:** High
- **Type:** W
- **Prototype title:** "Programme Outcome Analytics"
- **Prototype subtitle:** "Outcome attainment & continuous improvement evidence -- Summer 2026"
- **Worktree:** KPI strip renders, but no page title/subtitle visible

#### F-021 -- Analytics navigation tabs missing

- **Severity:** High
- **Type:** W
- **Prototype:** 6 horizontal scroll tabs (Attainment Status, Analysis, Programme Overview, Trends, Reliability, Coverage)
- **Worktree:** No navigation tabs. Sections stacked without quick-links.

#### F-022 -- Attainment Status cards missing

- **Severity:** Critical
- **Type:** W
- **Prototype:** 8 traffic-light outcome cards with PO code, status badge (Met/Borderline/Not Met), percentage, trend arrow, horizontal progress bar
- **Worktree:** Not implemented
- **Impact:** First and most prominent section of Analytics. Defines the attainment-centric identity.

#### F-023 -- Attainment Analysis charts missing

- **Severity:** High
- **Type:** W
- **Prototype:** Two-column layout:
  - Outcome Attainment Rate (horizontal bar chart with 70% threshold line)
  - Threshold Gap Analysis (diverging lollipop chart)
- **Worktree:** Not implemented

#### F-024 -- Group-Level Attainment section missing

- **Severity:** Medium
- **Type:** W
- **Prototype Section 06:** Additional group-level outcome visualization
- **Worktree:** Not implemented

#### F-025 -- Insight banners missing

- **Severity:** Medium
- **Type:** W
- **Prototype:** 4+ blue info banners between chart sections with interpretation messages
- **Worktree:** No equivalent messaging system

#### F-026 -- Section numbering and ordering differs

- **Severity:** Medium
- **Type:** P
- **Prototype:** 01-Attainment, 02-Analysis, 03-Outcome by Group, 04-Programme Overview, 05-Trends, 06-Group Attainment, 07-Reliability
- **Worktree:** 01-Outcome by Group, 02-Programme Overview, 03-Trends, 04-Reliability, 05-Criterion Analytics (NEW)

### Area 4 -- Heatmap Page

**Overall: EXCELLENT match.**

#### Verified matches (Heatmap)

| Component | Status |
| --------- | ------ |
| Page title "Heatmap" | EXACT MATCH |
| Subtitle "Compare juror scoring patterns across projects and criteria." | EXACT MATCH |
| Sidebar nav label "Heatmap" | EXACT MATCH |
| Criteria tab bar (All Criteria + per-criterion tabs) | PRESENT (dynamic from config) |
| Matrix table with sticky columns | MATCH |
| Average row in footer | MATCH |
| Color-coded heatmap cells | MATCH |

#### F-030 -- Export button text differs

- **Severity:** Low
- **Type:** J
- **Prototype:** "Export" (opens multi-format panel with XLSX/CSV/PDF)
- **Worktree:** "Excel" (direct export)
- **Assessment:** Simplified export UX, functional.

### Area 5 -- Reviews Page

**Overall: EXCELLENT match.**

#### Verified matches (Reviews)

| Component | Status |
| --------- | ------ |
| Page title "Reviews" | EXACT MATCH |
| Subtitle "Inspect individual juror evaluations across projects and criteria." | EXACT MATCH |
| Sidebar nav label "Reviews" | EXACT MATCH |
| KPI summary strip (Reviews, Jurors, Projects, Partial, Avg Score) | MATCH |
| Status legend (Score: Scored/Partial/Empty + Juror: 5 states) | MATCH |
| Search input | PRESENT |
| Filter system | PRESENT (refactored to column popovers) |
| Export | PRESENT (simplified to single button) |

#### F-040 -- Filter banner architecture differs

- **Severity:** Low
- **Type:** P
- **Prototype:** "3 filters applied -- showing 12 of 90 results" banner
- **Worktree:** Filter status via filter chips
- **Assessment:** Different UX pattern, functionally equivalent.

## Summary

### What matches well

- Shell/theme layer (~95% parity)
- Overview (core components present)
- Heatmap (~98% parity)
- Reviews (~95% parity)

### What is missing

| Priority | ID | Missing Component | Area |
| -------- | --- | ---------------- | ---- |
| Critical | F-022 | Attainment Status cards (8 traffic-light cards) | Analytics |
| High | F-023 | Attainment Analysis charts (bar + lollipop) | Analytics |
| High | F-020 | Analytics page title/subtitle | Analytics |
| High | F-021 | Analytics nav tabs (6 section links) | Analytics |
| Medium | F-025 | Insight banners (4+ interpretation messages) | Analytics |
| Medium | F-024 | Group-Level Attainment section | Analytics |
| Medium | F-010 | Live Feed card (real-time event log) | Overview |
| Medium | F-011 | Submission Timeline chart (canvas) | Overview |
| Medium | F-012 | Score Distribution chart (canvas) | Overview |

### Root cause breakdown

- **Never Ported (W):** 9 items -- All critical/high gaps
- **Page Divergence (P):** 2 items -- Section reordering, filter architecture
- **Theme Drift (T):** 2 items -- Light-mode gradient/shade (low impact)
- **Wrong JSX (J):** 1 item -- Export button label

## Fix Priority Order

1. F-022 -- Attainment Status cards (Analytics core identity)
2. F-023 -- Attainment Analysis charts (Rate + Gap)
3. F-020 -- Analytics title/subtitle
4. F-021 -- Analytics nav tabs
5. F-025 -- Insight banners
6. F-010 -- Live Feed card
7. F-011 -- Submission Timeline chart
8. F-012 -- Score Distribution chart
9. F-024 -- Group-Level Attainment
10. F-026 -- Analytics section reordering

## Decision Log

- Audit compares `.worktrees/ui-rewrite/` (not main branch) against prototype
- Light-mode gradient simplification accepted as intentional
- Filter/export UX simplifications accepted (modern patterns)
- Analytics is the primary gap: 6 of 9 missing items are in Analytics

## Definition of Done Checklist

- [x] Background parity (dark mode exact, light mode acceptable)
- [x] Section name parity (Heatmap, Reviews correct)
- [x] Heatmap correct (title, tabs, grid all present)
- [x] Reviews correct (title, KPI strip, legend all present)
- [ ] Analytics: Attainment cards present
- [ ] Analytics: Analysis charts present
- [ ] Analytics: Title/subtitle rendered
- [ ] Analytics: Nav tabs present
- [ ] Overview: Live Feed present
- [ ] Overview: Timeline + Distribution charts present

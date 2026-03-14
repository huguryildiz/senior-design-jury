# Hook: qa-checklist

## Purpose

Manual QA steps to run after significant changes or before an evaluation event.

## Quick Smoke Test (5 minutes)

1. `npm run dev` — app starts without errors
2. Home screen renders with TEDU logo, two buttons
3. Click "Start Evaluation" → PIN entry screen appears
4. Click "Admin Panel" → password login appears
5. Log in with admin password → admin panel loads (Overview tab)

## Jury Flow QA

1. Enter correct 4-digit PIN → advances to Info step
2. Enter name and department → advances to Semester step
3. Select active semester → project list loads
4. Enter scores for one project → scores saved (check DB or admin Scores tab)
5. Submit all → Done screen appears

## Admin Panel QA

1. Overview tab → juror completion stats visible
2. Scores tab → all submitted evaluations listed
3. Rankings tab → projects sorted by average score
4. Analytics tab → at least one chart renders correctly
5. Settings → open Semesters panel → active semester shown

## After Code Changes

- Run `npm test -- --run` — all unit tests pass
- Check that modified components render without console errors
- If charts were changed: open Analytics tab and confirm charts render

## Pre-Event Final Check

- [ ] `.env.local` points to production Supabase (not E2E test project)
- [ ] Active semester is correct
- [ ] Admin password is known to the coordinator
- [ ] All jurors are added and assigned
- [ ] All projects are imported

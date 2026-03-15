# Release Blockers

This document lists issues that would block a production evaluation event. Theoretical or low-probability risks are excluded.

**Scope:** Internal academic tool, used 2–3 days per year by ~10–30 jurors.

---

## Active Blockers

None currently identified. The application has been used in production evaluation events.

---

## Conditions That Would Become Blockers

### B1 — Unsaved Change Data Loss (Settings Panels)

**Condition:** Admin edits a semester or project form, accidentally navigates away, and loses the changes with no warning.

**Risk level:** Medium — likely to occur during rushed event-day setup.

**Resolution:** Implement `isDirty` guard (see `docs/implementation_plan.md` Phase 1.1).

---

### B2 — Supabase Connectivity During Event

**Condition:** If Supabase is unreachable on evaluation day, the app is non-functional (no offline mode).

**Risk level:** Low — Supabase has high uptime. Mitigation is ensuring event-day network is reliable.

**Resolution:** No code change required. Operational mitigation: test connectivity before the event.

---

### B3 — Wrong Active Semester Set

**Condition:** Admin leaves the wrong semester active. Jurors submit evaluations to the wrong semester.

**Risk level:** Low — easy to catch before the event if admin checks Settings beforehand.

**Resolution:** No code change required. Operational checklist: verify active semester on event morning.

---

## Non-Blockers (Explicitly Excluded)

- **State-based routing** — no deep linking needed for this use case
- **4-digit PIN security** — rate limiting is in place; brute force requires many attempts
- **No caching** — acceptable; data volume is small
- **Admin prop drilling** — hierarchy is shallow; no real maintenance risk at this scale
- **Limited mobile support for admin** — admin operates from a desktop/laptop
- **No progress indicator for CSV import** — imports are small (< 100 rows)

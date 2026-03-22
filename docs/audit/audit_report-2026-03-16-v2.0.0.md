# Final Production Audit Report — Independent Review

Date: 2026-03-16
Version: v2.0.0
Reviewer approach: Fresh, independent assessment from first principles.
No prior audit reports were consulted. Findings are based solely on the
current state of the repository.

---

## 1. Final Verdict

**Ready with minor issues.**

The core jury evaluation flow and admin management layer are production-sound.
Security architecture is thoughtful and appropriately matched to the deployment
scale. The remaining issues are bounded: one concrete security gap in the
Edge Function CORS logic, a handful of fragile error-detection patterns, and
accessibility work that is started but not fully complete. None of these block
deployment for an internal tool operating at the described scale (~30 jurors,
~20 projects, 2–3 days per year).

---

## 2. Strengths

**RPC proxy pattern is well-executed.** `USE_PROXY = !import.meta.env.DEV`
is a clean binary: production traffic always routes through the Edge Function,
the RPC secret never appears in the client bundle, and the dev fallback is
clearly scoped. The ALLOWED_PREFIX guard (`rpc_admin_`) in `rpc-proxy/index.ts`
adds a meaningful second layer.

**Write strategy is sophisticated and correct.** The combination of
`pendingScoresRef` / `pendingCommentsRef` (synchronous, render-decoupled),
`lastWrittenRef` deduplication, and `stateRef` (always-fresh snapshot) shows
careful reasoning about React's async commit model. The pattern correctly
handles rapid re-renders and avoids redundant RPCs.

**Retry logic is principled.** `withRetry` distinguishes network-level
failures from business errors, never retries `AbortError`, and applies
exponential backoff. Applied correctly to `upsertScore` and `listProjects`.

**Database integrity is DB-enforced, not client-enforced.** Score totals
are computed by a trigger (`trg_scores_compute_total`), not client code.
Constraints (0–30 / 0–10 per criterion, unique juror-project-semester)
are at the schema level. Audit logs are immutable (trigger blocks UPDATE
and DELETE on `audit_logs`).

**Session token ties writes to authenticated sessions.** `rpc_upsert_score`
requires a valid `p_session_token`, preventing anonymous score injection via
the anon key alone.

**AbortController usage is consistent.** `loadAbortRef` is replaced and
aborted before each new load sequence. `alive` / `if (!alive)` guards
prevent stale state updates after unmount or abort. Cleanup functions are
registered in `useEffect` returns.

**Test coverage is broad.** 18 admin test files, jury and shared tests,
an accessibility test, and a mature `qaTest` + Allure infrastructure.
276/276 passing at the last recorded run.

**Error boundaries prevent blank screens.** `<ErrorBoundary>` wraps both
`JuryForm` and `AdminPanel` with `role="alert"` and contextual fallback UI.

**Field mapping is centralized.** The `config.js` id → DB column translation
(`design→written`, `delivery→oral`) is applied only in `api.js` at the
boundary, never in components. The comment header makes the mapping explicit.

---

## 3. Remaining Issues

### Critical

**CORS wildcard bypass in rpc-proxy.**
[supabase/functions/rpc-proxy/index.ts:14](supabase/functions/rpc-proxy/index.ts#L14)

```typescript
const isAllowed = !origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*");
```

If `ALLOWED_ORIGINS` env var is set to `"*"` (documented as a dev pattern),
the proxy will reflect any `Origin` header back as allowed. Supabase Edge
Functions are public HTTPS endpoints — any page on the internet can POST to
this URL and receive a valid CORS response, bypassing browser same-origin
policy entirely. The RPC secret is injected server-side so it is not
directly exposed, but the proxy becomes a fully open relay for any caller
that knows the endpoint URL and has a valid `apikey`.

The fix is narrow: replace `allowedOrigins.includes("*")` with an explicit
`allowedOrigins[0] === "*"` check gated on a dev-only environment variable,
and ensure production `ALLOWED_ORIGINS` lists the actual deployment origin.

**Dead/phantom function in ALLOWED_EXTRAS.**
[supabase/functions/rpc-proxy/index.ts:45](supabase/functions/rpc-proxy/index.ts#L45)

```typescript
const ALLOWED_EXTRAS = ["rpc_bootstrap_admin_password"];
```

The client calls `rpc_admin_bootstrap_password`
([src/shared/api.js:608](src/shared/api.js#L608)),
which passes the `rpc_admin_` prefix check and never reaches the ALLOWED_EXTRAS
path. The name `rpc_bootstrap_admin_password` listed in ALLOWED_EXTRAS does not
correspond to any client call or (visibly) any SQL function. This creates an
allowed path to an unknown function. The entry should be removed or corrected
to reflect the actual intended function name.

### Medium

**`isSemesterLockedError` uses string matching.**
[src/jury/useJuryState.js:112-113](src/jury/useJuryState.js#L112)

```javascript
const isSemesterLockedError = (err) =>
  String(err?.message || "").includes("semester_locked");
```

This is the only mechanism that detects a locked-semester condition during
a score write. If the RPC error message wording changes (e.g. a Postgres
raise message is edited in SQL), the lock will silently stop being detected.
The juror will see a generic save error rather than the intentional "eval
is locked" state. Prefer matching on `err.code` using a known Postgres
SQLSTATE or a structured error code returned from the RPC.

**`writeGroup` on `visibilitychange` is fire-and-forget.**
[src/jury/useJuryState.js](src/jury/useJuryState.js)

The `visibilitychange` listener calls `writeGroup(pid)` without awaiting the
result and without surfacing a failure to the user. If a save fails on tab
hide (network drop, session expired), the juror has no indication. For an
eval tool where data loss is unacceptable, this is a meaningful gap. At
minimum the error should be written to the `saveStatus` state so the
indicator updates when the tab regains visibility.

**No conflict detection for concurrent sessions.**

`writeGroup` implements local deduplication via `lastWrittenRef`, but there
is no server-side optimistic lock. If a juror opens two browser tabs
simultaneously and edits the same group in both, the last write wins
silently. The DB `updated_at` column exists and could be used as a
compare-and-swap guard in `rpc_upsert_score`. At the current scale
(single juror per session, internal tool) this is unlikely but worth
tracking for completeness.

**No retry on admin data loads.**

`adminGetScores`, `adminListJurors`, `adminProjectSummary`, and
`adminGetOutcomeTrends` in [src/shared/api.js](src/shared/api.js) call
`callAdminRpc` directly with no `withRetry` wrapper. A transient network
blip during admin panel load will produce an error that looks identical to
an authentication failure (both surface as generic error state). For an
admin loading their dashboard on the day of evaluation, this is a confusing
and unnecessary failure mode.

**Focus management in dialogs is incomplete.**

Modal dialogs in `src/admin/settings/` and elsewhere use `role="dialog"` and
`aria-modal="true"`, but no focus trap is implemented. Keyboard users can tab
through the entire page behind an open modal. WCAG 2.1 SC 2.1.2 requires
that focus remains within a dialog while it is open. This affects
`PinResetDialog`, `EvalLockConfirmDialog`, and any other overlay component.

**Session token expiry not surfaced during evaluation.**

`session_expires_at` is issued at PIN verification and stored in state.
If a juror leaves the eval tab open for longer than the token TTL (without
navigating), the next `writeGroup` call will fail at the RPC with an auth
error. There is no countdown or warning in the UI. Given that evaluation
sessions may run several hours on poster day, this is a realistic scenario.

### Minor

**`editLockActive` check is pre-async only.**

[src/jury/useJuryState.js:247](src/jury/useJuryState.js#L247)

`writeGroup` checks `editLockActive` before the `await upsertScore` call
but not after. If the lock state changes while the RPC is in-flight, the
write may still proceed and the RPC will reject it server-side. This is
handled by the catch block correctly (`setEditLockActive(true)` on the
`semester_locked` error path), so data integrity is preserved — but the UX
is slightly inconsistent.

**`rpc_bootstrap_admin_password` is callable through the proxy (see Critical #2).**

Separately from the security concern, the name mismatch means if there is a
legitimate bootstrap function that should only be callable before password
setup, its proxy-gating is currently not enforced correctly.

**Comment in `api.js` header is stale.**

[src/shared/api.js:5](src/shared/api.js#L5)

```javascript
// No GAS URL, no fire-and-forget, no session tokens.
```

Session tokens are very much present and used. This comment is a legacy
leftover from a previous architecture. Minor, but misleading to future
maintainers.

**`APP_CONFIG` `courseName` and `department` are hardcoded.**

[src/config.js:14-20](src/config.js#L14)

These values appear in the UI (header, PDF exports) but are not in any
environment variable. Changing them requires a code edit. Acceptable
for a single-department deployment, but noted for completeness.

---

## 4. Risk Notes

The following are **acceptable tradeoffs** at this project's scale:

- **Last-write-wins on concurrent edits** — In a supervised poster-day
  setting with a single evaluator per station, two simultaneous sessions
  for the same juror are extremely unlikely.
- **No persistent auth session** — Stateless password-per-request is
  appropriate for a tool used 2–3 days/year by a small admin audience.
- **No real-time push notifications** — Polling every 10–15s for edit-mode
  state is sufficient for the scale. Real-time subscriptions would add
  dependency complexity for marginal benefit.
- **Large JS bundle** — At internal-tool scale and usage frequency, build
  size is not a meaningful concern.
- **Single admin password** — Acceptable for one department with one admin.
  Not acceptable at multi-department scale (see §8).
- **MÜDEK rubric in config.js** — Coupling to Turkish engineering accreditation
  is intentional and appropriate for this deployment context.

---

## 5. Test Confidence

**High on unit logic, moderate on integration paths.**

The following are well-covered and trustworthy:

- `scoreHelpers.js` pure functions (cell state, partial totals, workflow state)
- `withRetry` behavior (network errors, AbortError, business errors, backoff)
- `useScoreGridData` hook data transformations
- Admin panel component rendering and UI state
- Score grid momentum, ARIA, and sort behavior

The following are **not covered or underrepresented**:

- **Field mapping** (`design→written`, `delivery→oral` in `upsertScore` and
  `listProjects`) — no test verifies that the correct DB column receives the
  correct value. A silent transposition here corrupts every evaluation.
- **`useJuryState` end-to-end flow** — PIN entry through score submission is
  not covered by unit tests. The hook is large and contains the most
  business-critical logic in the application.
- **`visibilitychange` autosave** — the fire-and-forget path is untested.
- **`isSemesterLockedError`** — string matching behavior is untested.
- **E2E stability** — as of the most recent recorded run, E2E tests are
  environment-sensitive. Admin and jury flows failing in E2E while passing
  in unit tests leaves a gap in deployment confidence.

---

## 6. Final Deployment Checklist

1. **SQL migration applied.** Confirm `sql/000_bootstrap.sql` has been fully
   executed in the target Supabase project, including the most recent RPC
   signature and trigger changes.

2. **Vault secrets present and non-empty.** Verify `rpc_secret` and
   `pin_secret` are set in Supabase Vault for the target environment.
   A missing secret causes fail-closed behavior (good), but should be
   confirmed explicitly before any juror attempts to log in.

3. **rpc-proxy deployed and reachable.** Confirm the Edge Function is
   deployed. Test the admin login flow through the proxy (not dev mode).

4. **`ALLOWED_ORIGINS` set to the correct production origin** in the
   Edge Function environment. Do not leave it unset or set to `"*"` in
   production.

5. **`VITE_DEMO_MODE` is not set in production.** Confirm this env var
   is absent or falsy in the production build. If set, it may alter
   branching behavior in ways that were not audited here.

6. **E2E suite green against production environment.** Run
   `npm run e2e` against the target Supabase instance. Do not deploy
   until admin login, jury PIN flow, and score submission tests all pass.

7. **Admin bootstrap password set.** On first deployment, the admin
   password must be bootstrapped. Confirm this step is documented in
   the deployment runbook and completed before any evaluators are invited.

8. **Admin delete and backup passwords set.** These are separate from the
   main admin password. Verify `rpc_admin_security_state` returns
   `backup_password_set: true` and `delete_password_set: true`.

9. **Confirm session token TTL is appropriate for evaluation duration.**
   Verify that `session_expires_at` is set far enough into the future
   (e.g. 8+ hours) to cover a full poster-day session without expiry.

10. **Manual smoke test on a non-dev device.** Verify: home page loads,
    juror PIN entry works, scores save, admin login works, score grid
    populates. Do not rely solely on automated tests for this check.

---

## 7. Scoring Table

| Area | Current Score | Score if Multi-Dept | Score if Multi-Uni |
| --- | --- | --- | --- |
| Security | 8/10 | 5/10 | 4/10 |
| Reliability / Data Integrity | 8/10 | 7/10 | 6/10 |
| Accessibility | 6/10 | 6/10 | 5/10 |
| Performance | 8/10 | 7/10 | 6/10 |
| Architecture / Code Quality | 8/10 | 6/10 | 5/10 |
| Test Coverage | 7/10 | 6/10 | 5/10 |
| Maintainability | 8/10 | 6/10 | 4/10 |
| **Overall** | **7.5/10** | **6/10** | **5/10** |

**Security (Current: 8/10)**
Limited by the CORS wildcard bypass and the phantom ALLOWED_EXTRAS entry.
Raised to 9+ by fixing the CORS logic and removing the dead entry.
Multi-dept drops to 5: single admin password provides no isolation between
department admins. Multi-uni drops further due to KVKK/GDPR surface and
shared-infrastructure credential management concerns.

**Reliability / Data Integrity (Current: 8/10)**
Limited by the lack of conflict detection for concurrent sessions and
fire-and-forget autosave. Raised to 9 by adding an `updated_at` guard in
the upsert RPC and surfacing save failures on visibilitychange.
Multi-dept adds contention risk across concurrent evaluation events.
Multi-uni adds operational risk from out-of-sync schema migrations.

**Accessibility (Current: 6/10)**
Limited primarily by missing focus traps in dialogs and unverified
color-contrast (jsdom/canvas test limitation). Raised to 8 by implementing
focus management and running browser-based contrast audits in CI.
Score is scale-independent — this is a code quality issue that travels
unchanged across all deployment scenarios.

**Performance (Current: 8/10)**
Limited by large bundle chunks (xlsx-js-style, dnd-kit loaded eagerly).
Raised by code-splitting exports/drag-and-drop behind dynamic imports.
Multi-dept would multiply concurrent Supabase RPC load; performance stays
acceptable below ~200 simultaneous evaluators per instance.

**Architecture / Code Quality (Current: 8/10)**
Limited by a few fragile patterns (string-based error detection, dead
ALLOWED_EXTRAS). The overall structure is clean and well-documented.
Multi-dept drops to 6: no data model concept of department means the
entire routing and permission model needs redesign. Multi-uni drops further
as config hardcoding compounds across many independent instances.

**Test Coverage (Current: 7/10)**
Limited by missing API field mapping tests and no useJuryState integration
coverage. Raised to 8+ by adding those two test gaps. Multi-dept and
multi-uni scenarios would require new test surface for tenant isolation
and multi-instance behavior.

**Maintainability (Current: 8/10)**
Limited by the operational complexity of keeping secrets, DB migrations,
and Edge Function deployments in sync. The code itself is clean and
well-commented. Multi-dept requires config-driven rubrics (removing a
core simplicity assumption). Multi-uni requires managed-migration tooling
across many instances, which is a significant operational investment.

---

## 8. Scaling Gap Summary

### Scenario A — Multi-Department (same university)

**Top 3 architectural changes required:**

1. **Add a `department_id` tenant dimension to the data model.**
   Semesters, projects, jurors, and scores currently have no owner or
   scope beyond the single-instance assumption. Adding `department_id` to
   the `semesters` table (propagated via foreign key to projects and
   scores) is the minimum change to enable data isolation. RLS policies
   would need rewriting to enforce per-department visibility, gated on the
   authenticated admin's department identity.

2. **Replace the single admin password with per-department credentials.**
   The current model has one admin password for the entire instance.
   Multi-department requires either (a) a lightweight user table mapping
   admins to departments with separate hashed credentials, or (b) a role
   hierarchy where a super-admin can create per-department sub-admins.
   The RPC-level password check (`rpc_admin_login`) would need to validate
   against a per-department credential and return a scoped token rather
   than a binary `ok`.

3. **Move evaluation criteria and weights from `config.js` to the database.**
   With multiple departments, each may have a different rubric (weights,
   criterion names, MÜDEK mappings). Hardcoding criteria in a build-time
   config means all departments share the same rubric. Moving criteria
   to a `rubric_templates` table (keyed by `department_id`) and loading
   them at runtime would allow per-department customization without
   redeployment.

### Scenario B — Multi-University (SaaS-like or self-hosted)

**Top 3 architectural changes required:**

1. **Extract all institution-specific strings to a runtime configuration.**
   `APP_CONFIG` in `config.js` hard-codes "TED University", "EE 491 / EE 492",
   and "Electrical & Electronics Engineering". The 18 `MUDEK_OUTCOMES` entries
   are specific to Turkish engineering accreditation (MÜDEK) and include
   Turkish-language text. A new university deploying this tool would need a
   code fork to change these. Moving `APP_CONFIG` to environment variables
   and making the rubric/outcome taxonomy a database entity (or a swappable
   JSON config file loaded at runtime) would allow self-hosted deployments
   to customize branding and criteria without code changes.

2. **Define and implement a data lifecycle and compliance model.**
   For a shared or hosted product, universities become data controllers
   for their evaluators' personal data (names, institutional affiliations,
   PIN-hashed credentials, audit logs). The current system has no data
   retention policy, no right-to-erasure RPC, and no documented KVKK/GDPR
   compliance surface. A `rpc_admin_delete_juror` RPC exists but does not
   cascade to audit log entries. Adding per-tenant data retention settings,
   a full erasure RPC (juror + their audit trail), and a documented data
   processing agreement template would be the minimum compliance baseline.

3. **Create a documented, repeatable self-hosted deployment procedure.**
   The current setup requires: a Supabase project, three Vault secrets
   (`rpc_secret`, `pin_secret`, `admin_password`), one Edge Function
   deployment, one SQL bootstrap execution, and a built frontend pointed
   at the correct env vars. This is achievable but not yet packaged as a
   reusable setup script or Infrastructure-as-Code template. For a
   non-developer at another university to deploy this independently,
   the procedure needs a step-by-step guide with validation checks
   (confirm secrets set, confirm migration applied, confirm bootstrap
   completed) — or an automated setup script. The existing `docs/deployment/`
   content is a starting point but would need expansion and hardening
   for a third-party audience.

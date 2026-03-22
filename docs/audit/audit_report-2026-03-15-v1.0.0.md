# Final Production Audit Report

Date: 2026-03-15
Version: v1.0.0
Scope: Full repository review from current codebase snapshot

## 1. Final verdict

### Not ready for production

The system is close, but there are unresolved high-impact risks in API-level
authorization/data integrity and at least one production UI regression risk.

## 2. Strengths

- The project has strong automated test breadth for unit/integration logic
  (`276/276` passing) and meaningful E2E coverage for core happy paths
  (`9/10` passing, `1` intentionally skipped).
- Jury flow state management is careful around async/unmount behavior
  (`AbortController`, visibility autosave, ref-backed pending buffers),
  reducing accidental data loss during navigation.
- Database schema includes practical integrity constraints (score ranges,
  unique constraints, immutable audit logs) and robust audit logging across
  critical admin/jury operations.
- Admin security controls are functionally separated (admin, delete, backup
  passwords) and backed by explicit RPC-level checks.
- Error handling UX is generally concrete and user-facing (toasts, lock
  banners, connection fallback paths).

## 3. Remaining issues

### Critical

- **API-level authorization gap for juror write/finalize operations**
  - `rpc_upsert_score` and `rpc_finalize_juror_submission` are callable with
    only IDs and do not verify a server-side authenticated juror session/token
    (`sql/000_bootstrap.sql:679`, `sql/000_bootstrap.sql:2975`).
  - `rpc_create_or_get_juror_and_issue_pin` returns `juror_id` before PIN
    verification for a provided name/institution pair
    (`sql/000_bootstrap.sql:3192`).
  - Practical risk: a malicious internal actor with app/API access can
    forge/alter/finalize evaluations for another juror if they can determine
    identity inputs and IDs.

- **Fail-open secret enforcement on admin RPC secret check**
  - `_verify_rpc_secret` explicitly returns success when secret is unset
    (`sql/000_bootstrap.sql:941-957`).
  - Practical risk: if deployment misses Vault secret configuration,
    defense-in-depth collapses to password-only protection, including
    bootstrap paths.

### Medium

- **Admin update RPCs can report success without updating anything**
  - `rpc_admin_update_semester` and `rpc_admin_update_juror` do not validate
    `FOUND` after `UPDATE` before returning success/auditing
    (`sql/000_bootstrap.sql:1984-1989`, `sql/000_bootstrap.sql:2358-2363`).
  - Practical risk: silent no-op updates and misleading audit entries reduce
    operator trust and debugging accuracy.

- **Admin password is persisted in plaintext sessionStorage**
  - Stored/read in both App and AdminPanel (`src/App.jsx:113`,
    `src/App.jsx:180`, `src/AdminPanel.jsx:452`, `src/AdminPanel.jsx:472`).
  - Practical risk: any XSS/compromised script context immediately exposes
    admin credential material for the active tab session.

- **Accessibility test confidence is overstated for contrast checks**
  - `a11y` suite passes, but test runtime logs repeated
    `HTMLCanvasElement.prototype.getContext` not implemented errors from
    axe/jsdom, meaning parts of color-contrast analysis are not truly enforced
    in CI.

### Minor

- **Production homepage logo path is hardcoded to source path**
  - Home logo uses `src="/src/assets/tedu-logo.png"` while imported asset
    variable is unused (`src/App.jsx:34`, `src/App.jsx:428`).
  - Confirmed in production bundle output as unresolved source-path reference;
    this can break logo display after deploy.

- **Readability/accessibility regression in security panel copy blocks**
  - Multiple `text-align: justify` + `text-align-last: justify` rules produce
    stretched, uneven spacing in short UI text blocks
    (`src/styles/admin-manage.css:92-94`,
    `src/styles/admin-manage.css:2821-2823`,
    `src/styles/admin-manage.css:2850-2852`).

- **One high-value E2E lock scenario is not guaranteed in CI**
  - Lock behavior test is skipped unless special env/fixture flags are set
    (`e2e/jury-lock.spec.ts:25-30`), leaving lock-state regressions
    under-tested by default pipeline.

## 4. Risk notes

Acceptable tradeoffs for this small internal tool:

- Large frontend bundles and limited code-splitting are acceptable if usage
  is infrequent and campus network is stable.
- Feature-rich custom admin UI complexity is acceptable if release cadence is
  low and maintainers are known.
- Public anonymous RPC model can be acceptable only if strict network
  perimeter + secret configuration + operational controls are enforced
  consistently.

## 5. Test confidence

### Moderate (not high)

- Strength: unit and E2E coverage is broad on normal admin/jury flows,
  scoring mechanics, and many UI states.
- Limitation: critical adversarial/data-integrity paths (forged RPC calls,
  ID spoofing, missing secret behavior) are not covered by automated tests.
- Limitation: lock-state E2E path is conditionally skipped.
- Limitation: accessibility automation currently has environment-level blind
  spots for some contrast checks.

## 6. Final deployment checklist

1. Enforce juror server-side authorization for score write/finalize RPCs
   (not just client flow).
2. Change `_verify_rpc_secret` to fail-closed in production (or hard-block
   deploy when secret missing).
3. Add `FOUND` checks to admin update RPCs and return explicit not-found
   errors.
4. Remove plaintext admin password persistence from `sessionStorage` (or
   reduce blast radius with short-lived token model).
5. Fix home logo to use imported asset reference (`src={teduLogo}`) and
   verify in built output.
6. Remove justify-last text styling from short alert/info copy blocks in
   admin security UI.
7. Make lock-state E2E test deterministic in CI (seed locked semester fixture
   or dedicated pre-test setup).
8. Re-run full test matrix after fixes: `npm test -- --run`, `npm run e2e`,
   `npm run build`.
9. Verify Supabase Vault secrets exist and are non-empty (`rpc_secret`,
   `pin_secret`) in target environment.
10. Perform one manual accessibility smoke pass on dynamic states (tab
    changes, lock banners, error alerts, modal focus).

## 7. Scoring table

| Area | Score |
| --- | --- |
| Security | 5/10 |
| Reliability / Data Integrity | 6/10 |
| Accessibility | 6/10 |
| Performance | 7/10 |
| Architecture / Code Quality | 7/10 |
| Test Coverage | 7/10 |
| Maintainability | 7/10 |
| **Overall** | **6/10** |

Score notes:

- **Security (5/10)**
  - Limited by juror RPC authorization gap, plaintext admin credential persistence, fail-open secret mode.
  - Raised by server-enforced juror auth binding, fail-closed secret checks, and safer admin session handling.

- **Reliability / Data Integrity (6/10)**
  - Limited by spoofable write/finalize endpoints and silent-success update RPC behavior.
  - Raised by stronger server assertions and explicit not-found/update contract handling.

- **Accessibility (6/10)**
  - Limited by stretched justification styles and incomplete automated contrast confidence.
  - Raised by typography cleanup and browser-level a11y checks in CI or dedicated visual/axe audits.

- **Performance (7/10)**
  - Limited by large build chunks; acceptable but not optimized.
  - Raised by additional route/tab-level code splitting and chart/admin lazy loading.

- **Architecture / Code Quality (7/10)**
  - Limited by mixed trust boundaries between client flow and RPC layer.
  - Raised by explicit backend auth contracts and tighter RPC invariants.

- **Test Coverage (7/10)**
  - Limited by missing adversarial/security tests and conditional E2E skip path.
  - Raised by mandatory lock-scenario CI and RPC abuse-case integration tests.

- **Maintainability (7/10)**
  - Limited by high complexity in admin/settings surface and CSS rule sprawl.
  - Raised by reducing duplicated style patterns and codifying critical API invariants with tests.

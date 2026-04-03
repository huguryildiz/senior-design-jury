# TODO

## E2E Tests — Phase C Migration

E2E tests are failing because they still use the pre-Phase C login and jury flow.
CI e2e job is currently enabled (`if: true` in `.github/workflows/ci.yml`).

### What needs to happen

1. **Admin login flow**: E2E specs use the old `window.prompt` password entry.
   Update to use the Supabase Auth email/password login form (`LoginForm.jsx`).
   Affected: `admin-login.spec.ts`, `admin-export.spec.ts`, `admin-import.spec.ts`,
   `admin-results.spec.ts`.

2. **Jury entry flow**: Jury tests navigate directly to the identity step, but
   Phase C requires going through `jury_gate` (entry token verification) first.
   Affected: `jury-flow.spec.ts` — identity form tests and PIN flow tests.

3. **RPC rename**: DB function `rpc_get_active_semester` was renamed to
   `rpc_get_current_semester`. Either update the E2E Supabase instance with
   Phase C migrations, or add an alias function in SQL.
   Affected: `jury-flow.spec.ts` (PIN flow), `jury-lock.spec.ts`.

4. **CI Supabase instance**: Apply `sql/migrations/001-013` to the E2E Supabase
   project so tenant tables, v2 RPCs, and renamed functions exist.

5. **CI secrets**: Add `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` for Supabase
   Auth login (replaces the old single admin password).

6. **Tenant isolation E2E** (`tenant-isolation.spec.ts`): Most tests are
   currently skipped (need real Supabase Auth users). Wire up once admin login
   E2E is working.

### Quick fix (temporary)

Set `if: false` on the e2e job in `.github/workflows/ci.yml` to unblock CI
while these are addressed.

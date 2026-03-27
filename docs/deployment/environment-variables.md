# Environment Variables — VERA

---

## Application Variables (`.env.local`)

These are required to run the app locally or on any deployment.

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL — `https://<project-id>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key. Safe to expose — RLS enforces all access restrictions. |
| `VITE_RPC_SECRET` | Dev only | Secret value that the `rpc-proxy` Edge Function expects. In production this lives in Supabase Vault and is never sent to the browser. In dev, it is passed directly via this env var. |
| `VITE_DEMO_MODE` | No | Set to `"true"` to enable demo mode. Pre-fills the admin password field with `VITE_DEMO_ADMIN_PASSWORD` and may restrict Settings access. |
| `VITE_DEMO_ADMIN_PASSWORD` | No | Admin password pre-filled in demo mode. Only used when `VITE_DEMO_MODE=true`. |

### `.env.local` example

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_RPC_SECRET=your-rpc-secret-from-vault
```

---

## E2E Test Variables (`.env.e2e.local`)

Used by Playwright E2E tests. Copy `.env.e2e.example` to `.env.e2e.local` and fill in the values. Tests that require a missing variable are automatically **skipped** — no CI failure.

| Variable | Required for | Notes |
| --- | --- | --- |
| `E2E_BASE_URL` | All E2E | Base URL for tests. Defaults to `http://localhost:5173`. |
| `E2E_ADMIN_PASSWORD` | Admin tests | Admin password for the target environment. |
| `E2E_JUROR_NAME` | `jury.e2e.01` | Full name of the test juror in the database. |
| `E2E_JUROR_DEPT` | `jury.e2e.01` | Department string (e.g. `EE`). |
| `E2E_JUROR_PIN` | `jury.e2e.01` | 4-digit PIN for the test juror. |
| `E2E_SEMESTER_NAME` | `jury.e2e.01` | Name of the semester to select (e.g. `2026 Spring`). Auto-skipped if only one active semester. |
| `E2E_LOCKED` | `jury.e2e.02` | Set to `"true"` when the target semester is locked. Skip test if absent. |

---

## CI Variables (GitHub Actions Secrets)

Set in **GitHub → Repository → Settings → Secrets and variables → Actions**.

| Secret | Used by | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | CI unit tests | Required so api.js imports don't fail at build time. |
| `VITE_SUPABASE_ANON_KEY` | CI unit tests | Same reason. |
| `E2E_ADMIN_PASSWORD` | E2E job (disabled) | Admin password for the demo/test Supabase project. |
| `E2E_JUROR_NAME` | E2E job (disabled) | |
| `E2E_JUROR_DEPT` | E2E job (disabled) | |
| `E2E_JUROR_PIN` | E2E job (disabled) | |
| `E2E_SEMESTER_NAME` | E2E job (disabled) | |

The E2E CI job is currently disabled (`if: false` in `.github/workflows/ci.yml`). Run E2E tests locally with `npm run e2e`.

---

## Notification Secret Sync (GitHub Actions)

Workflow: `.github/workflows/notification-secrets-sync.yml`

Required GitHub secrets:

| Secret | Purpose |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Auth token for Supabase CLI in GitHub Actions |
| `SUPABASE_PROJECT_REF_DEMO` | Demo Supabase project ref |
| `SUPABASE_PROJECT_REF_PROD` | Prod Supabase project ref |
| `NOTIFICATION_REVIEW_URL_DEMO_LOCAL` | Demo review URL (local profile, e.g. `http://192.168.../?tab=applications`) |
| `NOTIFICATION_APP_URL_DEMO_LOCAL` | Demo app URL (local profile, e.g. `http://192.168...`) |
| `NOTIFICATION_REVIEW_URL_DEMO_VERCEL` | Demo review URL (vercel profile, e.g. `https://vera-demo.vercel.app/?tab=applications`) |
| `NOTIFICATION_APP_URL_DEMO_VERCEL` | Demo app URL (vercel profile, e.g. `https://vera-demo.vercel.app`) |
| `NOTIFICATION_REVIEW_URL_PROD` | Prod review URL |
| `NOTIFICATION_APP_URL_PROD` | Prod app root URL |
| `NOTIFICATION_FROM` | Sender identity for notification emails |
| `NOTIFICATION_LOGO_URL` | Public logo URL used in premium email templates |

---

## Backup Variable (GitHub Actions Secrets)

| Secret | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `db-backup.yml` | PostgreSQL connection string for `pg_dump`. Monthly automated backup. |

---

## Supabase Edge Function Secrets (`rpc-proxy`)

These are configured in Supabase Dashboard for the `rpc-proxy` function.

| Secret | Required | Notes |
| --- | --- | --- |
| `RPC_SECRET` | Yes | Must match the DB-side `rpc_secret` (Vault) expected by admin RPCs. |
| `ALLOWED_ORIGINS` | Yes (production) | Comma-separated origin allowlist, e.g. `https://vera-demo.vercel.app,https://vera.example.com,http://localhost:5173` |
| `ALLOW_WILDCARD_ORIGIN` | No | Keep `false` in production. Set `true` only in dev/staging if wildcard patterns in `ALLOWED_ORIGINS` are needed (e.g. `https://*.vercel.app`). |

---

## Production vs. Development

| Variable | Development | Production |
| --- | --- | --- |
| `VITE_RPC_SECRET` | `.env.local` (dev, browser-accessible) | Supabase Vault (injected by Edge Function, never reaches browser) |
| `VITE_SUPABASE_URL` | `.env.local` | Vercel environment variables |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` | Vercel environment variables |
| `VITE_DEMO_MODE` | Not set | Vercel environment variables (optional) |
| `VITE_DEMO_ADMIN_PASSWORD` | Not set | Vercel environment variables (optional) |

> **Never commit `.env.local` to git.** It is listed in `.gitignore`.

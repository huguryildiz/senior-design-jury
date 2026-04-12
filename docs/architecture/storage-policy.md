# Browser Storage Policy

This document defines VERA's browser storage architecture: what lives in `localStorage`, what lives in `sessionStorage`, what stays server-side only, and why.

**Last updated:** 2026-04-12

---

## Guiding Principles

1. **Server is truth, browser is convenience.** Scores, sessions, tenant memberships, and access grants are always validated server-side. Browser storage only caches state to improve UX (resume after phone lock, remember filters, persist theme).

2. **No secrets in browser storage.** Passwords, API keys, and service-role tokens never touch `localStorage` or `sessionStorage`. Supabase Auth tokens are managed by the SDK and are the sole exception (necessary for auth flow).

3. **localStorage = survives browser restart.** Use for data the user expects to persist: theme, login email, admin filter state, jury session resume.

4. **sessionStorage = per-tab, dies on close.** Use for ephemeral per-tab state: guided tours, one-time UI flags.

5. **Dual-write (both storages) = access-gate data.** Jury access grants and admin raw tokens use both so the data survives tab close (localStorage) while also being immediately available to the current tab (sessionStorage-first reads).

6. **All keys live in `src/shared/storage/keys.js`.** No hardcoded key strings in components or hooks. This is the single source of truth for every storage key in the application.

7. **All storage access goes through abstraction layers.** Jury session data through `juryStorage.js`, admin UI state through `persist.js`, admin tokens through `adminStorage.js`. No raw `localStorage.getItem()` outside these modules except in `ThemeProvider` (which reads its own key).

---

## Key Registry

All keys are defined in `src/shared/storage/keys.js`. Below is the full inventory with storage type, data classification, and rationale.

### Jury Flow Keys

| Key constant | Storage value | Storage type | Data type | Purpose |
|---|---|---|---|---|
| `JURY_ACCESS` | `jury_access_period` | Both | Period ID (UUID) | Which evaluation period the juror was granted access to |
| `JURY_ACCESS_GRANT` | `jury_access_grant` | Both | JSON object | Full grant payload (period_id, period_name, org info) |
| `JURY_SESSION_TOKEN` | `jury.session_token` | localStorage | 64-hex string | Server-validated session token for jury RPCs |
| `JURY_JUROR_ID` | `jury.juror_id` | localStorage | UUID | Juror's DB identifier |
| `JURY_PERIOD_ID` | `jury.period_id` | localStorage | UUID | Active evaluation period |
| `JURY_PERIOD_NAME` | `jury.period_name` | localStorage | String | Display name for the period |
| `JURY_JUROR_NAME` | `jury.juror_name` | localStorage | String | Juror's display name |
| `JURY_AFFILIATION` | `jury.affiliation` | localStorage | String | Juror's institutional affiliation |
| `JURY_CURRENT` | `jury.current` | localStorage | Integer string | Index of the project the juror is currently scoring |
| `JURY_RAW_TOKEN_PREFIX` | `jury_raw_token_` | Both | Entry token string | Admin-generated entry tokens (per semester, `+ semesterId`) |

**Why localStorage for jury session?** Jurors evaluate on phones/tablets. When the screen locks and the browser is killed, the session must survive so the juror can resume scoring without re-entering their PIN. The session token is validated server-side on every RPC call, so a stale token is harmless — the server rejects it.

### Admin Panel Keys

| Key constant | Storage value | Storage type | Data type | Purpose |
|---|---|---|---|---|
| `ADMIN_UI_STATE` | `jury_admin_ui_state_v1` | localStorage | JSON blob | Filter/sort/pagination state for Reviews, Heatmap, Analytics, Jurors pages |
| `ADMIN_ACTIVE_ORGANIZATION` | `admin.active_organization_id` | localStorage | UUID | Selected tenant for multi-tenant admin |
| `ADMIN_REMEMBER_ME` | `admin.remember_me` | localStorage | `"true"` / `"false"` | Whether to persist Supabase auth across restarts |
| `ADMIN_REMEMBERED_EMAIL` | `admin.remembered_email` | localStorage | Email string | Pre-fill login form when Remember Me is on |
| `ADMIN_DEVICE_ID` | `admin.device_id` | localStorage | `dev_<uuid>` | Stable device fingerprint for audit trail |

### Shared / UI Keys

| Key constant | Storage value | Storage type | Data type | Purpose |
|---|---|---|---|---|
| `THEME` | `vera-theme` | localStorage | `"dark"` / `"light"` | User's theme preference |
| `HEALTH_HISTORY` | `vera_health_history` | localStorage | JSON array | Last 20 system health pings (governance drawer) |

### Not in keys.js (Component-Level)

| Key | Storage type | Owner | Purpose |
|---|---|---|---|
| `dj_tour_done` (or custom `sessionKey`) | sessionStorage | `SpotlightTour.jsx` | One-time guided tour flag, per tab |
| `sb-<ref>-auth-token*` | localStorage | Supabase SDK | Auth session tokens (SDK-managed, do not touch) |

---

## Storage Abstractions

### `src/shared/storage/keys.js`

Single source of truth for all key constants. Every new storage key must be added here.

### `src/shared/storage/juryStorage.js`

Helpers for jury access grants and jury session persistence. Handles the dual-write pattern (both storages for access, localStorage for session).

### `src/shared/storage/adminStorage.js`

Helpers for admin raw tokens (dual-write) and active organization. Re-exports `readSection`/`writeSection` from `persist.js`.

### `src/admin/utils/persist.js`

Lightweight localStorage persistence for admin UI state. Stores a versioned JSON blob under `ADMIN_UI_STATE` with named sections (`details`, `grid`, `trend`, `jurors`).

### `src/shared/theme/ThemeProvider.jsx`

Reads/writes the `THEME` key directly (self-contained provider pattern).

---

## What Must Never Be Stored in Browser Storage

- **Passwords or password hashes** — never persisted client-side
- **Service-role keys or API secrets** — environment variables only
- **Score data** — always fetched fresh from server; no caching
- **Tenant membership details** — derived from JWT on every request
- **PII beyond what's needed for session resume** — juror name/affiliation are the minimum for resume UX
- **Admin session tokens** — managed by Supabase SDK, not by application code

---

## Admin vs Jury: Different Storage Needs

### Admin (Supabase Auth users)

- Authentication is SDK-managed (`sb-*-auth-token` keys)
- UI state persistence (filters, sorts) improves workflow — admin works in long sessions
- Remember Me controls whether SDK tokens survive browser restart (`clearPersistedSession`)
- Device ID is a stable fingerprint for audit correlation
- Active organization persists tenant selection across page reloads

### Jury (Token-based, no Supabase Auth)

- Session data must survive phone lock/screen off/browser kill
- All jury session data is validated server-side on every RPC
- Session cleared on explicit logout, submission, or flow reset
- Access grants use dual-write so tab close doesn't lose the access gate state
- No long-term PII retention — `clearJurySession()` removes everything

---

## Rules for Adding New Storage

1. **Add the key to `keys.js` first.** No hardcoded strings.
2. **Choose the right storage type:**
   - localStorage: user preference that should survive browser restart (theme, filters, language)
   - sessionStorage: per-tab transient state (tour flags, wizard step, one-time prompts)
   - Dual-write: data needed both immediately (sessionStorage) and across restarts (localStorage)
3. **Use the appropriate abstraction layer.** Don't call `localStorage.setItem()` directly unless you're inside a storage module.
4. **Wrap in try/catch.** Safari private mode, storage full, and disabled cookies can all throw.
5. **Never store data that the server should be the source of truth for.** If the data exists in the DB and changes frequently, fetch it — don't cache it.
6. **Consider stale data.** If the stored value could become invalid (deleted period, revoked token), the code that reads it must handle gracefully.
7. **Consider multi-tenant implications.** Storage is per-origin, not per-tenant. If an admin switches tenants, ensure stale tenant data doesn't leak.
8. **Consider audit/compliance.** If the stored data affects access control or scoring, it must be validated server-side.

---

## Cleanup and Session Lifecycle

- **Jury logout/reset:** `clearJurySession()` removes all `jury.*` keys from both storages
- **Jury access revoke:** `clearJuryAccess()` removes access grant from both storages
- **Admin logout:** `clearPersistedSession()` removes Supabase auth tokens from localStorage
- **Remember Me = false:** Supabase tokens cleared from localStorage on every auth state change, keeping session in-memory only

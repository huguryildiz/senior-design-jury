# URL Routing Architecture

Last updated: 2026-04-09

## Overview

VERA uses **React Router v6** (`createBrowserRouter`) with fully path-based routing.
Environment (prod vs. demo Supabase) is resolved **purely from the pathname** — no query
params, no sessionStorage.

```text
/demo/* → demo Supabase instance
everything else → prod Supabase instance
```

Source: [src/shared/lib/environment.js](../../src/shared/lib/environment.js)

---

## Route Tree

```text
/                              Landing page (LandingPage)                              [prod DB]
│                              └─ LegacyRedirects wraps the index; rewrites old ?param URLs
│
├── /eval                      Jury gate (JuryGatePage)                                [prod DB]
│                              Entry: ?t=TOKEN or paste invitation link
│                              On success → /jury/identity
│                              No session + /jury/* access → redirected here by JuryGuard
│
├── /jury/*                    Jury flow (JuryGuard → JuryFlow)                        [prod DB]
│   ├── /jury/identity         Step 1 — juror name + department
│   ├── /jury/period           Step 2 — evaluation period selection
│   ├── /jury/pin              Step 3 — 4-digit PIN entry
│   ├── /jury/pin-reveal       Step 4 — assigned PIN shown on first login
│   ├── /jury/locked           Locked period screen
│   ├── /jury/progress         Progress check (in-progress / completed session)
│   ├── /jury/evaluate         Step 5 — score projects
│   └── /jury/complete         Step 6 — submission confirmation
│
├── /login                     Auth — sign in (LoginScreen)                            [prod DB]
├── /register                  Auth — register / tenant application (RegisterScreen)   [prod DB]
├── /forgot-password           Auth — request reset link (ForgotPasswordScreen)        [prod DB]
├── /reset-password            Auth — set new password (ResetPasswordScreen)            [prod DB]
│
├── /admin/*                   Admin panel (AdminRouteLayout, requires auth)            [prod DB]
│   ├── /admin/overview        KPI overview
│   ├── /admin/rankings        Score rankings
│   ├── /admin/analytics       Trend analytics
│   ├── /admin/heatmap         Score heatmap / grid
│   ├── /admin/reviews         Score details / review
│   ├── /admin/jurors          Juror management
│   ├── /admin/projects        Project management
│   ├── /admin/periods         Evaluation period management
│   ├── /admin/criteria        Criteria editor
│   ├── /admin/outcomes        Outcome mapping
│   ├── /admin/entry-control   Entry token management (QR → /eval?t=TOKEN)
│   ├── /admin/pin-blocking    PIN blocking
│   ├── /admin/audit-log       Audit log
│   └── /admin/settings        Settings
│
└── /demo/*                    Demo namespace (DemoLayout)                              [demo DB]
    │                          All routes under /demo use the demo Supabase instance.
    │
    ├── /demo                  DemoAdminLoader — auto-login → /demo/admin/overview
    │
    ├── /demo/login            Auth — sign in (LoginScreen)
    ├── /demo/register         Auth — register / tenant application (RegisterScreen)
    ├── /demo/forgot-password  Auth — request reset link (ForgotPasswordScreen)
    ├── /demo/reset-password   Auth — set new password (ResetPasswordScreen)
    │
    ├── /demo/eval             Jury gate (JuryGatePage)
    │                          Entry: ?t=TOKEN (e.g. VITE_DEMO_ENTRY_TOKEN)
    │                          On success → /demo/jury/identity
    │                          No session + /demo/jury/* access → redirected here by JuryGuard
    │
    ├── /demo/jury/*           Jury flow (JuryGuard → JuryFlow)
    │   ├── /demo/jury/identity       Step 1 — juror name + department
    │   ├── /demo/jury/period         Step 2 — evaluation period selection
    │   ├── /demo/jury/pin            Step 3 — 4-digit PIN entry
    │   ├── /demo/jury/pin-reveal     Step 4 — assigned PIN shown on first login
    │   ├── /demo/jury/locked         Locked period screen
    │   ├── /demo/jury/progress       Progress check
    │   ├── /demo/jury/evaluate       Step 5 — score projects
    │   └── /demo/jury/complete       Step 6 — submission confirmation
    │
    └── /demo/admin/*          Admin panel (AdminRouteLayout, auto-login via DemoAdminLoader)
        ├── /demo/admin/overview        KPI overview
        ├── /demo/admin/rankings        Score rankings
        ├── /demo/admin/analytics       Trend analytics
        ├── /demo/admin/heatmap         Score heatmap / grid
        ├── /demo/admin/reviews         Score details / review
        ├── /demo/admin/jurors          Juror management
        ├── /demo/admin/projects        Project management
        ├── /demo/admin/periods         Evaluation period management
        ├── /demo/admin/criteria        Criteria editor
        ├── /demo/admin/outcomes        Outcome mapping
        ├── /demo/admin/entry-control   Entry token management (QR → /demo/eval?t=TOKEN)
        ├── /demo/admin/pin-blocking    PIN blocking
        ├── /demo/admin/audit-log       Audit log
        └── /demo/admin/settings        Settings
```

---

## Guards

### JuryGuard

Protects `/jury/*` and `/demo/jury/*`. Checks for an active jury session in localStorage
(`getJuryAccess()`). On failure redirects to the correct gate:

```text
/demo/jury/* without session → /demo/eval
/jury/*      without session → /eval
```

Source: [src/guards/JuryGuard.jsx](../../src/guards/JuryGuard.jsx)

---

## Layouts

| Layout | Path scope | Responsibility |
|---|---|---|
| `RootLayout` | All routes | Top-level shell (auth context, error boundary) |
| `DemoLayout` | `/demo/*` | Thin pass-through; environment resolved from pathname automatically |
| `AdminRouteLayout` | `/admin/*`, `/demo/admin/*` | Auth gate, sidebar/header chrome, data loading |
| `AuthRouteLayout` | `/login`, `/register`, etc. | Thin pass-through for standalone auth screens |

---

## Environment Resolution

```js
// src/shared/lib/environment.js
resolveEnvironment() → "demo" | "prod"
// Rule: window.location.pathname.startsWith("/demo") → "demo", else "prod"
```

The Supabase client is a **Proxy** that calls `resolveEnvironment()` on every access
and transparently delegates to the matching Supabase instance. No state, no sessionStorage.

---

## Entry Points

| Trigger | URL | Leads to | DB |
|---|---|---|---|
| Landing "Enter Code" button | `/eval` | `/jury/identity` → … → `/jury/complete` | prod |
| Landing "Experience Demo" button | `/demo/eval?t=DEMO_TOKEN` | `/demo/jury/identity` → … → `/demo/jury/complete` | demo |
| QR code / invitation link (prod) | `/eval?t=TOKEN` | `/jury/identity` → full jury flow | prod |
| QR code / invitation link (demo) | `/demo/eval?t=TOKEN` | `/demo/jury/identity` → full jury flow | demo |
| Admin login | `/login` | `/admin/overview` | prod |
| Demo admin | `/demo` | `/demo/admin/overview` (auto-login) | demo |

---

## Key Source Files

| File | Role |
|---|---|
| [src/router.jsx](../../src/router.jsx) | Route definitions |
| [src/shared/lib/environment.js](../../src/shared/lib/environment.js) | Pathname-based env resolution |
| [src/jury/JuryGatePage.jsx](../../src/jury/JuryGatePage.jsx) | Token verification + entry |
| [src/jury/JuryFlow.jsx](../../src/jury/JuryFlow.jsx) | Jury step orchestrator, URL sync |
| [src/guards/JuryGuard.jsx](../../src/guards/JuryGuard.jsx) | Session guard for jury routes |
| [src/layouts/DemoLayout.jsx](../../src/layouts/DemoLayout.jsx) | `/demo/*` wrapper |
| [src/layouts/AdminRouteLayout.jsx](../../src/layouts/AdminRouteLayout.jsx) | Admin auth + chrome |

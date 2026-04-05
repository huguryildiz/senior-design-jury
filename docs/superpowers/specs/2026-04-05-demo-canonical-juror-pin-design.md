# Demo Canonical Juror PIN Behavior

**Date:** 2026-04-05

## Problem

In demo mode, `force_reissue=true` is passed to `authenticateJuror` for **all** jurors.
This means every juror — regardless of name — always gets a new PIN and always sees `pin_reveal`.
The intent was only to make the canonical demo identity ("Demo Juror / TEDU, EE") frictionless,
but it accidentally prevents other visitors from experiencing the real production PIN flow.

## Goal

- **Demo Juror / TEDU, EE** → always force-reissue PIN, always show `pin_reveal` (no friction for guided demos)
- **All other jurors in demo env** → production behavior: `pin_reveal` on first login only, `pin` entry on subsequent logins
- No DB migration, no RPC changes

## Approach

Approach A: canonical constants + frontend condition.

## Changes

### `src/jury/hooks/useJurorIdentity.js`

Export two named constants for the canonical demo identity:

```js
export const DEMO_DEFAULT_NAME        = "Demo Juror";
export const DEMO_DEFAULT_AFFILIATION = "TEDU, EE";
```

Update `useState` defaults to use these constants (no behavior change, single source of truth).

### `src/jury/hooks/useJurySessionHandlers.js`

In `handlePeriodSelect`, derive `isCanonicalDemo` before calling `authenticateJuror`:

```js
import { DEMO_DEFAULT_NAME, DEMO_DEFAULT_AFFILIATION } from "./useJurorIdentity";

const isCanonicalDemo =
  DEMO_MODE &&
  name.trim() === DEMO_DEFAULT_NAME &&
  affiliation.trim() === DEMO_DEFAULT_AFFILIATION;

const res = await authenticateJuror(period.id, name, affiliation, isCanonicalDemo);

if (isCanonicalDemo && res?.pin_plain_once) {
  // always show pin_reveal with fresh PIN for canonical demo identity
  session.setIssuedPin(res.pin_plain_once);
  ...
  workflow.setStep("pin_reveal");
  return;
}
// all other jurors fall through to standard prod logic
```

The existing `if (DEMO_MODE && res?.pin_plain_once)` guard is replaced with
`if (isCanonicalDemo && res?.pin_plain_once)`.

## Behavior Matrix

| Identity | Visit | Result |
|---|---|---|
| Demo Juror / TEDU, EE | Any visit | New PIN generated, `pin_reveal` shown |
| Other name (demo env) | First visit | PIN generated once, `pin_reveal` shown |
| Other name (demo env) | Subsequent visit | `pin` entry step (prod behavior) |
| Other name (demo env) | After completing flow, re-entry | `pin` entry step |

## Matching

Exact string match after `.trim()`. Case-sensitive. Matches the hardcoded defaults in
`useJurorIdentity.js` so they stay in sync by construction.

## Out of Scope

- No env variable for canonical identity (YAGNI — single demo tenant)
- No backend changes
- No RPC signature changes

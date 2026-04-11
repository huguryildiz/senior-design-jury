# Dead Code Audit — Admin Settings Page

**Date:** 2026-04-11
**Scope:** `SettingsPage`, `useManageOrganizations`, `src/shared/api/admin/`

---

## Findings and Fixes

### `src/shared/api/admin/index.js`

**Removed:** `listOrganizationsPublic as listOrganizationsPublicDirect` export alias (line 53).

The alias was never imported anywhere in the codebase. The original
`listOrganizationsPublic` is imported directly from the module path by all consumers.

---

### `src/admin/hooks/useManageOrganizations.js`

**Removed: `subtitle` field from `EMPTY_CREATE` and `EMPTY_EDIT`**

`subtitle: ""` was defined in both shape constants but was not tracked in dirty
detection, not validated, and not sent to the API. No form surface rendered it.

**Removed: dead `institution` comparisons in dirty detection**

`createForm.institution !== orig.institution` — `EMPTY_CREATE` had no `institution`
field, so both sides were always `undefined`. Dirty detection already covered the
same data via `university` and `department` comparisons.

`editForm.institution !== orig.institution` — both sides were always equal (same
value copied into form and ref in `openEdit`), making the comparison permanently
`false`. Removed; `university` and `department` comparisons remain.

---

## Files Unchanged

| File | Result |
|------|--------|
| `src/admin/pages/SettingsPage.jsx` | Clean — no dead code |
| `src/shared/api/admin/platform.js` | Clean — both exports used |
| `src/shared/api/admin/organizations.js` | Clean — all exports used |

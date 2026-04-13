# Framework Template & Clone System — Design Spec

**Date:** 2026-04-13
**Status:** Approved

---

## Problem

The Outcomes & Mapping page currently takes `frameworks[0]` from the org — there is no link between a period and a framework. Admins have no way to save their outcome+mapping work as a reusable template, and there is no onboarding path for new periods or new orgs.

---

## Goal

- Every period owns its own framework clone (edits don't bleed across periods)
- Admins can save and reuse outcome+mapping snapshots across periods
- Platform ships with ready-made MÜDEK 2024 and ABET 2024 global templates
- Framework selection is available both on the Outcomes page and in period setup

---

## Data Model

### Existing tables (no structural changes)

```
frameworks
  id, organization_id (NULL = global template), name, description,
  version, is_default, outcome_code_prefix, default_threshold, created_at

periods
  id, organization_id, framework_id (FK → frameworks, nullable), ...

framework_outcomes
  id, framework_id, code, label, description, sort_order

framework_criteria
  id, framework_id, key, label, short_label, max_score, weight, color,
  rubric_bands, sort_order

framework_criterion_outcome_maps
  id, framework_id, criterion_id, outcome_id, coverage_type, weight
```

### Global templates (organization_id IS NULL)

Two rows inserted into `frameworks` at seed/migration time:

| name | outcomes |
|------|----------|
| MÜDEK 2024 | 18 outcomes (PO 1.1 → PO 11) from `docs/mudek-outcomes.md` |
| ABET 2024 | 7 outcomes (SO 1 → SO 7) from `docs/abet-outcomes.md` |

RLS already prevents orgs from modifying `organization_id IS NULL` rows.

### New: `rpc_admin_clone_framework`

```sql
rpc_admin_clone_framework(
  p_framework_id UUID,
  p_new_name     TEXT,
  p_org_id       UUID   -- always the calling org's ID, never NULL
) RETURNS UUID           -- new framework's id
```

Deep clone steps (all in one transaction):

1. Insert new `frameworks` row — same fields, new `name`, `organization_id = p_org_id`
2. Insert all `framework_outcomes` for source → map old ID → new ID
3. Insert all `framework_criteria` for source → map old ID → new ID
4. Insert all `framework_criterion_outcome_maps` using remapped criterion + outcome IDs

Returns new framework UUID.

---

## OutcomesPage changes

### Reading the framework

Replace:
```js
const frameworkId = frameworks[0]?.id || null;
```

With:
```js
const selectedPeriod = periods.find(p => p.id === selectedPeriodId);
const frameworkId = selectedPeriod?.framework_id || null;
```

`useAdminContext` must expose `selectedPeriod` or `periods` alongside `selectedPeriodId`.

### No framework assigned — empty state

```
[ Layers icon ]
Bu döneme framework atanmamış

[ Var olan framework'ten başla ]   [ Sıfırdan oluştur ]
```

**"Var olan framework'ten başla"** → opens framework picker modal:

```
  Önceki Dönemler
  • MÜDEK 2024 – Bahar Kopyası    (org's own frameworks)
  ...

  ── Platform Şablonları ──
  • MÜDEK 2024  (18 outcome)
  • ABET 2024   (7 outcome)
```

On select → `rpc_admin_clone_framework(selected_id, auto_name, org_id)` → `periods.framework_id = new_id`.

**"Sıfırdan oluştur"** → existing "Create Framework" modal → on create, assign to current period.

### Framework assigned — context bar

```
FRAMEWORK  [ ≡ MÜDEK 2024   7 ]   [ Clone as new... ]   [ Change... ]
```

**"Clone as new..."** → name input modal → clone → add to org's framework library (current period unchanged).

**"Change..."** → framework picker → if period has any mappings: hard confirm dialog ("Bu döneme ait tüm outcome mapping'leri silinecek. Devam etmek istiyor musunuz?") → on confirm: assign new framework clone to period, delete old mappings → on cancel: do nothing.

---

## Period setup changes

In `AddPeriodDrawer` and `EditPeriodDrawer`, add a **Framework** field (optional):

```
Framework  (opsiyonel)
[ — Seç veya ileride Outcomes sayfasından ekle — ▾ ]

  Önceki Dönemler
  • MÜDEK 2024 – Bahar Kopyası

  ── Platform Şablonları ──
  • MÜDEK 2024  (18 outcome)
  • ABET 2024   (7 outcome)
```

- Selection is optional — period can be created without a framework
- On save: if a framework is selected, `rpc_admin_clone_framework` is called, `periods.framework_id` is set to the clone
- Editing a period that already has a framework: show framework name + "Değiştir" button (same hard confirm as above)

---

## API surface

New functions in `src/shared/api/admin/frameworks.js`:

```js
// Deep clone a framework under a new name for the given org
cloneFramework(frameworkId, newName, orgId) → Promise<{ id, name }>

// Assign (or reassign) a framework clone to a period
// Handles hard-confirm logic in the UI; this just does the DB write
assignFrameworkToPeriod(periodId, frameworkId) → Promise<void>
```

Existing `listFrameworks(orgId)` already returns both org-specific and global templates — no change needed.

---

## Seed data

Add to `sql/migrations/008_platform.sql` (or a new section in `002_tables.sql`):

```sql
-- Global framework templates (organization_id IS NULL → visible to all, editable by none)
INSERT INTO frameworks (id, organization_id, name, description, version)
VALUES
  ('<uuid-mudek>', NULL, 'MÜDEK 2024', 'MÜDEK mühendislik akreditasyon çerçevesi — 18 program çıktısı (PO 1.1–11)', '2024'),
  ('<uuid-abet>',  NULL, 'ABET 2024',  'ABET EAC Student Outcomes — SO 1 through SO 7', '2024')
ON CONFLICT DO NOTHING;

-- framework_outcomes for each template (18 MÜDEK + 7 ABET rows)
-- source: docs/mudek-outcomes.md, docs/abet-outcomes.md
```

Full outcome rows to be generated from the two doc files.

---

## Org isolation

`listFrameworks` query:
```js
.or(`organization_id.eq.${organizationId},organization_id.is.null`)
```

- Orgs see only their own frameworks + global templates
- RLS blocks any INSERT/UPDATE/DELETE on `organization_id IS NULL` rows for non-super-admins
- `rpc_admin_clone_framework` always writes `organization_id = p_org_id` (never NULL) to the cloned row

---

## Out of scope

- Multi-framework support per period (one period → one framework)
- Framework versioning or diff tracking
- Super-admin UI for managing global templates (done via SQL/seed only)
- Bulk outcome import from CSV/Excel

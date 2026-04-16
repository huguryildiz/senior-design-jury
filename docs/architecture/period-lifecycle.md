# Period Lifecycle & Publish Model

This document describes how a period moves from creation to completion in VERA — the five lifecycle states, the transitions between them, the readiness checklist gating publish, and the admin journey through each stage.

**Last updated:** 2026-04-16

---

## 1. Five Lifecycle States

```
┌────────────────────┐   checklist passes    ┌────────────────┐
│ Draft ·            │   (auto, reversible)   │ Draft ·        │
│ Incomplete         │ ─────────────────────> │ Ready          │
│                    │ <───────────────────── │                │
└────────────────────┘   user edits            └───────┬────────┘
                                                       │ admin clicks Publish
                                                       ▼
                                              ┌────────────────┐
                                              │ Published      │  QR issuable
                                              │ (locked,       │  no scores yet
                                              │ no scores)     │
                                              └───────┬────────┘
                                                      │ first score submitted (auto)
                                                      ▼
                                              ┌────────────────┐
                                              │ Live           │  scoring in progress
                                              │ (locked,       │
                                              │ scoring)       │
                                              └───────┬────────┘
                                                      │ admin clicks Close Period
                                                      ▼
                                              ┌────────────────┐
                                              │ Closed         │  finalized
                                              │ (terminal)     │
                                              └────────────────┘

Revert flows (all return to Draft):
  Published → Draft   : org admin direct (no scores)
  Live      → Draft   : revert-request + super admin approval
  Closed    → Draft   : revert-request + super admin approval
```

### 1.1 State properties

| State                   | `is_locked` | `activated_at` | `closed_at` | Structural edits | QR generation | Accepts scores |
|-------------------------|-------------|----------------|-------------|------------------|---------------|----------------|
| **Draft · Incomplete**  | false       | null           | null        | yes              | no            | no             |
| **Draft · Ready**       | false       | null           | null        | yes              | no            | no             |
| **Published**           | true        | set            | null        | no               | yes           | no (none yet)  |
| **Live**                | true        | set            | null        | no               | yes           | yes            |
| **Closed**              | true        | set            | set         | no               | no            | no             |

### 1.2 State derivation rule

The five states are derived client-side from three columns on `periods` (`is_locked`, `closed_at`, plus whether any score row exists) and the readiness check result:

```js
function getPeriodState(period, hasScores, readiness) {
  if (period.closed_at)              return "closed";
  if (period.is_locked && hasScores) return "live";
  if (period.is_locked)              return "published";
  return readiness?.ok ? "draft_ready" : "draft_incomplete";
}
```

Implementation: [src/admin/pages/PeriodsPage.jsx:90](src/admin/pages/PeriodsPage.jsx#L90).

**Draft · Incomplete ↔ Draft · Ready is not a transition.** It is a computed UI attribute of Draft driven by the readiness check. Editing criteria or projects can flip a period between the two sub-states without any admin action.

### 1.3 Transitions

| From        | To          | Trigger                                    | Actor                |
|-------------|-------------|--------------------------------------------|----------------------|
| Draft       | Published   | `rpc_admin_publish_period`                 | Admin (manual)       |
| Published   | Live        | First score row inserted                   | System (automatic)   |
| Live        | Closed      | `rpc_admin_close_period`                   | Admin (manual)       |
| Published   | Draft       | `rpc_admin_set_period_lock(_, false)`      | Admin (manual)       |
| Live        | Draft       | `rpc_admin_request_unlock` + super admin   | Admin + super admin  |
| Closed      | Draft       | `rpc_admin_request_unlock` + super admin   | Admin + super admin  |

All admin-initiated transitions are surfaced in the kebab menu on each period row.

### 1.4 Orthogonal concepts

These columns do not belong to the lifecycle but are often confused with it:

- **`is_current`** — admin convenience flag. Marks the period the organization considers "the current term." One per org. Any lifecycle state can be current, including Draft.
- **`is_visible`** — jury-listing visibility. Independent of lifecycle.

---

## 2. The Lock Semantics

`is_locked = true` means **structural content is frozen** for the period. BEFORE triggers on related tables enforce this in the database:

- `projects` — all writes blocked
- `period_criteria`, `period_outcomes`, `period_criterion_outcome_maps` — all writes blocked
- `periods` itself — protected columns: name, season, description, start_date, end_date, framework_id, is_visible, organization_id
- `jurors` — UPDATE/DELETE blocked if the juror is assigned to any locked period

Intentionally mutable even while locked:

- `juror_period_auth` rows (PIN, session, edit-mode runtime state)
- `scores` and `score_feedback`
- `entry_tokens` INSERT (QR token issuance)
- `jurors` INSERT (new juror registration stays allowed via `rpc_jury_authenticate`)
- `periods.is_locked`, `is_current`, `activated_at`, `snapshot_frozen_at`, `closed_at`

Lock is set exclusively by `rpc_admin_publish_period`. There is no auto-lock trigger on token insertion — QR generation is gated on the period already being published.

---

## 3. Publish Checklist

`rpc_admin_check_period_readiness(p_period_id)` returns `{ ok: boolean, issues: [{ check, msg, severity }], counts: {...} }`. The period cannot publish while any **required** check fails.

**Required checks (block publish):**

| Check                               | Reason                                                               |
|-------------------------------------|----------------------------------------------------------------------|
| `criteria_name` is set              | Criteria set shown to jurors must have a label                       |
| ≥1 criterion exists                 | Nothing to score without criteria                                    |
| Criterion weights total = 100       | Score aggregation assumes normalized weights                         |
| Each criterion has rubric bands     | Rubric-based scoring UI requires bands                               |
| ≥1 project exists                   | Jurors need something to evaluate                                    |

**Optional checks (shown as informational, do not block publish):**

| Check                               | Why optional                                                         |
|-------------------------------------|----------------------------------------------------------------------|
| Framework assigned + outcome map    | Only needed for MÜDEK/ABET reporting; does not affect scoring        |
| ≥1 juror pre-registered             | Jurors can self-register via `rpc_jury_authenticate` on QR scan      |
| `start_date` / `end_date` filled    | Metadata only                                                        |
| Project metadata completeness       | Affects presentation, not scoring                                    |

**Handled automatically (no admin action required):**

- `snapshot_frozen_at` — jury flow freezes lazily on first load.
- `activated_at` — set by `rpc_admin_publish_period`.

**Explicitly out of scope:**

- Juror–project assignment. Every juror can score every project (no assignment table exists). If per-juror project subsets become a requirement, that is a separate feature.

---

## 4. Admin User Journey

### 4.1 Period created

- Admin clicks "Add Period", enters name + dates.
- **State: Draft · Incomplete**
- Row shows red badge: "5 issues before publish"
- Kebab menu shows "Publish Period" disabled (tooltip: "Fix 5 issues first").

### 4.2 Admin inspects issues

- Clicks the red badge → inline inspector opens listing the unmet checks with "Fix" links to Criteria/Projects pages.

### 4.3 Admin fills gaps

- Adds criteria, sets weights to 100, names the criteria set, defines rubric bands, adds projects.
- Badge count decrements in real time: 5 → 4 → … → 0.

### 4.4 All checks green

- **State: Draft · Ready**
- Badge turns green: "Ready to publish"
- Kebab "Publish Period" becomes enabled.

### 4.5 Admin publishes

- Clicks "Publish Period" → confirm modal: "Publish [Name]? Structural data will be frozen. You can still add new jurors and generate QR codes."
- On confirm: `rpc_admin_publish_period` runs, sets `is_locked=true`, `activated_at=now()`.
- A fresh QR entry token is auto-generated and its plaintext cached for immediate sharing.
- **State: Published**
- Badge turns blue: "Published". Kebab swaps "Publish" for **"Copy Entry Link"**, **"View QR Code"**, and **"Revert to Draft"**.

### 4.6 Admin shares access

- "Copy Entry Link" / "View QR Code" uses the token generated at publish. Admins can also rotate tokens via Entry Control.
- **State unchanged: Published.**

### 4.7 First juror scores

- Juror scans QR, registers, submits first score.
- **State: Live** (automatic, no admin action).
- Badge turns green: "Live — scoring in progress" with progress bar.

### 4.8 Admin wants to fix something

**4.8a. No scores yet (Published):**

- Kebab → "Revert to Draft" → confirm modal: "Revert [Name]? Structural editing will be re-enabled. QR tokens will be revoked."
- On confirm: direct revert. Period returns to Draft. All active entry tokens are revoked server-side.

**4.8b. Scores exist (Live or Closed):**

- Kebab → "Revert to Draft" → modal: "This period has scores. Super admin approval required. Explain why (≥10 chars)."
- `rpc_admin_request_unlock` creates a pending request.
- Row shows "Revert requested" badge; kebab entry grays out.
- Super admin sees the request in Platform Governance; approval returns period to Draft and revokes tokens, rejection removes the badge.

### 4.9 All jurors finished, admin closes

- Overview shows "All jurors completed".
- Admin → kebab → **"Close Period"** (visible only in Live).
- Confirm modal: "Close [Name]? No new scores will be accepted. Final rankings will be archived."
- On confirm: `rpc_admin_close_period` runs, sets `closed_at=now()`.
- **State: Closed**
- Badge turns gray: "Closed". "Generate QR" disappears. Only "View Rankings / Export / Revert to Draft (super admin)" remain.

### 4.10 Historical view

- Closed periods stay in the list but muted. Fully exportable from Rankings/Analytics as historical data.

### 4.11 Summary

| When                          | State              | Badge                        | Allowed actions                     |
|-------------------------------|--------------------|------------------------------|-------------------------------------|
| Just created                  | Draft · Incomplete | Red "N issues"               | Edit                                |
| Checklist passes              | Draft · Ready      | Green "Ready to publish"     | Edit, Publish                       |
| Publish confirmed             | Published          | Blue "Published"             | Copy / View QR, Revert              |
| First score submitted         | Live               | Green "Live — N% done"       | Copy / View QR, Revert (w/ approval)|
| Admin closes                  | Closed             | Gray "Closed"                | View, Export, Revert (super admin)  |

---

## 5. API Surface

All lifecycle actions are surfaced in `src/shared/api/admin/periods.js`:

| Function                            | Backing RPC                             | Purpose                                 |
|-------------------------------------|-----------------------------------------|-----------------------------------------|
| `checkPeriodReadiness(periodId)`    | `rpc_admin_check_period_readiness`      | Readiness check, used by badge + gate   |
| `publishPeriod(periodId)`           | `rpc_admin_publish_period`              | Draft → Published                       |
| `closePeriod(periodId)`             | `rpc_admin_close_period`                | Live → Closed                           |
| `setPeriodLock(periodId, locked)`   | `rpc_admin_set_period_lock`             | Published → Draft (no scores)           |
| `requestPeriodUnlock(periodId, …)`  | `rpc_admin_request_unlock`              | Live/Closed → Draft (needs approval)    |
| `generateEntryToken(periodId)`      | `rpc_admin_generate_entry_token`        | QR issuance (requires Published/Live)   |

`publishPeriod` is idempotent — a second call on an already-published period returns `{ ok: true, already_published: true }` without side effects. `closePeriod` is idempotent in the same way.

`rpc_admin_generate_entry_token` raises `period_not_published` if called on a Draft. The UI hides QR actions in Draft and Closed, so this exception is a belt-and-suspenders guard.

---

## 6. Schema Footprint

The lifecycle uses three columns on `periods`:

- `is_locked BOOLEAN` — structural freeze flag, set by publish
- `activated_at TIMESTAMPTZ` — first-publish timestamp
- `closed_at TIMESTAMPTZ` — close timestamp (the only column added specifically for this model)

No dedicated `status` column. The derivation rule in §1.2 is the single source of truth for lifecycle state.

---

## 7. Invariants

- **Live → Published regression is not allowed.** Once scores exist, the only path back to an editable state is a Revert to Draft with super admin approval. No quiet roll-back path.
- **Published is prerequisite for QR.** Token generation is rejected on Draft and Closed periods.
- **Closed is terminal under normal flow.** The only exit is a super-admin-approved revert.
- **Readiness is advisory outside publish.** It never prevents editing, only publishing.
- **`is_current` is independent.** It can be set on any state and does not affect transitions.

---

**Document date:** 2026-04-16

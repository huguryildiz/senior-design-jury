# UI Messages Audit

Audit of all toast notifications and inline card/alert/banner messages in the VERA admin UI.

Date: 2026-04-05

---

## Toast Messages

`useToast()` hook — `.success()`, `.error()`, `.info()`. Many hooks expose `setMessage(msg)`
which calls `_toast.success(msg)` internally.

Legend: items marked ✏️ were updated in the 2026-04-05 toast audit pass.

### Export toasts

| File | Success message | Error message |
|---|---|---|
| `AnalyticsPage.jsx` | ✏️ `Analytics exported · {PDF\|CSV\|Excel}[ · {periodName}]` | `Analytics export failed — please try again` |
| `RankingsPage.jsx` | ✏️ `{N} project(s) exported · {PDF\|CSV\|Excel}` | `Rankings export failed — please try again` |
| `HeatmapPage.jsx` | ✏️ `Heatmap exported · {PDF\|CSV\|Excel}` | `Heatmap export failed — please try again` |
| `ReviewsPage.jsx` | ✏️ `{N} review(s) · {N} juror(s) exported · {PDF\|CSV\|Excel}` | `Reviews export failed — please try again` |
| `ProjectsPage.jsx` | ✏️ `{N} project(s) exported · {PDF\|CSV\|Excel}` | `Projects export failed — please try again` |
| `JurorsPage.jsx` | ✏️ `{N} juror(s) exported · {PDF\|CSV\|Excel}` | `Jurors export failed — please try again` |
| `PeriodsPage.jsx` | ✏️ `{N} period(s) exported · {PDF\|CSV\|Excel}` | `Periods export failed — please try again` |
| `ExportPage.jsx` — score report | ✏️ `Score report downloaded · {N} period(s) · Excel` | `Score report export failed — please try again` |
| `ExportPage.jsx` — projects | ✏️ `{N} project(s) exported · all periods · Excel` | `Projects export failed — please try again` |
| `ExportPage.jsx` — jurors | ✏️ `{N} juror(s) exported · all periods · Excel` | `Jurors export failed — please try again` |
| `ExportPage.jsx` — DB backup | `Database backup downloaded` | `{dbBackupError}` (shown as panel card) |
| `SettingsPage.jsx` — memberships | ✏️ `{N} admin(s) exported · Excel` | `Memberships export failed — please try again` |
| `useAuditLogFilters.js` | ✏️ `{N} audit event(s) exported` | `{error}` |

### Profile / account toasts

| File | Trigger | Message |
|---|---|---|
| `SettingsPage.jsx` | ✏️ Save display name only | `Display name saved` |
| `SettingsPage.jsx` | ✏️ Save with avatar | `Profile saved` |
| `SettingsPage.jsx` | Save with email change | `Confirmation link sent to your new email address` (`.info`) |
| `SettingsPage.jsx` | Save security policy | `Security policy saved` |
| `SettingsPage.jsx` | Danger action (demo mode) | `{action label} — action recorded (demo)` |

### Period CRUD toasts (`useManagePeriods.js`)

| Action | Success message |
|---|---|
| Set current period | `Current period set to {name}.` / `Current period set.` |
| Create period | `Period {name} created` / `Period created` |
| Update period | `Period {name} updated` / `Period updated` |
| ✏️ Delete period | `Period "{name}" deleted` / `Period deleted` |
| Toggle eval lock ON | `Scoring for {period} period is now closed.` |
| Toggle eval lock OFF | `Scoring for {period} period is now open.` |
| Update criteria config | `Evaluation criteria updated.` |
| Update outcome config | `Outcome mappings updated.` |

Error path: `panelError` banner (shown inline, not toast).

### Project CRUD toasts (`useManageProjects.js`)

| Action | Success message |
|---|---|
| Import groups | `Groups imported for Period {context}[, skipped {N} existing groups]` |
| Add group | `Group {N} created in Period {name}` / `Group {N} created` |
| Edit group | `Group {N} updated` |
| ✏️ Delete group | `Group {N} deleted` / `Project deleted` |

Error path: `panelError` banner for panel-level errors; `fieldErrors` / `formError` for inline form errors.

### Juror CRUD toasts (`useManageJurors.js`)

| Action | Success message |
|---|---|
| Add juror | `Juror {name} added` / `Juror added` |
| Edit juror | `Juror {name} updated` / `Juror updated` |
| Import jurors | `Jurors imported[. Skipped {N} existing jurors]` |
| ✏️ Delete juror | `{name} removed` / `Juror removed` |
| Reset PIN | `PIN reset for {juror} — {period}` / `PIN reset for {juror}` |
| Unlock editing | `Editing unlocked for Juror {name}` / `Editing unlocked for juror` |
| Force close edit | `Editing locked for Juror {name}` / `Editing locked for juror` |

Error path: `panelError` banner or inline form error.

### Entry control toasts (`EntryControlPage.jsx`)

| Action | Message |
|---|---|
| Generate new QR | `New access QR generated` |
| Revoke token (no active jurors) | `Jury access revoked.` |
| Revoke token (active jurors) | `Jury access revoked and evaluations locked.` |
| ✏️ Revoke error | `Could not revoke jury access — please try again` (`.error`) |
| Send access link | `Access link sent` |

### Outcomes toasts (`OutcomesPage.jsx`)

| Action | Message |
|---|---|
| Save outcomes | `Outcomes updated successfully` |
| ✏️ Set passing threshold | `Passing threshold set to {val}%` |

### Criteria toasts (`CriteriaPage.jsx`)

| Action | Message |
|---|---|
| Save criteria | `Criteria updated successfully` |

---

---

## Card & Banner Messages

### AlertCard (shared component)

`src/shared/ui/AlertCard.jsx` — variants: `error`, `warning`, `info`, `success`

| File | Variant | Content |
|---|---|---|
| `src/admin/settings/JuryRevokeConfirmDialog.jsx` | `error` | Consequences list: "New scans blocked immediately", "Existing jurors can no longer submit", "Edit-mode locks are released" |
| `src/admin/settings/JuryRevokeConfirmDialog.jsx` | `warning` | "`{N}` juror(s) are currently active and will be locked from further edits." |
| `src/admin/settings/ManageOrganizationsPanel.jsx` | `error` | `{error}` — dynamic API error |
| `src/shared/ui/BlockingValidationAlert.jsx` | `error` | `{content}` — general blocking validation wrapper |
| `src/shared/ui/ConfirmDialog.jsx` | `error` / `warning` | `{warning}` prop — varies by call site |
| `src/admin/criteria/CriterionDeleteDialog.jsx` | `error` | "This action removes the criterion from the period settings. It cannot be undone." |
| `src/admin/criteria/CriteriaManager.jsx` | `error` | `saveBlockReasons` list — validation errors before save |
| `src/admin/criteria/CriteriaManager.jsx` | `error` | `{saveError}` — API error after failed save |
| `src/admin/components/OutcomeEditor.jsx` | `warning` | "Evaluation template locked — scoring has started for this period. No criteria changes are allowed." |
| `src/admin/components/OutcomeEditor.jsx` | `error` | `{saveError}` — API error after failed save |

---

### fb-alert divs (inline CSS class)

### Dynamic panel error banners

These render `{panelError}` or `{error}` state set by hooks on API failure.

| File | Variant | State var |
|---|---|---|
| `src/admin/pages/PeriodsPage.jsx` | `fba-danger` | `panelError` |
| `src/admin/pages/ProjectsPage.jsx` | `fba-danger` | `panelError` |
| `src/admin/pages/JurorsPage.jsx` | `fba-danger` | `panelError` |
| `src/admin/pages/OutcomesPage.jsx` | `fba-danger` | `panelError` |
| `src/admin/pages/CriteriaPage.jsx` | `fba-danger` | `panelError` |
| `src/admin/pages/EntryControlPage.jsx` | `fba-error` | `error` |
| `src/admin/pages/ExportPage.jsx` | `fba-error` | `dbBackupError` |
| `src/admin/pages/AuditLogPage.jsx` | `fba-error` | `auditRangeError \|\| auditError` |
| `src/admin/pages/PinBlockingPage.jsx` | `fba-error` | `error` |

### Static / informational banners

| File | Variant | Title | Description |
|---|---|---|---|
| `src/admin/pages/OutcomesPage.jsx` | `fba-warning` | "Incomplete outcome coverage" | "`{N}` of `{M}` programme outcomes lack criterion mappings" |
| `src/admin/pages/OutcomesPage.jsx` | `fba-danger` | "This action is irreversible" | "All criterion mappings for this outcome will be permanently removed." |
| `src/admin/pages/CriteriaPage.jsx` | `fba-danger` | "This action is irreversible" | "All rubric bands and outcome mappings for this criterion will be permanently removed." |
| `src/admin/pages/PeriodsPage.jsx` | `fba-info` | "This switch is immediate" | "Juror assignments and scoring context will point to the newly active period right away." |
| `src/admin/pages/PinBlockingPage.jsx` | `fba-warning` | "Lock policy is active" | "Jurors are locked for 15 minutes after 3 failed attempts. Manual unlock is logged in Audit Log." |
| `src/admin/pages/SettingsPage.jsx` | `fba-error` | — | "This action is irreversible and will take effect immediately. Type `{phrase}` below to confirm." |

---

### insight-banner (AnalyticsPage)

`src/admin/pages/AnalyticsPage.jsx` — full-width informational banners below each analytics section.

| Section | Content |
|---|---|
| Outcome Overview | "`{N} of {M}` outcomes met — `{X}` require attention" / "all outcomes met for this period" |
| Gap Analysis | "Attainment rate shows *what % meet threshold*; gap analysis shows *how far* each deviates — outcomes near zero need monitoring even if above the line." |
| Per-Group Evidence | "Per-group normalized scores provide **direct assessment evidence** for accreditation. Groups below threshold trigger continuous improvement actions." |
| Rubric Distribution | "Rubric bands provide **continuous improvement evidence**; programme averages with ±1σ highlight criteria with high **assessment variability**." |
| Trend Comparison | "Accreditation frameworks require **longitudinal evidence** of outcome monitoring ("closing the loop"). Only evaluation periods sharing the same criteria template are compared." |

Also: `src/admin/pages/AuditLogPage.jsx` — one `insight-banner` (non-full) explaining the audit log retention policy.

---

### Auth screen alerts (src/auth/screens/)

All dynamic — error state passed directly from Supabase Auth responses.
No static text to audit; content is API-driven.

Files: `LoginScreen.jsx`, `RegisterScreen.jsx`, `ForgotPasswordScreen.jsx`,
`ResetPasswordScreen.jsx`, `CompleteProfileScreen.jsx`

---

### Jury flow alerts

`src/jury/steps/IdentityStep.jsx` — `fba-info` banner:
"Name and affiliation cannot be changed once evaluation starts."

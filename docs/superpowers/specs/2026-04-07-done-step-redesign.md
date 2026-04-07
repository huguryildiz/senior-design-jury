# DoneStep Redesign — Premium Completion Experience

## Summary

Redesign the jury DoneStep from a long, information-heavy summary page into a focused, premium completion experience. The current page includes hero stats, per-project score breakdowns with criteria chips, a full feedback form, and multiple navigation buttons — resulting in excessive length and information overload.

The new design follows a 4-layer vertical composition: Hero celebration, progressive-disclosure feedback, utility links, and a return home anchor.

## Current Problems

- Page is too long — combines celebration, detailed score review, feedback form, and 4+ navigation buttons
- Per-project score breakdown is not actionable — juror already knows what they scored
- Avg Score / Top Score stats are not meaningful to the juror
- Feedback form is always fully expanded (stars + textarea + skip/send)
- Edit Scores as primary CTA conflates "you're done" with "maybe you're not done"
- Multiple prominent navigation buttons (Edit Scores, Admin Impact, Admin Sign-In, Return Home) create decision paralysis

## Design

### Layer 1 — Hero (Primary)

Celebratory success moment. Takes visual priority.

- Green gradient checkmark icon (64x64, rounded 18px, subtle glow shadow)
- "EVALUATION SUBMITTED" status pill (green, uppercase, letter-spaced)
- "Thank you, {jurorName}!" as main heading (22px, bold)
- "You've evaluated all **{count} groups** successfully." as subtitle (14px, muted)
- Confetti animation remains (existing `useConfetti` hook, unchanged)
- Subtle gradient divider separates hero from feedback

Group count is embedded in the message text, not a separate stats section. No avg score, no top score, no hero stats grid.

### Layer 2 — Feedback Card (Secondary)

Progressive disclosure micro-prompt. Single card with two states:

**Collapsed (default):**
- Semi-transparent card (same glass style as existing)
- "How was your experience?" label
- 5 star buttons in a row (inactive state)
- No textarea, no buttons visible

**Expanded (after star click):**
- Stars show selection with amber fill + hover label ("Great", "Excellent!" etc.)
- Textarea slides in: "Any additional comments? (optional)"
- Send button appears (blue gradient, with Send icon)
- No skip button — user can simply ignore the form

Star labels remain: `["", "Needs Work", "Below Average", "Average", "Great", "Excellent!"]`

Submit handler: `submitJuryFeedback(periodId, sessionToken, rating, comment)` — fails silently (non-critical).

After successful submit: card transitions to a brief "Thank you for your feedback!" confirmation — reuses the existing `.dj-feedback-submitted` / `.dj-feedback-check` pattern with the green checkmark circle and fade-in animation.

### Layer 2.5 — Live Rankings Snippet (New)

Inline read-only ranking table between Feedback and Utility Links. Shows where all projects stand at the moment of submission. No before/after toggle — position change is communicated via inline delta badges.

**Header:** "Current Rankings" label (9px uppercase, muted, with bar-chart icon)

**Row layout per project** (flex, full width):
- Rank number (monospace, #1 in gold, rest muted)
- Project title (truncated with ellipsis if too long)
- Delta badge: `↑N` (green) if position improved since session start, `↓N` (red) if dropped, `—` (muted) if unchanged
- Score (monospace, #1 score in green)

**Data source:**
- "After" rankings: current live project scores (fetched on submission via `listProjects`)
- "Before" rankings: snapshot of project scores captured when juror enters the eval step (stored in state as `initialRankings`)
- Delta = rank position in after − rank position in before (per project)

**Edge cases:**
- If only one juror has submitted (no meaningful comparison): hide delta badges, show `—` for all
- If `initialRankings` is unavailable: show current scores only, no badges

### Layer 3 — Utility Links (Tertiary)

Two inline text links, no container/card. Separated by a thin vertical divider.

**Request Edit** (mailto link):
- Opens default mail client with pre-filled email
- `TO:` tenant admin email (fetched from period/tenant context)
- `CC:` super admin email
- `Subject:` "Score Edit Request — {period name}"
- `Body:` "Hello,\n\nI would like to request an edit to my submitted scores for {period name}.\n\nJuror: {jurorName}\n\nThank you."
- Icon: Mail (lucide-react)
- Color: muted (#64748b), lightens on hover

**View Full Results** (optional, navigation):
- Only shown if `state.editAllowed` is true (admin-adjacent jurors) or always shown as muted link
- Calls `state.setStep("admin_impact")` if AdminImpactStep is retained, otherwise navigates to admin panel
- Icon: TrendingUp (lucide-react)
- Color: muted, same as Request Edit
- If AdminImpactStep is deprecated: remove this link entirely — rankings snippet provides sufficient context

Both links are 12px, flex with icon+text, no underline.

### Layer 4 — Return Home (Anchor)

- Thin separator line (gradient fade, like hero divider)
- "← Return to Home" text link
- Icon: ArrowLeft (lucide-react)
- Color: most muted (#475569)
- `onClick`: calls `state.clearLocalSession()` then `onBack()`
- Positioned at bottom with top margin + separator — clearly the "exit" action

### Removed Elements

- **Hero stats grid** (groups scored / avg score / top score) — replaced by inline count in message
- **Per-project breakdown** (project rows, criteria chips, progress bars, score badges) — entirely removed
- **"Scores are final" info banner** — unnecessary; the submitted pill communicates finality
- **"Submitted Groups" section** with scrollable list — removed
- **Edit Scores primary button** — replaced by Request Edit mailto
- **Admin Sign-In button** — removed (niche action, admin can navigate there independently)
- **"Next Step" section label** — removed (no section labels needed)
- **Skip button** in feedback — removed (user can simply not interact)
- **AdminImpactStep as dedicated step** — deprecated. Before/after toggle provided poor UX (mathematical impact too small to be impressive, complex to implement accurately). Rankings are now inline in DoneStep as a lightweight snapshot. If AdminImpactStep.jsx is retained for admin-facing use, it is no longer reachable from the juror flow.

### Removed Code

- `getGradeClass()`, `getBarClass()`, `getScoreStyle()` helper functions — no longer needed
- `projectStats` computation (per-project totals, criteria breakdown, percentages)
- `avgScore`, `topScore` calculations
- `handleAdminSignIn` handler
- `handleOpenAdminImpact` — replaced by inline call in View Insights link
- `StudentNames` import and usage

### Kept/Modified Code

- `useConfetti` hook — kept as-is
- `submitJuryFeedback` API call — kept, same interface
- Feedback state (`fbRating`, `fbComment`, `fbStatus`, `fbHover`) — kept, `fbStatus` simplified (no "skipped" state)
- `handleReturnHome` — kept as-is
- `STAR_LABELS` array — kept

## Data Requirements

### Tenant Admin Email

The mailto link needs the tenant admin's email address. This must be available in the jury flow state.

**Approach:** Include tenant admin email in the period/semester data that the jury flow already loads. This avoids an extra RPC call — the data comes with the existing `_loadSemester` flow.

If the tenant admin email is unavailable (null/empty), the Request Edit link falls back to a static message: "Contact your administrator to request changes." — no mailto, just text.

**Super admin email:** Use the `VITE_SUPER_ADMIN_EMAIL` env var (to be added). If not set, CC field is omitted from the mailto.

### Initial Rankings Snapshot

The rankings delta badges require a "before" baseline — project scores as they stood when the juror began their session.

**Approach:** When `_loadSemester` completes and projects are first loaded, capture the current `avg_score` (or equivalent) for each project as `initialRankings: { [project_id]: { rank, score } }`. Store in `useJuryLoading` state, expose via `useJuryState`. This data is already available in the `listProjects` response — no extra RPC needed, just capture and hold it.

**Timing:** Snapshot is taken once on eval entry. It is never refreshed during the session. On submission, the live scores are re-fetched — the delta is computed at render time in DoneStep.

**If `initialRankings` is absent** (e.g. session restored from storage without it): show rankings without delta badges.

### Implementation Note

The `state.editAllowed` flag is no longer used in DoneStep. The edit flow is now entirely through the mailto request mechanism. The flag and related hooks (`useJuryEditState`) can remain in the codebase — they may be useful for future features — but DoneStep no longer branches on them.

## CSS Changes

### Remove

All `dj-done-hero-*`, `dj-done-proj-*`, `dj-done-crit-*`, `dj-done-primary-btn*`, `dj-done-secondary-row`, `dj-done-sec-btn`, `dj-done-section-label`, `dj-done-list-wrap`, `grade-*`, `bar-*` classes from jury.css.

### Add

- `.dj-done-divider` — subtle gradient separator between hero and feedback
- `.dj-done-utility-links` — flex row for Request Edit / View Full Results
- `.dj-done-utility-link` — individual link style (muted, icon+text, hover lighten)
- `.dj-done-utility-divider` — thin vertical separator between links
- `.dj-done-home-link` — bottom return link with top separator
- `.dj-feedback-card--collapsed` / `.dj-feedback-card--expanded` — progressive disclosure states with CSS transition
- `.dj-done-rankings` — rankings snippet container (border-bottom separator, padding)
- `.dj-done-rankings-header` — "Current Rankings" label (9px uppercase, muted, icon)
- `.dj-done-rank-row` — individual ranking row (flex, hover highlight)
- `.dj-done-rank-num` — monospace rank number; `.gold` modifier for #1
- `.dj-done-rank-title` — project title (truncated)
- `.dj-done-rank-badge` — delta badge; `.badge-up` (green), `.badge-down` (red), `.badge-same` (muted)
- `.dj-done-rank-score` — monospace score; `.top` modifier for #1 (green)

### Modify

- `.dj-feedback-card` — remove the full form layout, make it a micro-prompt container
- `.dj-feedback-textarea` — add slide-in transition (`max-height` + `opacity` animation)
- `.dj-feedback-actions` — simplify to just Send button (no skip)

## Accessibility

- Star buttons remain keyboard-navigable (existing)
- Feedback textarea has proper label association
- Utility links have descriptive text (no icon-only links)
- Return Home link is clearly labeled with arrow direction
- All interactive elements have `:focus-visible` styles using `var(--btn-focus-ring-brand)`

## Testing

- Update existing DoneStep tests (if any) to reflect removed elements
- No new unit tests needed — this is primarily a UI simplification
- Manual test: verify confetti still fires, feedback submit works, mailto opens correctly, View Insights navigates properly

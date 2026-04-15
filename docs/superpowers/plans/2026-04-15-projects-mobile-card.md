# Projects Mobile Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing portrait-mobile collapsed-table card on the Projects page with a "Ranked Hero" design featuring a conic-gradient score ring, avatar chips for team members, and a stat footer.

**Architecture:** All changes are scoped to the portrait-mobile media block (`max-width: 768px and orientation: portrait`) in `src/styles/pages/projects.css`. The same `<tr>` markup is reused — CSS Grid re-lays out cells into hero / body / footer regions. `ProjectsPage.jsx` gains one new memo (evaluation-count map) and one new `<td className="col-footer">` per row. A small pure helper (`avatarColor.js`) provides deterministic gradient + initials. Desktop table and landscape-compact layouts remain untouched.

**Tech Stack:** React 18, Vite, vanilla CSS with project CSS variables, Vitest, lucide-react, PremiumTooltip, FloatingMenu.

**Spec:** `docs/superpowers/specs/2026-04-15-projects-mobile-card-design.md`

---

## Task 1: Avatar Color Helper

**Files:**
- Create: `src/shared/ui/avatarColor.js`
- Create: `src/shared/__tests__/avatarColor.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/shared/__tests__/avatarColor.test.js`:

```js
import { describe, expect, it } from "vitest";
import { avatarGradient, initials } from "../ui/avatarColor";

describe("avatarColor", () => {
  describe("avatarGradient", () => {
    it("returns a linear-gradient CSS string", () => {
      expect(avatarGradient("Ayşe Kaya")).toMatch(/^linear-gradient\(/);
    });

    it("returns the same gradient for the same name (deterministic)", () => {
      expect(avatarGradient("Murat Bilgin")).toBe(avatarGradient("Murat Bilgin"));
    });

    it("distributes across the palette for different names", () => {
      const names = ["Ada", "Bora", "Cem", "Deniz", "Ece", "Fuat", "Gizem", "Hakan"];
      const gradients = new Set(names.map(avatarGradient));
      expect(gradients.size).toBeGreaterThan(1);
    });

    it("handles empty string without throwing", () => {
      expect(() => avatarGradient("")).not.toThrow();
      expect(avatarGradient("")).toMatch(/^linear-gradient\(/);
    });
  });

  describe("initials", () => {
    it("returns two-letter initials for full name", () => {
      expect(initials("Ayşe Kaya")).toBe("AK");
    });

    it("returns first two letters for single name", () => {
      expect(initials("Ayşe")).toBe("AY");
    });

    it("uses first + last for 3+ word names", () => {
      expect(initials("Ali Can Özdemir")).toBe("AÖ");
    });

    it("applies Turkish uppercase rules", () => {
      expect(initials("ilker yılmaz")).toBe("İY");
    });

    it("returns ? for empty / falsy input", () => {
      expect(initials("")).toBe("?");
      expect(initials(null)).toBe("?");
      expect(initials(undefined)).toBe("?");
    });

    it("trims whitespace", () => {
      expect(initials("  Emre  Demir  ")).toBe("ED");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/shared/__tests__/avatarColor.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement helper**

Create `src/shared/ui/avatarColor.js`:

```js
// Deterministic avatar gradient + initials helper for member chip avatars.
// Used by Projects mobile card (src/admin/pages/ProjectsPage.jsx) and
// extractable for other surfaces later.

const PALETTE = [
  "linear-gradient(135deg,#3b82f6,#2563eb)", // blue
  "linear-gradient(135deg,#8b5cf6,#7c3aed)", // purple
  "linear-gradient(135deg,#10b981,#059669)", // green
  "linear-gradient(135deg,#f59e0b,#d97706)", // amber
  "linear-gradient(135deg,#ec4899,#db2777)", // pink
];

export function avatarGradient(name) {
  const key = String(name ?? "");
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function initials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const up = (s) => s.toLocaleUpperCase("tr-TR");
  if (parts.length === 1) return up(parts[0].slice(0, 2));
  return up(parts[0][0] + parts[parts.length - 1][0]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/shared/__tests__/avatarColor.test.js`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/avatarColor.js src/shared/__tests__/avatarColor.test.js
git commit -m "feat(shared): add avatarGradient + initials helper"
```

---

## Task 2: Evaluation-Count Memo in ProjectsPage

**Files:**
- Modify: `src/admin/pages/ProjectsPage.jsx` (insert after the `projectAvgMap` memo, around line 163)

- [ ] **Step 1: Add the memo**

In `src/admin/pages/ProjectsPage.jsx`, directly after the closing bracket of the `projectAvgMap` memo (around line 163), insert:

```jsx
  // Per-project distinct juror count (for mobile footer "N evaluations").
  const projectEvalCountMap = useMemo(() => {
    const map = new Map();
    if (!rawScores?.length) return map;
    const byProject = new Map();
    for (const r of rawScores) {
      const pid = r.projectId || r.project_id;
      const jid = r.jurorId || r.juror_id;
      if (!pid || !jid) continue;
      if (!byProject.has(pid)) byProject.set(pid, new Set());
      byProject.get(pid).add(jid);
    }
    for (const [pid, set] of byProject) map.set(pid, set.size);
    return map;
  }, [rawScores]);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success, no type/lint errors.

- [ ] **Step 3: Commit**

```bash
git add src/admin/pages/ProjectsPage.jsx
git commit -m "feat(projects): add projectEvalCountMap memo"
```

---

## Task 3: Mobile Card Markup in Table Row

**Files:**
- Modify: `src/admin/pages/ProjectsPage.jsx` (imports + the `pagedList.map` `<tr>` body, around lines 551–636)

- [ ] **Step 1: Add imports**

At the top of `src/admin/pages/ProjectsPage.jsx`, update imports:

- In the `lucide-react` import line (currently `import { BarChart2, Filter, UserRound, MoreVertical, Pencil, Eye, Trash2, Icon } from "lucide-react";`), add `Users, Clock3`:

```jsx
import { BarChart2, Filter, UserRound, MoreVertical, Pencil, Eye, Trash2, Icon, Users, Clock3 } from "lucide-react";
```

- Add a new line after the `StudentNames` import:

```jsx
import { avatarGradient, initials } from "@/shared/ui/avatarColor";
```

- [ ] **Step 2: Extract mobile-only helpers above the component**

Immediately after `formatRelative(...)` (around line 68) and before `SortIcon`, insert:

```jsx
// Score band color for mobile ring. Matches variables.css semantic tokens.
function scoreBandToken(score, max) {
  if (score == null || !Number.isFinite(Number(score))) return "var(--text-tertiary)";
  const pct = (Number(score) / (max || 100)) * 100;
  if (pct >= 85) return "var(--success)";
  if (pct >= 70) return "var(--warning)";
  return "var(--danger)";
}

// Render up to 4 member chips + optional +N pill. Tooltip wraps each chip.
function MemberChips({ members }) {
  const arr = membersToArray(members);
  if (!arr.length) {
    return <span className="member-chips member-chips-empty">No team</span>;
  }
  const visible = arr.slice(0, 4);
  const extra = arr.length - visible.length;
  return (
    <span className="member-chips">
      {visible.map((name, i) => (
        <span
          key={`${name}-${i}`}
          className="member-chip"
          style={{ background: avatarGradient(name) }}
          title={name}
        >
          {initials(name)}
        </span>
      ))}
      {extra > 0 && (
        <span className="member-chip member-chip-more" title={`${extra} more`}>
          +{extra}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 3: Update the No cell to include the mobile rank ring**

Replace the current `<td className="text-center" data-label="No">` block (around lines 553–557) with:

```jsx
                <td className="text-center col-no" data-label="No">
                  <span className="mobile-rank-ring" aria-hidden="true">
                    <span
                      className="mobile-rank-ring-fill"
                      style={(() => {
                        const avg = projectAvgMap.get(project.id);
                        const max = periodMaxScore || 100;
                        const pct = avg != null && Number.isFinite(Number(avg))
                          ? Math.min(360, (Number(avg) / max) * 360)
                          : 0;
                        return {
                          "--pct": `${pct}deg`,
                          "--ring": scoreBandToken(avg, max),
                        };
                      })()}
                    >
                      <span className="mobile-rank-ring-inner">
                        <span className="mobile-rank-ring-num">
                          {projectAvgMap.has(project.id)
                            ? Math.round(Number(projectAvgMap.get(project.id)))
                            : "—"}
                        </span>
                        <span className="mobile-rank-ring-lbl">AVG</span>
                      </span>
                    </span>
                  </span>
                  {project.group_no != null
                    ? <span className="project-no-badge">P{project.group_no}</span>
                    : <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>—</span>}
                </td>
```

- [ ] **Step 4: Add eyebrow text to the Title cell**

Replace the current `<td data-label="Project Title">` block (around lines 558–574) with:

```jsx
                <td data-label="Project Title" className="col-title">
                  <span className="mobile-eyebrow">
                    PROJECT{project.group_no != null ? ` · P${project.group_no}` : ""}
                  </span>
                  <div style={{ fontWeight: 600, lineHeight: 1.35 }}>{project.title}</div>
                  {project.advisor && (() => {
                    const advisors = project.advisor.split(",").map((s) => s.trim()).filter(Boolean);
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                        <UserRound size={11} style={{ color: "var(--text-quaternary)", flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>
                          {advisors.length === 1
                            ? <><span>Advisor:</span> {advisors[0]}</>
                            : <><span>Advisors:</span> {advisors.join(", ")}</>
                          }
                        </span>
                      </div>
                    );
                  })()}
                </td>
```

- [ ] **Step 5: Render both text and chip variants in the Members cell**

Replace the current `<td className="col-members" data-label="Team Members">` block (around lines 575–577) with:

```jsx
                <td className="col-members" data-label="Team Members">
                  <span className="members-text"><StudentNames names={project.members} /></span>
                  <span className="members-chips-wrap">
                    <span className="members-chips-label">Team</span>
                    <MemberChips members={project.members} />
                  </span>
                </td>
```

- [ ] **Step 6: Add the mobile-only footer cell**

Directly after the closing `</td>` of the Actions cell (around line 634, before the closing `</tr>`), insert:

```jsx
                <td className="col-footer" aria-hidden="true">
                  <span><strong>{membersToArray(project.members).length}</strong> members</span>
                  <span><strong>{projectEvalCountMap.get(project.id) ?? 0}</strong> evaluations</span>
                  <PremiumTooltip text={formatFull(project.updated_at)}>
                    <span>{formatRelative(project.updated_at)}</span>
                  </PremiumTooltip>
                </td>
```

- [ ] **Step 7: Update empty-state colSpan**

The existing loading/empty `<tr>` uses `colSpan={6}` (lines 524 and 530). The new footer cell is hidden on desktop but still present in the DOM, so the `<tr>` now has 7 cells. Update both `colSpan={6}` to `colSpan={7}`.

- [ ] **Step 8: Verify desktop rendering (build + visual)**

Run: `npm run build`
Expected: success.

Run: `npm run dev` and open `http://localhost:5173/admin/projects` in a desktop-width window.
Expected: table looks identical to pre-change (footer cell hidden via CSS added in Task 4). If the footer cell renders visibly on desktop before CSS lands, that is expected — confirm it goes away after Task 4.

- [ ] **Step 9: Commit**

```bash
git add src/admin/pages/ProjectsPage.jsx
git commit -m "feat(projects): add mobile rank ring + chips + footer cell markup"
```

---

## Task 4: Portrait Mobile CSS — Rank Ring, Chips, Footer, Grid Layout

**Files:**
- Modify: `src/styles/pages/projects.css` (rewrite the `@media (max-width: 768px) and (orientation: portrait)` block, add a global `.col-footer` hide rule)

- [ ] **Step 1: Hide mobile-only elements on desktop**

Near the top of `src/styles/pages/projects.css` (after the existing `.vera-datetime-text` block around line 13, before the `manage-student-row` block), insert:

```css
/* ─── Mobile-only elements are hidden on desktop / landscape ── */
#projects-main-table td.col-footer,
#projects-main-table th.col-footer { display: none; }
#projects-main-table .mobile-rank-ring,
#projects-main-table .mobile-eyebrow,
#projects-main-table .members-chips-wrap { display: none; }
```

- [ ] **Step 2: Replace the portrait media block**

Delete the entire block `@media (max-width: 768px) and (orientation: portrait) { ... }` (currently lines 22–121) and replace with:

```css
/* ─── Portrait card layout (≤ 768px portrait) ─────────────────
   Each table row becomes a Ranked Hero card:
   - Hero: rank ring · title + eyebrow · kebab
   - Body: advisor · avatar chip stack
   - Footer: members · evaluations · timestamp
   ──────────────────────────────────────────────────────────── */
@media (max-width: 768px) and (orientation: portrait) {
  #page-projects .table-wrap {
    overflow: hidden;
    border: none;
    background: none;
    box-shadow: none;
    border-radius: 0;
  }

  #projects-main-table { display: contents; }
  #projects-main-table thead { display: none !important; }
  #projects-main-table tbody { display: block; width: 100%; }

  /* Card container — CSS Grid with named areas */
  #projects-main-table tbody tr {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      "ring title actions"
      "ring advisor advisor"
      "members members members"
      "footer footer footer";
    gap: 0 12px;
    width: 100%;
    box-sizing: border-box;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 12px;
    padding: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    transition: box-shadow .15s, border-color .15s;
    cursor: pointer;
    overflow: hidden;
  }
  #projects-main-table tbody tr:hover {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.10);
  }

  /* Cells: strip defaults */
  #projects-main-table td {
    display: block;
    border-bottom: none;
    padding: 0;
    box-sizing: border-box;
  }
  /* Hide desktop data-label micro-labels — this layout has explicit structure */
  #projects-main-table td[data-label]::before { content: none; }

  /* ── Hero band background (applied to first 3 grid areas) ── */
  #projects-main-table tbody tr::before {
    content: "";
    grid-area: ring / ring / advisor / actions;
    background: linear-gradient(135deg, var(--surface-1) 0%, var(--bg-card) 50%);
    border-bottom: 1px solid var(--border);
    z-index: 0;
  }

  /* Rank ring cell (No) */
  #projects-main-table td.col-no {
    grid-area: ring;
    padding: 14px 0 14px 14px;
    align-self: center;
    z-index: 1;
    text-align: left !important;
  }
  #projects-main-table td.col-no .project-no-badge { display: none; }
  #projects-main-table .mobile-rank-ring {
    display: block;
    width: 48px;
    height: 48px;
  }
  #projects-main-table .mobile-rank-ring-fill {
    position: relative;
    display: block;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: conic-gradient(var(--ring, var(--text-tertiary)) var(--pct, 0deg), var(--border) 0);
  }
  #projects-main-table .mobile-rank-ring-fill::after {
    content: "";
    position: absolute;
    inset: 3px;
    background: var(--bg-card);
    border-radius: 50%;
  }
  #projects-main-table .mobile-rank-ring-inner {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1;
    z-index: 1;
  }
  #projects-main-table .mobile-rank-ring-num {
    font-size: 14px;
    font-weight: 700;
    color: var(--ring, var(--text-tertiary));
  }
  #projects-main-table .mobile-rank-ring-lbl {
    font-size: 7px;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 1px;
    font-weight: 600;
  }

  /* Title cell */
  #projects-main-table td.col-title {
    grid-area: title;
    padding: 14px 0 0 0;
    min-width: 0;
    z-index: 1;
  }
  #projects-main-table td.col-title > div:first-of-type {
    font-size: 13.5px;
    font-weight: 650;
    line-height: 1.3;
    letter-spacing: -0.2px;
    color: var(--text-primary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  #projects-main-table .mobile-eyebrow {
    display: block;
    font-size: 10px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.6px;
    margin-bottom: 2px;
  }

  /* Advisor row — span under title */
  #projects-main-table td.col-title > div:nth-of-type(2) {
    grid-area: advisor;
    padding: 4px 14px 14px 0;
  }
  /* Since advisor lives inside col-title, keep it in-flow there. The grid area
     assignment above does not apply to nested divs; this comment documents
     that the advisor line is intentionally a child of col-title for DOM reasons. */

  /* Actions (kebab) cell — top-right */
  #projects-main-table td.col-actions {
    grid-area: actions;
    padding: 12px 12px 0 0;
    align-self: start;
    text-align: right !important;
    z-index: 1;
  }

  /* Members cell — hide text, show chips */
  #projects-main-table td.col-members {
    grid-area: members;
    padding: 10px 14px 12px;
  }
  #projects-main-table td.col-members .members-text { display: none; }
  #projects-main-table td.col-members .members-chips-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #projects-main-table td.col-members .members-chips-label {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-tertiary);
    font-weight: 600;
    flex-shrink: 0;
  }
  #projects-main-table .member-chips {
    display: flex;
    align-items: center;
    min-width: 0;
  }
  #projects-main-table .member-chips-empty {
    font-size: 11px;
    color: var(--text-tertiary);
    font-style: italic;
  }
  #projects-main-table .member-chip {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    color: #fff;
    font-size: 9.5px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--bg-card);
    margin-left: -6px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
    flex-shrink: 0;
  }
  #projects-main-table .member-chip:first-child { margin-left: 0; }
  #projects-main-table .member-chip-more {
    background: var(--surface-1) !important;
    color: var(--text-secondary);
    font-size: 10px;
  }

  /* Footer cell — show on mobile */
  #projects-main-table td.col-footer {
    grid-area: footer;
    display: flex !important;
    justify-content: space-between;
    align-items: center;
    padding: 8px 14px;
    background: var(--surface-1);
    border-top: 1px solid var(--border);
    font-size: 10.5px;
    color: var(--text-tertiary);
  }
  #projects-main-table td.col-footer strong {
    color: var(--text-secondary);
    font-weight: 600;
  }

  /* Hide cells that are no longer used directly on mobile (avg + updated columns)
     — their data is now represented by the rank ring and footer */
  #projects-main-table td.avg-score-cell,
  #projects-main-table td.col-updated { display: none; }
}
```

- [ ] **Step 3: Run build + unit tests**

Run: `npm run build`
Expected: success.

Run: `npm test -- --run`
Expected: all existing tests still pass.

Run: `npm run check:no-native-select`
Expected: pass.

- [ ] **Step 4: Visual smoke test — desktop**

Run: `npm run dev` and open `http://localhost:5173/admin/projects` at 1280px viewport.
Expected: table looks identical to before (no footer row visible, no rank ring visible, no eyebrow visible, no chips visible).

- [ ] **Step 5: Visual smoke test — portrait mobile**

In the same dev browser, open DevTools device toolbar, select iPhone 14 Pro (393×852, portrait).
Expected:
  - Each row is a card with rounded corners, white surface, 1px border.
  - Top-left: 48px conic ring showing score and AVG label; color green for ≥85, amber 70–84, red <70.
  - Top-right of hero: kebab button; tap opens FloatingMenu.
  - Below hero: advisor row with user icon (if advisor exists).
  - Below advisor: "TEAM" label + avatar chips. 5+ members → 4 chips + `+N` pill.
  - Bottom footer strip: `N members · M evaluations · 27m ago` on `var(--surface-1)` background.
  - Tap on card anywhere (not kebab) opens detail drawer.
  - Toggle dark mode — card, ring inner, footer, and text all flip correctly.

- [ ] **Step 6: Visual smoke test — landscape compact**

In DevTools, switch to iPhone 14 Pro landscape (852×393).
Expected: the existing landscape-compact layout (lines after the portrait block in the CSS, still intact) continues to hide `col-members` and `col-updated` — unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/styles/pages/projects.css
git commit -m "feat(projects): ranked-hero card layout for portrait mobile"
```

---

## Self-Review Checklist

- [x] **Spec coverage** — Every spec section has a task:
  - Hero band with rank ring → Task 3 Step 3 + Task 4 Step 2
  - Title eyebrow + title + kebab → Task 3 Steps 3–4
  - Advisor line → Task 3 Step 4 (kept from existing code)
  - Team chips + TEAM label + +N → Task 3 Step 2 + Step 5 + Task 4 Step 2
  - Footer with evaluations → Task 2 + Task 3 Step 6 + Task 4 Step 2
  - Avatar color helper → Task 1
  - Score bands (success/warning/danger) → Task 3 Step 2 (`scoreBandToken`)
  - Desktop unchanged → Task 4 Step 1 (global hide rules) + Step 4 (visual check)
  - Dark mode — uses tokens throughout → Task 4 Step 5 (visual check)
- [x] **Placeholder scan** — No TBD, no "implement later", no "add validation", every code step shows the full code.
- [x] **Type consistency** — `avatarGradient` / `initials` signatures match between Task 1 and Task 3. `projectEvalCountMap.get(project.id)` and `membersToArray(project.members)` helpers used consistently. CSS grid areas (`ring`, `title`, `advisor`, `actions`, `members`, `footer`) referenced consistently in Task 4.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-15-projects-mobile-card.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

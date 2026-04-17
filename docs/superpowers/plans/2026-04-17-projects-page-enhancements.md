# Projects Page Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five targeted improvements to ProjectsPage: icon swap, locked-state highlight for View Scores, Evaluated KPI, Duplicate action, and a 4-criteria filter panel.

**Architecture:** All changes are isolated to `ProjectsPage.jsx` and `projects.css`. No new files, no API changes, no DB migration. Filter logic is a client-side useMemo extension. Duplicate reuses the existing `handleAddProject` hook call.

**Tech Stack:** React 18, lucide-react, `src/shared/ui/CustomSelect.jsx`, `src/styles/pages/projects.css`

**Spec:** `docs/superpowers/specs/2026-04-17-projects-page-enhancements-design.md`

---

## File Map

| File | What changes |
|------|-------------|
| `src/admin/pages/ProjectsPage.jsx` | Icon swap, locked highlight, KPI card, Duplicate action, filter state + pipeline + panel UI |
| `src/styles/pages/projects.css` | `.floating-menu-item--highlight`, `.lock-notice-chip.active`, filter toggle group styles |

---

## Task 1: CSS — filter toggles + floating-menu highlight

**Files:**
- Modify: `src/styles/pages/projects.css`

- [ ] **Step 1: Add styles at the bottom of `projects.css`**

Append the following block (do not replace anything):

```css
/* ─── Filter toggle group ─────────────────────────────────── */
.filter-toggle-group {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.filter-toggle-btn {
  padding: 4px 11px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface-1);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s, border-color .12s;
  white-space: nowrap;
}
.filter-toggle-btn:hover {
  background: var(--surface-2);
  border-color: var(--border-strong);
}
.filter-toggle-btn--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
body:not(.dark-mode) .filter-toggle-btn--active {
  color: #fff;
}

/* ─── Filter panel rows ───────────────────────────────────── */
.filter-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.filter-row:last-of-type { margin-bottom: 0; }
.filter-row-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary);
}
.filter-clear-link {
  display: inline-block;
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-tertiary);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  background: none;
  border: none;
  padding: 0;
}
.filter-clear-link:hover { color: var(--danger); }

/* ─── Floating menu: View Scores highlighted when locked ─── */
.floating-menu-item--highlight {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent) !important;
  font-weight: 600;
}
.floating-menu-item--highlight:hover {
  background: color-mix(in srgb, var(--accent) 18%, transparent) !important;
}

/* ─── Lock notice: active (unlocked) chip ─────────────────── */
.lock-notice-chip.active {
  opacity: 1;
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
```

- [ ] **Step 2: Verify build compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors (warnings about unused vars OK).

- [ ] **Step 3: Commit**

```bash
git add src/styles/pages/projects.css
git commit -m "style(projects): filter toggle group, floating menu highlight, active lock chip"
```

---

## Task 2: Icon swap + locked View Scores highlight

**Files:**
- Modify: `src/admin/pages/ProjectsPage.jsx`

- [ ] **Step 1: Update the import line**

Find:
```js
import { BarChart2, Filter, UserRound, MoreVertical, Pencil, Eye, Trash2, Icon, FolderOpen, Upload, Plus, Info, LockKeyhole, Lock } from "lucide-react";
```

Replace with:
```js
import { ClipboardList, Filter, UserRound, MoreVertical, Pencil, Copy, Trash2, Icon, FolderOpen, Upload, Plus, Info, LockKeyhole, Lock } from "lucide-react";
```

(`Eye` removed — unused; `BarChart2` → `ClipboardList`; `Copy` added for Duplicate.)

- [ ] **Step 2: Update the "View Scores" kebab menu item**

Find (around line 797):
```jsx
                    <button
                      className="floating-menu-item"
                      onMouseDown={() => { setOpenMenuId(null); setScoresProject(project); }}
                    >
                      <BarChart2 size={13} />
                      View Scores
                    </button>
```

Replace with:
```jsx
                    <button
                      className={`floating-menu-item${isLocked ? " floating-menu-item--highlight" : ""}`}
                      onMouseDown={() => { setOpenMenuId(null); setScoresProject(project); }}
                    >
                      <ClipboardList size={13} />
                      View Scores
                    </button>
```

- [ ] **Step 3: Add "View Scores" as an active chip in the lock notice**

Find the lock-notice-chips block (around line 493):
```jsx
            <div className="lock-notice-chips">
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Add Projects</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Import CSV</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Edit Projects</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Delete Projects</span>
            </div>
```

Replace with:
```jsx
            <div className="lock-notice-chips">
              <span className="lock-notice-chip active"><ClipboardList size={11} strokeWidth={2} /> View Scores</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Add Projects</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Import CSV</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Edit Projects</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Delete Projects</span>
            </div>
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/admin/pages/ProjectsPage.jsx
git commit -m "feat(projects): swap View Scores icon to ClipboardList, highlight when locked"
```

---

## Task 3: KPI strip — Evaluated counter

**Files:**
- Modify: `src/admin/pages/ProjectsPage.jsx`

- [ ] **Step 1: Add `evaluatedCount` to the KPI derivations block**

Find (around line 337):
```js
  // KPI stats
  const totalProjects = projectList.length;
  const totalMembers = projectList.reduce((sum, p) => {
    return sum + membersToArray(p.members).length;
  }, 0);
```

Replace with:
```js
  // KPI stats
  const totalProjects = projectList.length;
  const totalMembers = projectList.reduce((sum, p) => {
    return sum + membersToArray(p.members).length;
  }, 0);
  const kpiBase = filteredList.length !== projectList.length ? filteredList : projectList;
  const kpiTotalProjects = kpiBase.length;
  const kpiTotalMembers = kpiBase.reduce((sum, p) => sum + membersToArray(p.members).length, 0);
  const kpiEvaluated = kpiBase.filter((p) => projectAvgMap.has(p.id)).length;
```

Note: `totalProjects` and `totalMembers` remain in scope (used by `handleAddSave` group_no fallback). The new `kpiBase*` vars are used only in the KPI strip.

- [ ] **Step 2: Update the KPI strip JSX**

Find:
```jsx
      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{totalProjects}</div>
          <div className="scores-kpi-item-label">Projects</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{totalMembers}</div>
          <div className="scores-kpi-item-label">Team Members</div>
        </div>
      </div>
```

Replace with:
```jsx
      {/* KPI strip */}
      <div className="scores-kpi-strip">
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{kpiTotalProjects}</div>
          <div className="scores-kpi-item-label">Projects</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{kpiTotalMembers}</div>
          <div className="scores-kpi-item-label">Team Members</div>
        </div>
        <div className="scores-kpi-item">
          <div className="scores-kpi-item-value">{kpiEvaluated} / {kpiTotalProjects}</div>
          <div className="scores-kpi-item-label">Evaluated</div>
        </div>
      </div>
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/admin/pages/ProjectsPage.jsx
git commit -m "feat(projects): add Evaluated KPI counter to strip"
```

---

## Task 4: Duplicate Project action

**Files:**
- Modify: `src/admin/pages/ProjectsPage.jsx`

- [ ] **Step 1: Add `handleDuplicate` function after `handleAddSave`**

Find (around line 380, after `handleAddSave`):
```js
  async function handleAddSave(data) {
    ...
  }

  return (
```

Insert between `handleAddSave` and `return (`:

```js
  async function handleDuplicate(project) {
    setOpenMenuId(null);
    const maxNo = Math.max(0, ...projectList.map((p) => Number(p.group_no) || 0));
    const result = await projects.handleAddProject({
      title: `Copy of ${project.title || ""}`.slice(0, 100),
      advisor: project.advisor || "",
      description: project.description || "",
      group_no: maxNo + 1,
      members: membersToArray(project.members),
    });
    if (result?.ok === false) {
      _toast.error(result.message || "Could not duplicate project.");
    } else {
      _toast.success("Project duplicated.");
    }
  }
```

- [ ] **Step 2: Add Duplicate button to the kebab menu**

Find the Edit Project / View Scores / Delete Project block in the FloatingMenu (the full block starting with the Edit button, around line 788):
```jsx
                    <button
                      className="floating-menu-item"
                      onMouseDown={() => { if (!isLocked) { setOpenMenuId(null); openEditDrawer(project); } }}
                      disabled={isLocked}
                      style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
                    >
                      <Pencil size={13} />
                      Edit Project
                    </button>
                    <button
                      className={`floating-menu-item${isLocked ? " floating-menu-item--highlight" : ""}`}
                      onMouseDown={() => { setOpenMenuId(null); setScoresProject(project); }}
                    >
                      <ClipboardList size={13} />
                      View Scores
                    </button>
                    <div className="floating-menu-divider" />
                    <button
                      className="floating-menu-item danger"
                      onMouseDown={() => {
                        if (!isLocked) { setOpenMenuId(null); setDeleteTarget(project); }
                      }}
                      disabled={isLocked}
                      style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
                    >
                      <Trash2 size={13} />
                      Delete Project
                    </button>
```

Replace with:
```jsx
                    <button
                      className="floating-menu-item"
                      onMouseDown={() => { if (!isLocked) { setOpenMenuId(null); openEditDrawer(project); } }}
                      disabled={isLocked}
                      style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
                    >
                      <Pencil size={13} />
                      Edit Project
                    </button>
                    <button
                      className="floating-menu-item"
                      onMouseDown={() => { if (!isLocked) handleDuplicate(project); }}
                      disabled={isLocked}
                      style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
                    >
                      <Copy size={13} />
                      Duplicate
                    </button>
                    <button
                      className={`floating-menu-item${isLocked ? " floating-menu-item--highlight" : ""}`}
                      onMouseDown={() => { setOpenMenuId(null); setScoresProject(project); }}
                    >
                      <ClipboardList size={13} />
                      View Scores
                    </button>
                    <div className="floating-menu-divider" />
                    <button
                      className="floating-menu-item danger"
                      onMouseDown={() => {
                        if (!isLocked) { setOpenMenuId(null); setDeleteTarget(project); }
                      }}
                      disabled={isLocked}
                      style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : {}}
                    >
                      <Trash2 size={13} />
                      Delete Project
                    </button>
```

- [ ] **Step 3: Add "Duplicate Projects" chip to the lock notice**

Find the lock-notice-chips block (updated in Task 2):
```jsx
            <div className="lock-notice-chips">
              <span className="lock-notice-chip active"><ClipboardList size={11} strokeWidth={2} /> View Scores</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Add Projects</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Import CSV</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Edit Projects</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Delete Projects</span>
            </div>
```

Replace with:
```jsx
            <div className="lock-notice-chips">
              <span className="lock-notice-chip active"><ClipboardList size={11} strokeWidth={2} /> View Scores</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Add Projects</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Import CSV</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Duplicate</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Edit Projects</span>
              <span className="lock-notice-chip locked"><Lock size={11} strokeWidth={2} /> Delete Projects</span>
            </div>
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/admin/pages/ProjectsPage.jsx
git commit -m "feat(projects): add Duplicate Project action to kebab menu"
```

---

## Task 5: Filter state + pipeline + panel UI

**Files:**
- Modify: `src/admin/pages/ProjectsPage.jsx`

- [ ] **Step 1: Add CustomSelect import**

Find:
```js
import "../../styles/pages/projects.css";
```

Add above it:
```js
import CustomSelect from "@/shared/ui/CustomSelect";
```

- [ ] **Step 2: Add filter state after the existing `[filterOpen, setFilterOpen]` state**

Find:
```js
  const [filterOpen, setFilterOpen] = useState(false);
```

Replace with:
```js
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    evalStatus: "all",
    advisor: "",
    scoreBand: "all",
    teamSize: "all",
  });
```

- [ ] **Step 3: Add `distinctAdvisors` derived value after `projectEvalCountMap`**

Find (after the `projectEvalCountMap` useMemo block, around line 220):
```js
  const deleteImpact = useMemo(() => {
```

Insert before it:
```js
  const distinctAdvisors = useMemo(() => {
    const set = new Set();
    for (const p of projectList) {
      (p.advisor || "").split(",").map((s) => s.trim()).filter(Boolean).forEach((a) => set.add(a));
    }
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [projectList]);
```

- [ ] **Step 4: Add `filterActiveCount` after the `filters` state**

Find (after the `setFilters` state line you added in Step 2):
```js
  const [filters, setFilters] = useState({
    evalStatus: "all",
    advisor: "",
    scoreBand: "all",
    teamSize: "all",
  });
```

Add after the closing `});`:
```js
  const filterActiveCount = [
    filters.evalStatus !== "all",
    filters.advisor !== "",
    filters.scoreBand !== "all",
    filters.teamSize !== "all",
  ].filter(Boolean).length;
```

- [ ] **Step 5: Extend `filteredList` useMemo to include criteria filters**

Find the full `filteredList` useMemo (around line 266):
```js
  // Filter by search
  const filteredList = useMemo(() => {
    if (!search.trim()) return projectList;
    const q = search.toLowerCase();
    return projectList.filter((p) =>
      (p.title || "").toLowerCase().includes(q) ||
      membersToString(p.members).toLowerCase().includes(q) ||
      String(p.group_no || "").includes(q)
    );
  }, [projectList, search]);
```

Replace with:
```js
  // Filter by search + criteria filters
  const filteredList = useMemo(() => {
    const max = periodMaxScore || 100;
    return projectList.filter((p) => {
      // search
      if (search.trim()) {
        const q = search.toLowerCase();
        const passSearch =
          (p.title || "").toLowerCase().includes(q) ||
          membersToString(p.members).toLowerCase().includes(q) ||
          String(p.group_no || "").includes(q);
        if (!passSearch) return false;
      }
      // eval status
      if (filters.evalStatus === "evaluated" && !projectAvgMap.has(p.id)) return false;
      if (filters.evalStatus === "not_evaluated" && projectAvgMap.has(p.id)) return false;
      // advisor
      if (filters.advisor) {
        const advisors = (p.advisor || "").split(",").map((s) => s.trim());
        if (!advisors.includes(filters.advisor)) return false;
      }
      // score band — only applied to evaluated projects; unevaluated pass through
      if (filters.scoreBand !== "all" && projectAvgMap.has(p.id)) {
        const pct = (Number(projectAvgMap.get(p.id)) / max) * 100;
        if (filters.scoreBand === "high" && pct < 85) return false;
        if (filters.scoreBand === "mid" && (pct < 70 || pct >= 85)) return false;
        if (filters.scoreBand === "low" && pct >= 70) return false;
      }
      // team size
      if (filters.teamSize !== "all") {
        const count = membersToArray(p.members).length;
        if (filters.teamSize === "small" && count > 2) return false;
        if (filters.teamSize === "mid" && (count < 3 || count > 4)) return false;
        if (filters.teamSize === "large" && count < 5) return false;
      }
      return true;
    });
  }, [projectList, search, filters, projectAvgMap, periodMaxScore]);
```

- [ ] **Step 6: Update FilterButton to pass `activeCount`**

Find:
```jsx
        <FilterButton
          className="mobile-toolbar-filter"
          activeCount={0}
          isOpen={filterOpen}
          onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}
        />
```

Replace with:
```jsx
        <FilterButton
          className="mobile-toolbar-filter"
          activeCount={filterActiveCount}
          isOpen={filterOpen}
          onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); }}
        />
```

- [ ] **Step 7: Replace the empty filter panel body with the 4-criteria UI**

Find:
```jsx
      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel show">
          <div className="filter-panel-header">
            <div>
              <h4>
                <Filter size={14} style={{ verticalAlign: "-1px", marginRight: "4px", opacity: 0.5, display: "inline" }} />
                Filter Projects
              </h4>
              <div className="filter-panel-sub">Narrow projects by evaluation coverage and advisor, or change sort order.</div>
            </div>
            <button className="filter-panel-close" onClick={() => setFilterOpen(false)}>&#215;</button>
          </div>
        </div>
      )}
```

Replace with:
```jsx
      {/* Filter panel */}
      {filterOpen && (
        <div className="filter-panel show">
          <div className="filter-panel-header">
            <div>
              <h4>
                <Filter size={14} style={{ verticalAlign: "-1px", marginRight: "4px", opacity: 0.5, display: "inline" }} />
                Filter Projects
              </h4>
              <div className="filter-panel-sub">Narrow projects by evaluation coverage, advisor, score band, or team size.</div>
            </div>
            <button className="filter-panel-close" onClick={() => setFilterOpen(false)}>&#215;</button>
          </div>
          <div className="filter-panel-body" style={{ padding: "14px 16px 16px" }}>
            {/* Evaluation Status */}
            <div className="filter-row">
              <div className="filter-row-label">Evaluation Status</div>
              <div className="filter-toggle-group">
                {[
                  { value: "all", label: "All" },
                  { value: "evaluated", label: "Evaluated" },
                  { value: "not_evaluated", label: "Not Evaluated" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    className={`filter-toggle-btn${filters.evalStatus === value ? " filter-toggle-btn--active" : ""}`}
                    onClick={() => setFilters((f) => ({ ...f, evalStatus: value }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Advisor */}
            <div className="filter-row">
              <div className="filter-row-label">Advisor</div>
              <CustomSelect
                value={filters.advisor}
                onChange={(v) => setFilters((f) => ({ ...f, advisor: v }))}
                options={[
                  { value: "", label: "All Advisors" },
                  ...distinctAdvisors.map((a) => ({ value: a, label: a })),
                ]}
                placeholder="All Advisors"
              />
            </div>
            {/* Score Band */}
            <div className="filter-row">
              <div className="filter-row-label">Score Band</div>
              <div className="filter-toggle-group">
                {[
                  { value: "all", label: "All" },
                  { value: "high", label: "High ≥85%" },
                  { value: "mid", label: "Mid 70–84%" },
                  { value: "low", label: "Low <70%" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    className={`filter-toggle-btn${filters.scoreBand === value ? " filter-toggle-btn--active" : ""}`}
                    onClick={() => setFilters((f) => ({ ...f, scoreBand: value }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Team Size */}
            <div className="filter-row">
              <div className="filter-row-label">Team Size</div>
              <div className="filter-toggle-group">
                {[
                  { value: "all", label: "All" },
                  { value: "small", label: "1–2" },
                  { value: "mid", label: "3–4" },
                  { value: "large", label: "5+" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    className={`filter-toggle-btn${filters.teamSize === value ? " filter-toggle-btn--active" : ""}`}
                    onClick={() => setFilters((f) => ({ ...f, teamSize: value }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {filterActiveCount > 0 && (
              <button
                className="filter-clear-link"
                onClick={() => setFilters({ evalStatus: "all", advisor: "", scoreBand: "all", teamSize: "all" })}
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 8: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 9: Run native select check**

```bash
npm run check:no-native-select 2>&1 | tail -10
```

Expected: no violations in `ProjectsPage.jsx`.

- [ ] **Step 10: Commit**

```bash
git add src/admin/pages/ProjectsPage.jsx
git commit -m "feat(projects): activate 4-criteria filter panel (eval status, advisor, score band, team size)"
```

---

## Verification Checklist (manual, in browser)

Run `npm run dev` and navigate to Admin → Projects.

- [ ] View Scores icon shows `ClipboardList` (not bar chart)
- [ ] When period is **not** locked: View Scores has normal styling in kebab menu
- [ ] When period is **locked**: View Scores has accent-colored highlight in kebab menu; lock notice shows "View Scores" as active chip (accent) and "Duplicate" as locked chip
- [ ] KPI strip shows 3 cards: Projects / Team Members / Evaluated (X / Y)
- [ ] KPI values update when search or filters narrow the list
- [ ] Duplicate: click on unlocked period → project duplicated, "Copy of …" appears at bottom of list, toast shown
- [ ] Duplicate: locked period → button disabled
- [ ] Filter button badge shows count of active filters
- [ ] Evaluation Status filter: "Evaluated" hides unevaluated rows; "Not Evaluated" hides evaluated rows
- [ ] Advisor filter: selecting an advisor shows only their projects
- [ ] Score Band filter: "High ≥85%" shows only projects with avg ≥ 85% of max
- [ ] Team Size filter: "1–2" shows only projects with 1 or 2 members
- [ ] Multiple active filters combine (AND logic)
- [ ] "Clear all filters" link appears only when ≥1 filter active; resets all to default
- [ ] Filter panel closes with ✕ button
- [ ] No horizontal scroll on desktop
- [ ] Mobile portrait: cards render correctly with new 3-KPI strip

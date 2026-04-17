# Projects Page Enhancements — Design Spec

**Date:** 2026-04-17  
**File:** `src/admin/pages/ProjectsPage.jsx`  
**Status:** Approved

---

## Scope

Five targeted changes to ProjectsPage:

1. View Scores icon swap
2. View Scores visual highlight in locked state
3. KPI strip "Evaluated" counter
4. Duplicate Project action
5. Filter panel — 4 active criteria

No DB migration required. No new API functions. No new files except possible CSS additions to `src/styles/pages/projects.css`.

---

## 1 — View Scores Icon

**Change:** Replace `BarChart2` with `ClipboardList` in the `BarChart2` import and the kebab menu item.

**Rationale:** `BarChart2` reads as analytics/charts; `ClipboardList` reads as "view a record", which matches the drawer content.

---

## 2 — Locked State: View Scores Visual Highlight

**Problem:** When `isLocked`, Edit/Delete/Duplicate are dimmed (`opacity: 0.4`). View Scores stays at full opacity but has no positive visual signal — it blends in with disabled items.

**Solution:**

- Add CSS class `floating-menu-item--highlight` to the View Scores button when `isLocked`.
- Style: subtle accent background + slightly bolder label. Defined in `projects.css` (or `components.css` if reusable).
- Add an "unlocked" chip to the lock-notice chip row: `<span className="lock-notice-chip active"><ClipboardList size={11} /> View Scores</span>` — distinct from the grey locked chips.

**Implementation note:** The highlight class must not conflict with the base `floating-menu-item` hover state.

---

## 3 — KPI Strip: Evaluated Counter

**New derived value:**
```js
const evaluatedCount = projectList.filter(p => projectAvgMap.has(p.id)).length;
```

**KPI card:** Value = `"${evaluatedCount} / ${totalProjects}"`, Label = `"Evaluated"`.

**Filtered dataset rule:** When search or filters narrow the list, KPIs compute from `filteredList` (same `kpiBase` pattern used elsewhere):
```js
const kpiBase = filteredList.length !== projectList.length ? filteredList : projectList;
const kpiEvaluated = kpiBase.filter(p => projectAvgMap.has(p.id)).length;
```

---

## 4 — Duplicate Project

**Placement:** Kebab menu — between "Edit Project" and "View Scores".  
**Icon:** `Copy` (lucide-react).  
**Lock behavior:** Disabled when `isLocked` (duplicate = add project → blocked by lock).  
**Lock notice chip:** Add `"Duplicate Projects"` to the lock-notice-chips row.

**Duplication logic (silent — no drawer):**
```js
async function handleDuplicate(project) {
  setOpenMenuId(null);
  const maxNo = Math.max(0, ...projectList.map(p => Number(p.group_no) || 0));
  const result = await projects.handleAddProject({
    title: `Copy of ${project.title}`.slice(0, 100),
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

**No confirmation dialog** — duplicate is low-risk (can delete the copy).

---

## 5 — Filter Panel

### State
```js
const [filters, setFilters] = useState({
  evalStatus: "all",   // "all" | "evaluated" | "not_evaluated"
  advisor:    "",      // "" = all, else exact advisor name match
  scoreBand:  "all",   // "all" | "high" | "mid" | "low"
  teamSize:   "all",   // "all" | "small" | "mid" | "large"
});
```

**Active count** (feeds FilterButton badge):
```js
const filterActiveCount = [
  filters.evalStatus !== "all",
  filters.advisor !== "",
  filters.scoreBand !== "all",
  filters.teamSize !== "all",
].filter(Boolean).length;
```

### Filtering Pipeline

Current order: `projectList → search filter → sort → paginate`

New order: `projectList → search filter → **criteria filters** → sort → paginate`

Applied inside `filteredList` useMemo (extend existing), with filters added to the dependency array.

### Filter Logic

```js
.filter(p => {
  // evalStatus
  if (filters.evalStatus === "evaluated" && !projectAvgMap.has(p.id)) return false;
  if (filters.evalStatus === "not_evaluated" && projectAvgMap.has(p.id)) return false;

  // advisor (comma-split match)
  if (filters.advisor) {
    const advisors = (p.advisor || "").split(",").map(s => s.trim());
    if (!advisors.includes(filters.advisor)) return false;
  }

  // scoreBand (only applies to evaluated projects)
  if (filters.scoreBand !== "all" && projectAvgMap.has(p.id)) {
    const max = periodMaxScore || 100;
    const pct = (Number(projectAvgMap.get(p.id)) / max) * 100;
    if (filters.scoreBand === "high" && pct < 85) return false;
    if (filters.scoreBand === "mid" && (pct < 70 || pct >= 85)) return false;
    if (filters.scoreBand === "low" && pct >= 70) return false;
  }

  // teamSize
  if (filters.teamSize !== "all") {
    const count = membersToArray(p.members).length;
    if (filters.teamSize === "small" && count > 2) return false;
    if (filters.teamSize === "mid" && (count < 3 || count > 4)) return false;
    if (filters.teamSize === "large" && count < 5) return false;
  }

  return true;
})
```

**Score band + unevaluated:** When `scoreBand` is set, unevaluated projects (no score) pass through unless `evalStatus === "evaluated"`. This avoids silently hiding unevaluated projects from score band filters.

### Advisor Dropdown Values

```js
const distinctAdvisors = useMemo(() => {
  const set = new Set();
  for (const p of projectList) {
    (p.advisor || "").split(",").map(s => s.trim()).filter(Boolean).forEach(a => set.add(a));
  }
  return [...set].sort((a, b) => a.localeCompare(b, "tr"));
}, [projectList]);
```

Rendered via `CustomSelect` (`src/shared/ui/CustomSelect.jsx`) — never native `<select>`.

### Filter Panel UI

```
┌─────────────────────────────────────────────┐
│ Filter Projects                          [×] │
│ Narrow projects by evaluation coverage…      │
│                                              │
│ Evaluation Status                            │
│ [All] [Evaluated] [Not Evaluated]            │
│                                              │
│ Advisor                                      │
│ [CustomSelect: All Advisors ▾]               │
│                                              │
│ Score Band                                   │
│ [All] [High ≥85%] [Mid 70–84%] [Low <70%]   │
│                                              │
│ Team Size                                    │
│ [All] [1–2] [3–4] [5+]                      │
│                                              │
│                        [Clear all filters]   │
└─────────────────────────────────────────────┘
```

Toggle groups use `filter-toggle-group` / `filter-toggle-btn` CSS classes (add to `projects.css`). Active state: `filter-toggle-btn--active` — accent background, white text.

"Clear all filters" link only visible when `filterActiveCount > 0`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/admin/pages/ProjectsPage.jsx` | All 5 changes |
| `src/styles/pages/projects.css` | Filter toggle styles + floating-menu-item--highlight |

No new files. No DB migration. No API changes.

---

## Out of Scope

- Persisting filter state to localStorage (users don't expect filter memory on this page)
- Server-side filtering (client-side is sufficient for typical project counts <500)
- Advisor multi-select (single select sufficient; advisors are display-only)

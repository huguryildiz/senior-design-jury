# Register Page Premium Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken University/Department cascade with a searchable grouped combobox, add inline field validation, and add a progress indicator to the Register page.

**Architecture:** New reusable `GroupedCombobox` component in `src/shared/ui/`. RegisterScreen updated to parse `subtitle` field from organizations API into university/department groups. Inline validation via `touched` state tracking with onBlur. Progress dots derived from validation state.

**Tech Stack:** React, Lucide icons, vanilla CSS (auth.css)

**Spec:** `docs/superpowers/specs/2026-04-09-register-premium-redesign.md`

---

### Task 1: Create GroupedCombobox Component

**Files:**
- Create: `src/shared/ui/GroupedCombobox.jsx`

- [ ] **Step 1: Create the component file**

```jsx
// src/shared/ui/GroupedCombobox.jsx
// Searchable combobox with grouped options, keyboard navigation,
// and outside-click dismiss.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";

export default function GroupedCombobox({
  id,
  value,
  onChange,
  options = [],
  placeholder = "Search…",
  emptyMessage = "No results found.",
  disabled = false,
  ariaLabel,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Selected option lookup
  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value],
  );

  // Filter options by query (match on group + label)
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.group.toLowerCase().includes(q) ||
        (o.badge && o.badge.toLowerCase().includes(q)),
    );
  }, [options, query]);

  // Group filtered options: [ { group, items: [option, …] }, … ]
  const groups = useMemo(() => {
    const map = new Map();
    for (const opt of filtered) {
      const key = opt.group || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(opt);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, items]) => ({ group, items }));
  }, [filtered]);

  // Flat list of selectable items (for keyboard nav index)
  const flatItems = useMemo(
    () => groups.flatMap((g) => g.items),
    [groups],
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-cb-item]");
    items[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const handleSelect = useCallback(
    (opt) => {
      onChange(opt.value);
      setQuery("");
      setIsOpen(false);
      setHighlightIndex(-1);
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e) => {
      e.stopPropagation();
      onChange("");
      setQuery("");
      setHighlightIndex(-1);
    },
    [onChange],
  );

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setQuery("");
    setHighlightIndex(-1);
    // Focus the search input after render
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [disabled]);

  function handleKeyDown(e) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleOpen();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => (i < flatItems.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => (i > 0 ? i - 1 : flatItems.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && flatItems[highlightIndex]) {
          handleSelect(flatItems[highlightIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  }

  // Selected display (when closed with a value)
  if (selected && !isOpen) {
    return (
      <div ref={wrapRef} className="grouped-cb-wrap">
        <button
          id={id}
          type="button"
          className="grouped-cb-selected"
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
        >
          <span className="grouped-cb-selected-text">
            {selected.group && `${selected.group} · `}{selected.label}
          </span>
          <button
            type="button"
            className="grouped-cb-clear"
            onClick={handleClear}
            tabIndex={-1}
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        </button>
      </div>
    );
  }

  // Search/open state
  return (
    <div ref={wrapRef} className="grouped-cb-wrap">
      {isOpen ? (
        <>
          <div className="grouped-cb-input-wrap">
            <Search size={14} className="grouped-cb-search-icon" />
            <input
              ref={inputRef}
              id={id}
              type="text"
              className="grouped-cb-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              role="combobox"
              aria-expanded={isOpen}
              aria-label={ariaLabel}
            />
          </div>
          <div ref={listRef} className="grouped-cb-dropdown" role="listbox">
            {groups.length === 0 ? (
              <div className="grouped-cb-empty">{emptyMessage}</div>
            ) : (
              groups.map((g) => (
                <div key={g.group} className="grouped-cb-section">
                  {g.group && (
                    <div className="grouped-cb-group" aria-hidden="true">
                      {g.group}
                    </div>
                  )}
                  {g.items.map((opt) => {
                    const idx = flatItems.indexOf(opt);
                    return (
                      <div
                        key={opt.value}
                        data-cb-item
                        role="option"
                        aria-selected={String(opt.value) === String(value)}
                        className={`grouped-cb-item${idx === highlightIndex ? " grouped-cb-item--highlighted" : ""}`}
                        onClick={() => handleSelect(opt)}
                        onMouseEnter={() => setHighlightIndex(idx)}
                      >
                        <span className="grouped-cb-item-label">{opt.label}</span>
                        {opt.badge && (
                          <span className="grouped-cb-badge">{opt.badge}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <button
          id={id}
          type="button"
          className="grouped-cb-trigger"
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={false}
        >
          <Search size={14} className="grouped-cb-search-icon" />
          <span className="grouped-cb-placeholder">{placeholder}</span>
          <ChevronDown size={14} className="grouped-cb-chevron" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify file was created**

Run: `ls src/shared/ui/GroupedCombobox.jsx`
Expected: file listed

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/GroupedCombobox.jsx
git commit -m "feat: add GroupedCombobox component for searchable grouped dropdowns"
```

---

### Task 2: Add GroupedCombobox + Validation + Progress CSS

**Files:**
- Modify: `src/styles/auth.css` (append after line 596, before the empty line at 598)

- [ ] **Step 1: Add all new CSS styles to auth.css**

Append the following block after the existing register screen light mode overrides (after line 596 in `auth.css`):

```css
/* ═══════════════════════════════════════════════════
   GROUPED COMBOBOX
   ═══════════════════════════════════════════════════ */
.grouped-cb-wrap{position:relative}
.grouped-cb-trigger{
  width:100%;display:flex;align-items:center;gap:8px;
  padding:11px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;
  background:rgba(255,255,255,0.06);color:#e2e8f0;
  font-family:var(--font);font-size:14px;cursor:pointer;
  transition:border-color .15s,box-shadow .15s;
}
.grouped-cb-trigger:hover{border-color:rgba(255,255,255,0.18);background:rgba(255,255,255,0.09)}
.grouped-cb-trigger:disabled{opacity:0.5;cursor:not-allowed}
.grouped-cb-search-icon{color:#475569;flex-shrink:0}
.grouped-cb-placeholder{color:#475569;flex:1;text-align:left}
.grouped-cb-chevron{color:#475569;flex-shrink:0;margin-left:auto}

.grouped-cb-input-wrap{
  position:relative;display:flex;align-items:center;gap:8px;
  padding:11px 14px;border:1.5px solid rgba(59,130,246,0.5);border-radius:10px;
  background:rgba(255,255,255,0.09);
  box-shadow:0 0 0 3px rgba(59,130,246,0.1);
}
.grouped-cb-input{
  flex:1;border:none;outline:none;background:transparent;
  font-family:var(--font);font-size:14px;color:#e2e8f0;
}
.grouped-cb-input::placeholder{color:#475569}

.grouped-cb-dropdown{
  position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:50;
  background:rgba(15,23,42,0.97);backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,0.1);border-radius:10px;
  box-shadow:0 8px 30px rgba(0,0,0,0.35);
  max-height:220px;overflow-y:auto;overscroll-behavior:contain;
}
.grouped-cb-section+.grouped-cb-section{border-top:1px solid rgba(255,255,255,0.06)}
.grouped-cb-group{
  padding:8px 14px 4px;font-size:11px;font-weight:600;
  color:#64748b;text-transform:uppercase;letter-spacing:0.05em;
  position:sticky;top:0;background:rgba(15,23,42,0.97);
}
.grouped-cb-item{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 14px;cursor:pointer;transition:background .1s;
}
.grouped-cb-item:hover,.grouped-cb-item--highlighted{background:rgba(59,130,246,0.1)}
.grouped-cb-item-label{font-size:14px;color:#e2e8f0}
.grouped-cb-badge{font-size:11px;color:#64748b;font-weight:500;letter-spacing:0.02em}
.grouped-cb-empty{
  padding:20px 14px;text-align:center;font-size:13px;color:#64748b;line-height:1.5;
}

.grouped-cb-selected{
  width:100%;display:flex;align-items:center;gap:8px;
  padding:11px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;
  background:rgba(255,255,255,0.06);color:#e2e8f0;
  font-family:var(--font);font-size:14px;cursor:pointer;
  transition:border-color .15s;
}
.grouped-cb-selected:hover{border-color:rgba(255,255,255,0.18)}
.grouped-cb-selected:disabled{opacity:0.5;cursor:not-allowed}
.grouped-cb-selected-text{flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.grouped-cb-clear{
  flex-shrink:0;background:none;border:none;cursor:pointer;
  color:#64748b;padding:2px;display:grid;place-items:center;
  border-radius:4px;transition:color .15s,background .15s;
}
.grouped-cb-clear:hover{color:#e2e8f0;background:rgba(255,255,255,0.1)}

/* ── Grouped combobox light mode ── */
body:not(.dark-mode) .grouped-cb-trigger{
  background:#fff;border-color:#cdd5e0;color:#0f172a;
}
body:not(.dark-mode) .grouped-cb-trigger:hover{background:#f8fafc;border-color:#94a3b8}
body:not(.dark-mode) .grouped-cb-search-icon{color:#94a3b8}
body:not(.dark-mode) .grouped-cb-placeholder{color:#94a3b8}
body:not(.dark-mode) .grouped-cb-chevron{color:#94a3b8}
body:not(.dark-mode) .grouped-cb-input-wrap{
  background:#fff;border-color:rgba(59,130,246,0.5);
  box-shadow:0 0 0 3px rgba(59,130,246,0.08);
}
body:not(.dark-mode) .grouped-cb-input{color:#0f172a}
body:not(.dark-mode) .grouped-cb-input::placeholder{color:#94a3b8}
body:not(.dark-mode) .grouped-cb-dropdown{
  background:#fff;border-color:#e2e8f0;
  box-shadow:0 8px 30px rgba(15,23,42,0.12);
}
body:not(.dark-mode) .grouped-cb-group{color:#94a3b8;background:#fff}
body:not(.dark-mode) .grouped-cb-section+.grouped-cb-section{border-color:#f1f5f9}
body:not(.dark-mode) .grouped-cb-item:hover,
body:not(.dark-mode) .grouped-cb-item--highlighted{background:#eff6ff}
body:not(.dark-mode) .grouped-cb-item-label{color:#0f172a}
body:not(.dark-mode) .grouped-cb-badge{color:#94a3b8}
body:not(.dark-mode) .grouped-cb-empty{color:#64748b}
body:not(.dark-mode) .grouped-cb-selected{
  background:#fff;border-color:#cdd5e0;color:#0f172a;
}
body:not(.dark-mode) .grouped-cb-selected:hover{border-color:#94a3b8}
body:not(.dark-mode) .grouped-cb-clear{color:#94a3b8}
body:not(.dark-mode) .grouped-cb-clear:hover{color:#0f172a;background:#f1f5f9}

/* ═══════════════════════════════════════════════════
   REGISTER — INLINE VALIDATION
   ═══════════════════════════════════════════════════ */
.apply-label-row{display:flex;justify-content:space-between;align-items:center}
.apply-valid-check{color:#10b981;display:flex;align-items:center}
.apply-field--valid .apply-input,
.apply-field--valid .grouped-cb-selected,
.apply-field--valid .grouped-cb-trigger{
  border-color:#10b981 !important;background:rgba(16,185,129,0.06) !important;
}
.apply-field-error{font-size:11px;color:#ef4444;margin-top:5px;font-weight:500}

body:not(.dark-mode) .apply-valid-check{color:#16a34a}
body:not(.dark-mode) .apply-field--valid .apply-input,
body:not(.dark-mode) .apply-field--valid .grouped-cb-selected,
body:not(.dark-mode) .apply-field--valid .grouped-cb-trigger{
  border-color:#10b981 !important;background:#f0fdf4 !important;
}
body:not(.dark-mode) .apply-field-error{color:#dc2626}

/* ═══════════════════════════════════════════════════
   REGISTER — PROGRESS INDICATOR
   ═══════════════════════════════════════════════════ */
.apply-progress{display:flex;justify-content:center;gap:6px;margin-bottom:16px}
.apply-progress-bar{
  width:24px;height:3px;border-radius:2px;
  background:rgba(255,255,255,0.08);
  transition:background .3s ease;
}
.apply-progress-bar--filled{background:#3b82f6}

body:not(.dark-mode) .apply-progress-bar{background:#e2e8f0}
body:not(.dark-mode) .apply-progress-bar--filled{background:#3b82f6}
```

- [ ] **Step 2: Verify build still works**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add src/styles/auth.css
git commit -m "style: add GroupedCombobox, inline validation, and progress bar CSS"
```

---

### Task 3: Update RegisterScreen

**Files:**
- Modify: `src/auth/screens/RegisterScreen.jsx`

This is the main integration task. The changes are:

1. Replace `CustomSelect` import with `GroupedCombobox`
2. Replace `getUniversityLabel`, `university` state, `universityOptions`, `departmentOptions`, and the university/department reset effect with a single `parseSubtitle` helper and `orgOptions` memo
3. Add `touched` state and `markTouched` helper for inline validation
4. Add `validations` derived object
5. Add progress indicator JSX
6. Replace the two `CustomSelect` instances with one `GroupedCombobox`
7. Add onBlur handlers and validation indicators to each field
8. Update `handleSubmit` to use parsed org data from the selected option

- [ ] **Step 1: Replace imports — swap CustomSelect for GroupedCombobox**

In `src/auth/screens/RegisterScreen.jsx`, replace:

```jsx
import CustomSelect from "@/shared/ui/CustomSelect";
```

with:

```jsx
import GroupedCombobox from "@/shared/ui/GroupedCombobox";
```

- [ ] **Step 2: Add `parseSubtitle` helper and add `Check` to existing imports**

The `Check` icon is already imported (line 7). Add `parseSubtitle` right after the existing `getUniversityLabel` function. Then remove `getUniversityLabel` since it's no longer used.

Replace:

```jsx
function getUniversityLabel(tenant) {
  return String(tenant?.university || tenant?.name || "Organization").trim();
}
```

with:

```jsx
function parseSubtitle(subtitle, name) {
  if (subtitle && subtitle.includes(" · ")) {
    const idx = subtitle.indexOf(" · ");
    return { university: subtitle.slice(0, idx), department: subtitle.slice(idx + 3) };
  }
  return { university: String(name || ""), department: "" };
}
```

- [ ] **Step 3: Replace university/department state with simpler state**

Remove these state declarations:

```jsx
  const [university, setUniversity] = useState("");
```

Keep `tenantId` state as-is (it's still used).

- [ ] **Step 4: Replace `universityOptions` and `departmentOptions` memos with `orgOptions`**

Remove these blocks:

```jsx
  const universityOptions = useMemo(
    () => [...new Set(tenants.map(getUniversityLabel).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [tenants]
  );

  const departmentOptions = useMemo(() => {
    if (!university) return [];
    return tenants
      .filter((t) => getUniversityLabel(t) === university)
      .sort((a, b) => String(a?.department || "").localeCompare(String(b?.department || "")));
  }, [university, tenants]);
```

And the university reset effect:

```jsx
  useEffect(() => {
    if (!university) { setTenantId(""); return; }
    if (!departmentOptions.some((d) => d.id === tenantId)) setTenantId("");
  }, [university, departmentOptions, tenantId]);
```

Replace all three with:

```jsx
  const orgOptions = useMemo(
    () =>
      tenants.map((t) => {
        const { university, department } = parseSubtitle(t.subtitle, t.name);
        return {
          value: t.id,
          label: department || t.name,
          group: university,
          badge: t.code || "",
        };
      }),
    [tenants],
  );
```

- [ ] **Step 5: Add touched state and validation logic**

Add after the `orgOptions` memo:

```jsx
  const [touched, setTouched] = useState({});
  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const validations = {
    name: fullName.trim().length > 0,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    org: !!tenantId,
    password: isValidPassword(password),
    confirm: password === confirmPassword && confirmPassword.length > 0,
  };

  const fieldKeys = isGoogleApplicationFlow
    ? ["name", "email", "org"]
    : ["name", "email", "org", "password", "confirm"];
```

- [ ] **Step 6: Update `handleSubmit` to derive university/department from selected org**

Replace the lines inside `handleSubmit` that reference `university` and department lookup:

```jsx
      const selectedTenant = tenants.find((t) => t.id === tenantId);
      const deptLabel = String(selectedTenant?.department || selectedTenant?.name || "").trim();
      if (isGoogleApplicationFlow) {
        if (typeof doCompleteProfile !== "function") {
          throw new Error("Profile completion is not configured.");
        }
        await doCompleteProfile({
          name: fullName.trim(),
          university: university.trim(),
          department: deptLabel,
          tenantId,
        });
      } else {
        await doRegister(email.trim(), generateTemporaryPassword(), {
          name: fullName.trim(),
          university: university.trim(),
          department: deptLabel,
          tenantId,
        });
      }
      setSubmittedEmail(email.trim());
      setSubmittedDept(`${university} — ${deptLabel}`);
```

with:

```jsx
      const selectedTenant = tenants.find((t) => t.id === tenantId);
      const { university: uniLabel, department: deptLabel } = parseSubtitle(
        selectedTenant?.subtitle,
        selectedTenant?.name,
      );
      const payload = {
        name: fullName.trim(),
        university: uniLabel,
        department: deptLabel || uniLabel,
        tenantId,
      };
      if (isGoogleApplicationFlow) {
        if (typeof doCompleteProfile !== "function") {
          throw new Error("Profile completion is not configured.");
        }
        await doCompleteProfile(payload);
      } else {
        await doRegister(email.trim(), generateTemporaryPassword(), payload);
      }
      setSubmittedEmail(email.trim());
      setSubmittedDept(deptLabel ? `${uniLabel} — ${deptLabel}` : uniLabel);
```

- [ ] **Step 7: Update validation in handleSubmit — remove university check, keep tenantId check**

Replace:

```jsx
    if (!university) { setError("Please select a university or organization."); return; }
    if (!tenantId) { setError("Please select a department."); return; }
```

with:

```jsx
    if (!tenantId) { setError("Please select an organization."); return; }
```

- [ ] **Step 8: Add progress indicator JSX after the Google badge block**

After the closing `)}` of the Google badge conditional (line ~304 area), and before the `{displayError && (` block, add:

```jsx
          {/* Progress indicator */}
          <div className="apply-progress">
            {fieldKeys.map((key) => (
              <div
                key={key}
                className={`apply-progress-bar${validations[key] ? " apply-progress-bar--filled" : ""}`}
              />
            ))}
          </div>
```

- [ ] **Step 9: Update Full Name field with validation indicators**

Replace the Full Name field block:

```jsx
            <div className="apply-field">
              <label className="apply-label" htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                className="apply-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Jane Doe"
                disabled={loading}
              />
            </div>
```

with:

```jsx
            <div className={`apply-field${touched.name && validations.name ? " apply-field--valid" : ""}`}>
              <div className="apply-label-row">
                <label className="apply-label" htmlFor="reg-name" style={{ marginBottom: 0 }}>Full Name</label>
                {touched.name && validations.name && (
                  <span className="apply-valid-check"><Check size={12} strokeWidth={2.5} /></span>
                )}
              </div>
              <input
                id="reg-name"
                className="apply-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => markTouched("name")}
                placeholder="Dr. Jane Doe"
                disabled={loading}
              />
              {touched.name && !validations.name && (
                <div className="apply-field-error">Full name is required.</div>
              )}
            </div>
```

- [ ] **Step 10: Update Email field with validation indicators**

Replace the Email field block:

```jsx
            <div className="apply-field">
              <label className="apply-label" htmlFor="reg-email">Institutional Email</label>
              <input
                id="reg-email"
                className="apply-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.doe@university.edu"
                autoComplete="email"
                disabled={loading || isGoogleApplicationFlow}
              />
            </div>
```

with:

```jsx
            <div className={`apply-field${touched.email && validations.email ? " apply-field--valid" : ""}`}>
              <div className="apply-label-row">
                <label className="apply-label" htmlFor="reg-email" style={{ marginBottom: 0 }}>Institutional Email</label>
                {touched.email && validations.email && (
                  <span className="apply-valid-check"><Check size={12} strokeWidth={2.5} /></span>
                )}
              </div>
              <input
                id="reg-email"
                className="apply-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched("email")}
                placeholder="jane.doe@university.edu"
                autoComplete="email"
                disabled={loading || isGoogleApplicationFlow}
              />
              {touched.email && !validations.email && (
                <div className="apply-field-error">Valid email is required.</div>
              )}
            </div>
```

- [ ] **Step 11: Replace both CustomSelect instances with single GroupedCombobox**

Remove both the University and Department field blocks:

```jsx
            <div className="apply-field">
              <label className="apply-label" htmlFor="reg-university">University</label>
              <CustomSelect
                id="reg-university"
                value={university}
                onChange={(v) => setUniversity(v)}
                disabled={loading || tenantsLoading}
                options={[
                  { value: "", label: tenantsLoading ? "Loading…" : "Select university…" },
                  ...universityOptions.map((opt) => ({ value: opt, label: opt })),
                ]}
                ariaLabel="University"
              />
            </div>

            <div className="apply-field">
              <label className="apply-label" htmlFor="reg-dept">Department</label>
              <CustomSelect
                id="reg-dept"
                value={tenantId}
                onChange={(v) => setTenantId(v)}
                disabled={loading || !university}
                options={[
                  { value: "", label: university ? "Select department…" : "Choose university first" },
                  ...departmentOptions.map((opt) => ({ value: opt.id, label: opt.department || opt.name })),
                ]}
                ariaLabel="Department"
              />
            </div>
```

Replace with:

```jsx
            <div className={`apply-field${touched.org && validations.org ? " apply-field--valid" : ""}`}>
              <div className="apply-label-row">
                <label className="apply-label" htmlFor="reg-org" style={{ marginBottom: 0 }}>Organization</label>
                {touched.org && validations.org && (
                  <span className="apply-valid-check"><Check size={12} strokeWidth={2.5} /></span>
                )}
              </div>
              <GroupedCombobox
                id="reg-org"
                value={tenantId}
                onChange={(v) => { setTenantId(v); markTouched("org"); }}
                options={orgOptions}
                placeholder={tenantsLoading ? "Loading…" : "Search university or department…"}
                emptyMessage="No matching organizations found. Contact your department admin to set up VERA."
                disabled={loading || tenantsLoading}
                ariaLabel="Organization"
              />
              {touched.org && !validations.org && (
                <div className="apply-field-error">Please select an organization.</div>
              )}
            </div>
```

- [ ] **Step 12: Add validation indicators to Password field**

Replace the Password field's opening `<div className="apply-field">`:

```jsx
                <div className="apply-field">
                  <label className="apply-label" htmlFor="reg-password">Password</label>
```

with:

```jsx
                <div className={`apply-field${touched.password && validations.password ? " apply-field--valid" : ""}`}>
                  <div className="apply-label-row">
                    <label className="apply-label" htmlFor="reg-password" style={{ marginBottom: 0 }}>Password</label>
                    {touched.password && validations.password && (
                      <span className="apply-valid-check"><Check size={12} strokeWidth={2.5} /></span>
                    )}
                  </div>
```

And add `onBlur` to the password input:

Find:
```jsx
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={passwordPlaceholder}
```

Add `onBlur` after `onChange`:
```jsx
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => markTouched("password")}
                      placeholder={passwordPlaceholder}
```

- [ ] **Step 13: Add validation class and onBlur to Confirm Password field**

Replace:
```jsx
                <div className="apply-field" style={{ marginBottom: "24px" }}>
                  <label className="apply-label" htmlFor="reg-confirm">Confirm Password</label>
```

with:

```jsx
                <div className={`apply-field${touched.confirm && validations.confirm ? " apply-field--valid" : ""}`} style={{ marginBottom: "24px" }}>
                  <div className="apply-label-row">
                    <label className="apply-label" htmlFor="reg-confirm" style={{ marginBottom: 0 }}>Confirm Password</label>
                    {touched.confirm && validations.confirm && (
                      <span className="apply-valid-check"><Check size={12} strokeWidth={2.5} /></span>
                    )}
                  </div>
```

And add `onBlur` to the confirm password input. Find:

```jsx
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
```

Add `onBlur`:

```jsx
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => markTouched("confirm")}
                      placeholder="Re-enter password"
```

- [ ] **Step 14: Verify the app builds and renders**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 15: Commit**

```bash
git add src/auth/screens/RegisterScreen.jsx
git commit -m "feat: premium register page — grouped combobox, inline validation, progress indicator"
```

---

### Task 4: Manual Verification

- [ ] **Step 1: Start dev server and test**

Run: `npm run dev`

Manual checks:
1. Navigate to the register page
2. Verify the GroupedCombobox renders with "Search university or department…" placeholder
3. Click the combobox — verify grouped dropdown opens with university headers and department items
4. Type a search query — verify filtering works across university and department names
5. Select an org — verify it displays as "University · Department" with a clear (×) button
6. Click clear — verify it resets
7. Fill out name and email, blur away — verify green checkmarks appear
8. Leave name empty and blur — verify "Full name is required." error appears
9. Verify progress bars fill as fields are completed
10. Submit the form — verify it works end-to-end
11. Test keyboard navigation: Arrow keys, Enter to select, Escape to close

- [ ] **Step 2: Test Google OAuth flow**

If available, test with a Google-authenticated user:
1. Verify email field is disabled and pre-filled
2. Verify password fields are hidden
3. Verify progress indicator only shows 3 bars (name, email, org)
4. Verify submission sends correct payload

- [ ] **Step 3: Test light mode**

Toggle to light mode and verify:
1. Combobox trigger has white background, gray border
2. Dropdown has white background with proper shadows
3. Validation green borders are visible
4. Progress bars have gray/blue contrast

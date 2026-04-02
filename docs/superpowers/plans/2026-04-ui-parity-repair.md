

# VERA UI Parity Repair Plan (Mockup → React)

## Context

We previously implemented:

- `docs/superpowers/plans/2026-04-opus-ui-rewrite-prompt.md`

All phases (A → E) were completed inside:

- `.worktrees/ui-rewrite`

However, the current UI has **significant visual and structural drift** from the mockup:

- `docs/concepts/vera-premium-prototype.html`

This indicates:
- worktree divergence
- incomplete porting
- unintended redesign decisions
- or incorrect JSX transformations

---

## 🎯 Goal

Restore **full visual and structural parity** between:

- Mockup (source of truth)
- React implementation (target)

This is NOT a redesign.

This is a:

👉 **high-fidelity replication task**

---

## 🧠 Core Principle

> Mockup is the single source of truth.

The implementation must conform to the mockup — not the other way around.

---

## 🚨 Hard Rules

### 1. No Interpretation

Do NOT:
- rename sections
- simplify content
- replace components
- restructure layout
- introduce “better UI”

Example:
- ❌ "Heatmap" → "Evaluation Grid"
- ❌ Removing Reviews section
- ❌ Changing text labels

---

### 2. Visual Parity > Code Quality

Priority:

1. Visual parity  
2. Layout parity  
3. Text parity  
4. Behavior  
5. Refactoring (LAST)

---

### 3. CSS Must Be Ported Exactly

Pay attention to:

- background gradients  
- glow layers  
- glassmorphism  
- shadows  
- border opacity  
- typography scale  
- spacing  
- card radius  
- grid proportions  

👉 Approximation is NOT acceptable.

---

### 4. No Missing Blocks

Even without data:

- DO NOT remove sections  
- DO NOT leave empty UI  
- KEEP containers and placeholders  

---

### 5. No Premature Refactoring

- Do NOT create shared components early  
- Do NOT normalize structure  
- Do NOT reorganize DOM  

---

## 🔍 Known Issues (Initial Findings)

### F-001 — Admin Background Theme Mismatch
- Mockup: deep navy gradient + glow  
- Current: flatter/different tone  
- Impact: high  

### F-002 — Analytics Page Empty
- Missing content blocks  
- Charts not rendered  
- Impact: critical  

### F-003 — Heatmap Section Incorrect
- Mockup: "Heatmap — Compare juror scoring patterns..."  
- Code: "Evaluation Grid"  
- Impact: high  

### F-004 — Reviews Section Diverged
- Structure and content mismatch  
- Impact: high  

### F-005 — Card Layout & Spacing Drift
- Grid proportions off  
- Padding/gaps inconsistent  
- Impact: medium-high  

---

## 🧩 Execution Plan

### Phase 1 — Audit (NO CODE)

Compare:

- `docs/concepts/vera-premium-prototype.html`  
- `.worktrees/ui-rewrite`  

Produce full mismatch analysis.

---

### Phase 2 — Structural Corrections

Fix:

- Missing sections  
- Wrong section naming  
- Analytics content absence  
- Reviews mismatch  

---

### Phase 3 — Visual Parity

Fix:

- background gradients  
- shadows/glow  
- spacing  
- card proportions  
- typography  

---

### Phase 4 — Final Pass

Ensure:

- layout identical  
- no missing blocks  
- no semantic drift  

---

## 📄 Audit Documentation (MANDATORY)

All work must be tracked in:

👉 `docs/audits/ui-mockup-parity-audit.md`

---

## 📘 Required Audit File Structure

```
# UI Mockup Parity Audit

## Scope
- Screens analyzed  
- Mockup source  
- JSX files examined  

---

## Findings

### F-001 — Admin background mismatch
- Screen: Overview  
- Severity: High  
- Mockup: gradient + glow  
- Code: flat background  
- Impact: visual mismatch  

---

## Changes Made

### Iteration 1
- Fixed background gradient  
- Restored card glow  
- Reintroduced missing containers  

---

## Remaining Mismatches

- Analytics still incomplete  
- Heatmap naming issue  
- Reviews layout mismatch  

---

## Decision Log

- Used direct CSS values from mockup  
- Avoided abstraction  
- Preserved layout wrappers  

---

## Definition of Done Checklist

- [ ] Background parity  
- [ ] Section name parity  
- [ ] Layout parity  
- [ ] Analytics parity  
- [ ] Reviews parity  
- [ ] No missing blocks  
```

---

## 🧪 Validation Checklist

Before completion:

- [ ] Background visually identical  
- [ ] Cards match mockup proportions  
- [ ] Section titles EXACTLY match  
- [ ] No missing UI blocks  
- [ ] Analytics not empty  
- [ ] Heatmap correct  
- [ ] Reviews correct  
- [ ] Same “visual density” as mockup  

---

## ⚠️ Anti-Patterns (DO NOT DO)

- Redesign UI  
- Simplify layout  
- Rename sections  
- Replace components  
- Drop sections  
- Change UX flow  
- “Improve readability”  
- Normalize spacing arbitrarily  

---

## 🧠 Working Strategy

Work page-by-page:

1. Overview  
2. Analytics  
3. Reviews  
4. Remaining screens  

Each iteration:

- Audit → Fix → Validate → Update audit MD  

---

## 🏁 Definition of Done

The task is complete ONLY if:

- UI looks indistinguishable from mockup  
- No section is missing or renamed  
- No layout drift exists  
- No empty screen exists  
- No component substitution exists  

👉 “Similar” = FAIL  
👉 “Identical” = SUCCESS  

---

## Final Note

This is not UI design work.

This is:

👉 **precision UI replication engineering**
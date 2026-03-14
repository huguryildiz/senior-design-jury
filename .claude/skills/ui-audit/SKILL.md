# Skill: ui-audit

## When to Use

Use to audit a screen or component for UX quality, accessibility, and visual consistency. Invoke with `/ui-audit` or by asking Claude to audit a UI component.

## How Claude Should Analyze

1. **Read the component file** and its associated CSS file.
2. **Check accessibility:**
   - All interactive elements have accessible labels (`aria-label` or visible text)
   - Form inputs have associated `<label>` elements
   - Error states use `role="alert"`
   - Keyboard navigation works for all controls
   - Color is not the sole conveyor of information
3. **Check UX:**
   - Are loading and error states handled visually?
   - Is there an empty state when data is absent?
   - Are destructive actions confirmed before execution?
   - Is there feedback after async operations?
4. **Check mobile usability** (jury flow must be mobile-friendly; admin is desktop-only)
5. **Check visual consistency** with existing patterns in `src/styles/`

## Scope of This Tool

This is an internal academic tool used for 2–3 days per year. Audit findings should be proportional to impact. Do not flag theoretical issues that would never affect a real user in this context.

## Expected Output Format

```
## UI Audit — [component name]

### Accessibility
- [issue or "no issues found"]

### UX
- [issue or "no issues found"]

### Mobile
- [issue or "N/A — admin-only component"]

### Priority fixes
- [P1] [issue]
- [P2] [issue]
```

P1 = affects real users during evaluation. P2 = quality improvement.

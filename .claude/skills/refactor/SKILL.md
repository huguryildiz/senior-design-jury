# Skill: refactor

## When to Use

Use when asked to improve a file's internal structure without changing its behavior. Typical targets: large components, duplicated CRUD patterns across settings panels, repeated error state logic.

## How Claude Should Analyze

1. **Read the target file fully** before proposing any changes.
2. **Identify duplication:** Look for repeated patterns that could be extracted into a shared hook or component.
3. **Check import paths:** After extracting a helper, update all import paths correctly.
4. **Do not change behavior:** Refactors must be transparent to users and tests.
5. **Do not introduce new dependencies.**
6. **Verify tests still pass** after refactoring — run `npm test -- --run`.

## Safety Rules

- Do NOT refactor `src/shared/api.js` field mapping without full test coverage.
- Do NOT move files between `src/admin/`, `src/jury/`, `src/charts/` without updating all imports.
- Do NOT change exported function signatures — this breaks callers.
- The `src/Charts.jsx` shim must remain unless all consumers are updated.

## Expected Output Format

```
## Refactor Plan — [filename]

### What I'll change
- [change description]

### What I'll NOT change
- [scope boundary]

### Files affected
- [file list]

### Imports updated
- [import changes]
```

Then apply the changes. Run tests before declaring done.

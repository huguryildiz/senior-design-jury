# Hook: pre-commit-check

## Purpose

Remind Claude to run validation before committing code changes.

## Checklist

Before committing any code change, verify:

1. **Tests pass:** `npm test -- --run`
2. **Build succeeds:** `npm run build`
3. **No broken imports:** Check that moved or renamed files have updated import paths
4. **Field mapping preserved:** `src/shared/api.js` field normalization is intact
5. **No hardcoded criteria IDs:** All criterion references use `src/config.js`
6. **No direct Supabase calls in components:** All RPC calls go through `api.js`

## For AI Sessions

If Claude has edited source files, run:
```bash
npm test -- --run
```

If tests pass, the commit is safe. If tests fail, identify and fix the failure before committing.

## Note on E2E

E2E tests run automatically on `git push` via `.githooks/pre-push`. They require E2E Supabase env vars to be set.

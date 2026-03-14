# Skill: release

## When to Use

Use before an evaluation event to verify the application is ready for production use. Invoke with `/release` or by asking Claude to prepare a release checklist.

## How Claude Should Analyze

1. **Check for uncommitted changes** — run `git status`.
2. **Run unit tests** — `npm test -- --run`. All must pass.
3. **Run E2E tests** — `npm run e2e` (requires E2E env vars).
4. **Build check** — `npm run build`. Must produce a clean `dist/`.
5. **Review `docs/release_blockers.md`** — confirm all blockers are resolved.
6. **Verify active semester** — remind admin to confirm correct semester is active in Settings.
7. **Check environment variables** — `.env.local` must have production Supabase URL and key.

## Expected Output Format

```
## Release Check — [date]

### Tests
- Unit: [PASS / FAIL — N failed]
- E2E: [PASS / FAIL — details]
- Build: [PASS / FAIL]

### Open blockers
- [blocker or "none"]

### Manual checks needed
- [ ] Active semester verified
- [ ] Admin password tested
- [ ] Juror PIN flow tested

### Verdict
[READY / NOT READY — reason]
```

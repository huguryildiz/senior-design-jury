# Skill: code-review

## When to Use

Use this skill when reviewing a pull request, a changed file, or a specific component before merging. Invoke with `/code-review` or by asking Claude to review a file.

## How Claude Should Analyze

1. **Read the file first.** Understand existing logic before commenting.
2. **Check for correctness:** Does the code do what the component description says?
3. **Check field name mapping:** Any RPC data must use config.js IDs in the UI. Mapping lives only in `src/shared/api.js`.
4. **Check for hardcoded values:** Criteria IDs, max scores, and MÜDEK codes must come from `src/config.js`.
5. **Check for direct Supabase calls:** Components must not call `supabase.rpc()` directly — route through `api.js`.
6. **Check for new CSS:** New styles must go in `src/styles/`, not inline in JSX.
7. **Check test coverage:** If a pure function or hook was changed, is there a corresponding test?
8. **Check for unnecessary complexity:** This is a small internal tool — reject over-engineering.

## Expected Output Format

```
## Code Review — [filename]

### What looks good
- [bullet]

### Concerns
- [concern] → [suggested fix]

### Must-fix before merge
- [issue]
```

Keep feedback concise. No praise for obvious things. Flag real risks only.

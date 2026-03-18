# VERA — Documentation Index

This directory contains all project documentation. Some subdirectories are gitignored (local-only).

---

## Directory Structure

| Folder | Purpose | Gitignored? |
| --- | --- | --- |
| `architecture/` | System design, database schema, data flow | No |
| `deployment/` | Setup and deployment guides | No |
| `qa/` | Test guides, test session records | No |
| `audit/` | Dated production audit reports | Yes |
| `reports/` | Tech debt register, release blockers, analysis | Yes |
| `refactor/` | Phase-by-phase refactor documentation | No |
| `prompts/` | AI prompt templates (session tools) | Yes |
| `misc/` | Raw sample files (CSVs, mockups) | Yes |

Gitignored folders are not committed to the repository. They exist locally for reference only.

---

## Architecture

| File | Contents |
| --- | --- |
| [architecture/system-overview.md](architecture/system-overview.md) | Routing, jury flow, admin panel structure, Supabase RPC integration, chart system, source layout |
| [architecture/database-schema.md](architecture/database-schema.md) | All tables, columns, constraints, RPC functions, field name mapping |
| [MUDEK_Rubric.md](MUDEK_Rubric.md) | Evaluation rubric and MÜDEK outcome alignment for EE 491/492 |

---

## Deployment

| File | Contents |
| --- | --- |
| [deployment/environment-variables.md](deployment/environment-variables.md) | All env vars — app, E2E, CI, backup |
| [deployment/supabase-setup.md](deployment/supabase-setup.md) | Set up a new Supabase project from scratch |
| [deployment/vercel-deployment.md](deployment/vercel-deployment.md) | Deploy the frontend to Vercel |
| [deployment/git-commit-push.md](deployment/git-commit-push.md) | Git workflow, conventional commit format, push guide |

---

## QA & Testing

| File | Contents |
| --- | --- |
| [qa/vitest-guide.md](qa/vitest-guide.md) | Vitest unit test guide — all 37 files, 306 tests, qaTest pattern, Allure reporting |
| [qa/e2e-guide.md](qa/e2e-guide.md) | Playwright E2E guide — commands, env vars, skip logic, HTML/Excel reports |
| [qa/smoke_test-guide.md](qa/smoke_test-guide.md) | Pre-jury-day smoke test checklist and automation guide |
| [qa/qa_workbook_tests.md](qa/qa_workbook_tests.md) | Test expansion record (Sprint 1–3, gap-closing, E2E) |
| [qa/session-summary-2026-03-15.md](qa/session-summary-2026-03-15.md) | Session record — 2026-03-15 testing sprint |

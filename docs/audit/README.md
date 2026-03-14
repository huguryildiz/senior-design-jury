# Audit Reports

This directory contains sanitized audit report summaries for the TEDU Capstone Portal.

Raw audit files (with inline developer annotations) are in `misc-docs/` (gitignored).

---

## 2026-03-14 Audit

**Scope:** Full frontend audit — admin panel, jury flow, charts, architecture

**Auditor perspective:** Senior Product Engineer / Frontend Auditor

**Key findings:**

| Area | Finding | Resolution |
|---|---|---|
| Settings panels | No unsaved change guard → data loss risk | Planned: Phase 1.1 |
| Settings panels | All 4 panels can be open simultaneously | Planned: Phase 1.3 |
| Semester delete | Confirm dialog doesn't mention cascaded data loss | Planned: Phase 1.2 |
| Overview tab | No manual refresh or last-updated timestamp | Planned: Phase 2.1 |
| Analytics tab | No lazy loading — always fetches even when unused | Planned: Phase 2.2 |
| Settings accordion | No keyboard navigation | Planned: Phase 2.3 |
| Charts | Were in a single 91KB file | **Resolved:** Charts split into `src/charts/` |
| Architecture | State-based routing | Intentional — see `docs/tech_debt_register.md` TD-01 |
| Architecture | Stateless admin password RPC model | Intentional — TD-02 |
| Architecture | 4-digit juror PIN | Intentional — TD-03 |
| Architecture | No RPC caching | Intentional — TD-04 |
| Architecture | Admin prop drilling | Intentional — TD-05 |

**Implemented from this audit:** See `docs/implementation_plan.md` for the full roadmap.

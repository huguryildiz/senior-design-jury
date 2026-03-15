You are working on the TEDU Capstone Portal repository.

Your task is to reorganize the project to follow a Claude-optimized repository structure for AI-assisted development.

IMPORTANT CONTEXT

This project is a small-scale internal academic web application used for poster-day evaluations at TED University.

Tech stack:
- React 18 + Vite frontend
- Supabase database with RPC functions
- No traditional backend server
- Admin dashboard + Jury evaluation flow

This application is used only a few days per year for academic evaluations.  
Do NOT introduce enterprise-scale complexity or unnecessary frameworks.

The goal of this restructuring is:

• make the repository easier for Claude and other AI tools to understand  
• improve documentation and maintainability  
• modularize large files (especially charts)  
• introduce AI workflow helpers (skills, prompts)  
• keep the codebase simple and stable

Do NOT break existing imports or runtime behavior.

---

STEP 1 — Analyze the current repository

First inspect the existing repository structure and identify:

- admin dashboard modules
- jury evaluation flow modules
- shared utilities
- charts / analytics code
- documentation files
- scripts or tools
- configuration files

Then briefly explain the current structure before proposing changes.

---

STEP 2 — Migrate to a Claude-optimized structure

Reorganize the repository to approximately follow this structure:

project-root

├── CLAUDE.md  
├── README.md  

├── docs/  
│   ├── architecture.md  
│   ├── implementation_plan.md  
│   ├── release_blockers.md  
│   ├── tech_debt_register.md  
│   ├── test_plan.md  
│   └── audit/  

├── .claude/  
│   ├── settings.json  
│   │  
│   ├── skills/  
│   │   ├── code-review/  
│   │   │   └── SKILL.md  
│   │   │  
│   │   ├── refactor/  
│   │   │   └── SKILL.md  
│   │   │  
│   │   ├── release/  
│   │   │   └── SKILL.md  
│   │   │  
│   │   └── ui-audit/  
│   │       └── SKILL.md  
│   │  
│   └── hooks/  
│       ├── pre-commit-check.md  
│       └── qa-checklist.md  

├── tools/  
│   ├── prompts/  
│   │   ├── audit_prompt.md  
│   │   ├── refactor_prompt.md  
│   │   ├── regression_check_prompt.md  
│   │   └── ui_review_prompt.md  
│   │  
│   └── scripts/  

├── src/  
│   ├── admin/  
│   ├── jury/  
│   ├── charts/  
│   ├── hooks/  
│   ├── shared/  
│   └── styles/  

Do NOT blindly move files.  
Preserve working imports and relative paths.

If moving files requires updating imports, update them safely.

---

STEP 3 — Split the Charts monolith

The project currently contains a large Charts.jsx file.

Refactor this into modular chart components inside:

src/charts/

Example:

src/charts/
OutcomeTrendChart.jsx  
CompetencyRadarChart.jsx  
JurorConsistencyHeatmap.jsx  
ScoreDistributionBoxPlot.jsx  
CriterionComparisonChart.jsx  
EvaluationTimelineChart.jsx  
ChartUtils.js  

Update all imports accordingly.

Ensure no functionality is lost.

---

STEP 4 — Improve documentation

Create or update the following documentation:

docs/architecture.md

Explain:

• admin panel architecture  
• jury evaluation flow  
• Supabase RPC integration  
• state-based routing design decision  
• chart analytics system  

---

docs/implementation_plan.md

Convert the existing audit findings into a practical development roadmap:

Phase 1 — critical fixes  
Phase 2 — UX / accessibility / performance improvements  
Phase 3 — refactors and polish  

Include file references when possible.

---

docs/release_blockers.md

List only real production blockers.

Do NOT include theoretical issues.  
Respect the project scope (internal academic tool).

---

docs/tech_debt_register.md

Document intentional technical tradeoffs such as:

• state-based routing instead of React Router  
• 4-digit juror PIN  
• stateless admin password RPC model  
• no heavy authentication system  
• limited mobile support for admin analytics  

Explain why each is acceptable in this context.

---

docs/test_plan.md

Describe testing strategy:

• jury flow tests  
• admin dashboard tests  
• analytics rendering checks  
• CSV import validation  
• export tests  
• manual QA checklist  

---

STEP 5 — Create AI development helpers

Inside:

tools/prompts/

Create reusable prompt templates for future Claude sessions:

audit_prompt.md  
refactor_prompt.md  
regression_check_prompt.md  
ui_review_prompt.md  

Each prompt should be concise and reusable.

---

STEP 6 — Create Claude skills

Inside:

.claude/skills/

Create skill definitions for common AI workflows:

code-review  
refactor  
release  
ui-audit  

Each SKILL.md should explain:

• when the skill is used  
• how Claude should analyze the code  
• expected output format  

Keep these short and practical.

---

STEP 7 — Update CLAUDE.md

Update the CLAUDE.md file so that future AI sessions understand:

• repository structure  
• core architectural decisions  
• main application flows  
• coding conventions  
• safe modification guidelines  

Keep CLAUDE.md concise but authoritative.

---

STEP 8 — Safety rules

Do NOT:

• introduce new frameworks  
• replace routing with React Router  
• change the Supabase database schema  
• modify RPC signatures  
• break admin or jury flows  
• introduce unnecessary abstractions  

This restructuring is primarily organizational and documentation-focused.

---

STEP 9 — Final report

At the end provide:

1. the final repository tree  
2. files created  
3. files moved  
4. imports that were updated  
5. potential risks introduced by the migration  

Ensure the project remains fully functional after restructuring.
// src/jury/__tests__/EvalStep.test.jsx
// ============================================================
// EvalStep — navigation, submit visibility, lock state, banners.
// ============================================================

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// ── Mocks ─────────────────────────────────────────────────────────────────

// EvalStep imports isScoreFilled from useJuryState, which transitively imports
// api.js → supabaseClient.js. Mock api to avoid requiring Supabase env vars in CI.
vi.mock("../../shared/api", () => ({
  listSemesters:               vi.fn(),
  createOrGetJurorAndIssuePin: vi.fn(),
  verifyJurorPin:              vi.fn(),
  listProjects:                vi.fn(),
  upsertScore:                 vi.fn(),
  getJurorEditState:           vi.fn(),
  finalizeJurorSubmission:     vi.fn(),
  getActiveSemester:           vi.fn(),
}));

vi.mock("../../shared/Icons", () => ({
  ChevronLeftIcon:    "span",
  ChevronRightIcon:   "span",
  ChevronDownIcon:    "span",
  HomeIcon:           "span",
  LandmarkIcon:       "span",
  UserCheckIcon:      "span",
  CheckCircle2Icon:   "span",
  PencilIcon:         "span",
  TriangleAlertIcon:  "span",
  LoaderIcon:         "span",
  LockIcon:           "span",
}));

vi.mock("../../config", () => ({
  CRITERIA: [
    { id: "technical", label: "Technical", max: 25 },
    { id: "design",    label: "Design",    max: 25 },
    { id: "delivery",  label: "Delivery",  max: 25 },
    { id: "teamwork",  label: "Teamwork",  max: 25 },
  ],
  APP_CONFIG: { maxScore: 100, showStudents: false },
}));

vi.mock("../../shared/LevelPill", () => ({ default: ({ children }) => children }));

vi.mock("../../components/EntityMeta", () => ({
  GroupLabel:   ({ text }) => text,
  ProjectTitle: ({ text }) => text,
  StudentNames: () => null,
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────

import EvalStep from "../EvalStep";

// ── Fixtures ──────────────────────────────────────────────────────────────

const noop = vi.fn();

const PROJECT_A = {
  project_id: "p-1", group_no: 1,
  project_title: "Alpha", group_students: "Alice, Bob",
};
const PROJECT_B = {
  project_id: "p-2", group_no: 2,
  project_title: "Beta", group_students: "Carol, Dave",
};

const EMPTY_SCORES = {
  "p-1": { technical: null, design: null, delivery: null, teamwork: null },
  "p-2": { technical: null, design: null, delivery: null, teamwork: null },
};

const FULL_SCORES = {
  "p-1": { technical: 20, design: 20, delivery: 20, teamwork: 20 },
  "p-2": { technical: 20, design: 20, delivery: 20, teamwork: 20 },
};

const EMPTY_COMMENTS = { "p-1": "", "p-2": "" };
const EMPTY_TOUCHED  = {
  "p-1": { technical: false, design: false, delivery: false, teamwork: false },
  "p-2": { technical: false, design: false, delivery: false, teamwork: false },
};

function renderEval(overrides = {}) {
  const defaults = {
    juryName:           "Test Juror",
    juryDept:           "EE",
    projects:           [PROJECT_A, PROJECT_B],
    current:            0,
    onNavigate:         noop,
    scores:             EMPTY_SCORES,
    comments:           EMPTY_COMMENTS,
    touched:            EMPTY_TOUCHED,
    groupSynced:        {},
    editMode:           false,
    lockActive:         false,
    progressPct:        0,
    allComplete:        false,
    saveStatus:         "idle",
    handleScore:        noop,
    handleScoreBlur:    noop,
    handleCommentChange: noop,
    handleCommentBlur:  noop,
    handleFinalSubmit:  noop,
    onGoHome:           noop,
  };
  return render(<EvalStep {...defaults} {...overrides} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("EvalStep — smoke render", () => {
  qaTest("jury.eval.01", () => {
    expect(() => renderEval()).not.toThrow();
  });
});

describe("EvalStep — navigation", () => {
  qaTest("jury.eval.02", () => {
    // current=0 → Prev disabled
    renderEval({ current: 0 });
    expect(screen.getByRole("button", { name: /previous group/i })).toBeDisabled();
  });

  qaTest("jury.eval.03", () => {
    // current=last → Next disabled
    renderEval({ current: 1, projects: [PROJECT_A, PROJECT_B] });
    expect(screen.getByRole("button", { name: /next group/i })).toBeDisabled();
  });
});

describe("EvalStep — submit button visibility", () => {
  qaTest("jury.eval.04", () => {
    // allComplete=true, editMode=false → "Submit All Evaluations" shown
    renderEval({ allComplete: true, editMode: false });
    expect(screen.getByRole("button", { name: /submit all evaluations/i })).toBeInTheDocument();
  });

  it("Submit All button is hidden when allComplete is false", () => {
    renderEval({ allComplete: false, editMode: false });
    expect(screen.queryByRole("button", { name: /submit all evaluations/i })).not.toBeInTheDocument();
  });
});

describe("EvalStep — lock state", () => {
  qaTest("jury.eval.05", () => {
    renderEval({ lockActive: true });

    // Lock banner must be visible
    expect(screen.getByText(/evaluations are locked for this semester/i)).toBeInTheDocument();

    // All score inputs must be disabled
    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input) => expect(input).toBeDisabled());
  });
});

describe("EvalStep — group synced banner", () => {
  qaTest("jury.eval.06", () => {
    // groupSynced["p-1"]=true, editMode=false → banner shown
    renderEval({
      scores:      FULL_SCORES,
      groupSynced: { "p-1": true },
      editMode:    false,
    });
    expect(screen.getByText(/all scores saved for this group/i)).toBeInTheDocument();
  });

  it("Group synced banner is hidden in edit mode", () => {
    renderEval({
      scores:      FULL_SCORES,
      groupSynced: { "p-1": true },
      editMode:    true,
    });
    expect(screen.queryByText(/all scores saved for this group/i)).not.toBeInTheDocument();
  });
});

// src/jury/__tests__/useJuryState.test.js
// ============================================================
// useJuryState — pure helper unit tests + PIN lockout hook flow.
// ============================================================

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// ── Mocks (declared before any imports that touch the mocked modules) ─────

vi.mock("@/shared/hooks/useToast", () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

vi.mock("../../shared/api", () => {
  const listPeriodsMock = vi.fn();
  return {
    listPeriodsPublic:         listPeriodsMock,
    listPeriods:               listPeriodsMock,
    authenticateJuror:         vi.fn(),
    verifyJurorPin:            vi.fn(),
    listProjects:              vi.fn(),
    upsertScore:               vi.fn(),
    getJurorEditState:         vi.fn().mockResolvedValue({ edit_allowed: false, lock_active: false }),
    finalizeJurorSubmission:   vi.fn(),
    getCurrentPeriod:          vi.fn().mockResolvedValue(null),
    listPeriodCriteria:        vi.fn().mockResolvedValue([
      { key: "technical", label: "Technical", max_score: 25 },
      { key: "design",    label: "Design",    max_score: 25 },
      { key: "delivery",  label: "Delivery",  max_score: 25 },
      { key: "teamwork",  label: "Teamwork",  max_score: 25 },
    ]),
  };
});

// ── Imports (after vi.mock declarations) ──────────────────────────────────

import * as api from "../../shared/api";
import { isScoreFilled, normalizeScoreValue } from "../useJuryState";
import useJuryState from "../useJuryState";

// ── Helper: advance hook to eval step ─────────────────────────────────────

const SEMESTER_T = { id: "sem-1", name: "2024-2025 Spring", is_current: true };

const makeProjects2 = (overrides = []) => {
  const defaults = [
    {
      project_id: "p-1", group_no: 1, project_title: "Alpha", group_students: "Alice, Bob",
      scores: { technical: null, design: null, delivery: null, teamwork: null },
      comment: "", total: null, final_submitted_at: null,
      updated_at: new Date().toISOString(),
    },
    {
      project_id: "p-2", group_no: 2, project_title: "Beta", group_students: "Carol, Dave",
      scores: { technical: null, design: null, delivery: null, teamwork: null },
      comment: "", total: null, final_submitted_at: null,
      updated_at: new Date().toISOString(),
    },
  ];
  return defaults.map((d, i) => ({ ...d, ...(overrides[i] || {}) }));
};

async function advanceToEval2(result, projectOverrides = []) {
  const projects = makeProjects2(projectOverrides);
  api.listPeriods.mockResolvedValue([SEMESTER_T]);
  api.authenticateJuror.mockResolvedValue({ juror_id: "j-1", needs_pin: true });
  api.listProjects.mockResolvedValue(projects);
  api.getJurorEditState.mockResolvedValue({ edit_allowed: false, lock_active: false });
  api.verifyJurorPin.mockResolvedValue({
    ok: true, juror_id: "j-1", juror_name: "Test Juror", affiliation: "EE",
    session_token: "sess-1",
  });

  act(() => {
    result.current.setJuryName("Test Juror");
    result.current.setAffiliation("EE");
  });
  await act(async () => { await result.current.handleIdentitySubmit(); });
  await waitFor(() => expect(result.current.step).toBe("pin"));
  await act(async () => { await result.current.handlePinSubmit("1234"); });
  await waitFor(() => expect(["progress_check", "eval"]).toContain(result.current.step));
  if (result.current.step === "progress_check") {
    act(() => { result.current.handleProgressContinue(); });
    await waitFor(() => expect(result.current.step).toBe("eval"));
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────

const SEMESTER = { id: "sem-1", name: "2024-2025 Spring", is_current: true };

const makeProject = (overrides = {}) => ({
  project_id:     "p-1",
  group_no:       1,
  project_title:  "Test Project",
  group_students: "Alice, Bob",
  scores:         { technical: 20, design: 20, delivery: 20, teamwork: 20 },
  comment:        "",
  total:          80,
  updated_at:     new Date().toISOString(),
  final_submitted_at: null,
  ...overrides,
});

// ── isScoreFilled ─────────────────────────────────────────────────────────

describe("isScoreFilled — pure function", () => {
  qaTest("jury.score.01", () => {
    // Empty / null / undefined → not filled (lower-bound guard)
    expect(isScoreFilled("")).toBe(false);
    expect(isScoreFilled(null)).toBe(false);
    expect(isScoreFilled(undefined)).toBe(false);
    // 0 is a valid score — must not be treated as empty
    expect(isScoreFilled(0)).toBe(true);
    expect(isScoreFilled("0")).toBe(true);
  });

  qaTest("jury.score.02", () => {
    // Any finite number within range → filled (upper-bound guard)
    expect(isScoreFilled(25)).toBe(true);
    expect(isScoreFilled("25")).toBe(true);
    expect(isScoreFilled(100)).toBe(true);
  });
});

// ── normalizeScoreValue ───────────────────────────────────────────────────

describe("normalizeScoreValue — pure function (clamping)", () => {
  it("clamps value below 0 to 0", () => {
    expect(normalizeScoreValue("-5", 25)).toBe(0);
    expect(normalizeScoreValue(-1, 25)).toBe(0);
  });

  it("clamps value above max to max", () => {
    expect(normalizeScoreValue("30", 25)).toBe(25);
    expect(normalizeScoreValue(100, 25)).toBe(25);
  });

  it("returns null for empty / null / undefined", () => {
    expect(normalizeScoreValue("", 25)).toBe(null);
    expect(normalizeScoreValue(null, 25)).toBe(null);
    expect(normalizeScoreValue(undefined, 25)).toBe(null);
  });

  it("returns parsed integer for valid in-range value", () => {
    expect(normalizeScoreValue("15", 25)).toBe(15);
    expect(normalizeScoreValue(0, 25)).toBe(0);
    expect(normalizeScoreValue(25, 25)).toBe(25);
  });
});

// ── PIN lockout flow (hook integration) ───────────────────────────────────

describe("PIN lockout flow — useJuryState hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: getCurrentSemester returns null (identity step stays clean)
    api.getCurrentPeriod.mockResolvedValue(null);
    api.getJurorEditState.mockResolvedValue({ edit_allowed: false, lock_active: false });
  });

  qaTest("jury.pin.01", async () => {
    // Advance through identity → semester (auto) → pin, then submit wrong PIN
    api.listPeriods.mockResolvedValue([SEMESTER]);
    api.authenticateJuror.mockResolvedValue({
      juror_id: "j-1",
      needs_pin: true,
    });
    api.verifyJurorPin.mockResolvedValue({
      ok: false,
      error_code: "invalid",
      failed_attempts: 1,
    });

    const { result } = renderHook(() => useJuryState());

    // Set identity fields
    act(() => {
      result.current.setJuryName("Test Juror");
      result.current.setAffiliation("EE");
    });

    // Submit identity — auto-advances to "pin" (single active semester)
    await act(async () => {
      await result.current.handleIdentitySubmit();
    });

    await waitFor(() => expect(result.current.step).toBe("pin"));

    // Submit wrong PIN — 1 failed attempt → 2 remaining
    await act(async () => {
      await result.current.handlePinSubmit("9999");
    });

    expect(result.current.pinErrorCode).toBe("invalid");
    expect(result.current.pinAttemptsLeft).toBe(2); // MAX(3) − failed(1)
  });

  qaTest("jury.pin.02", async () => {
    // PIN submission with error_code="locked" → lockout state
    api.listPeriods.mockResolvedValue([SEMESTER]);
    api.authenticateJuror.mockResolvedValue({
      juror_id: "j-1",
      needs_pin: true,
    });
    const future = new Date(Date.now() + 600_000).toISOString();
    api.verifyJurorPin.mockResolvedValue({
      ok: false,
      error_code: "locked",
      failed_attempts: 3,
      locked_until: future,
    });

    const { result } = renderHook(() => useJuryState());

    act(() => {
      result.current.setJuryName("Test Juror");
      result.current.setAffiliation("EE");
    });

    await act(async () => {
      await result.current.handleIdentitySubmit();
    });

    await waitFor(() => expect(result.current.step).toBe("pin"));

    await act(async () => {
      await result.current.handlePinSubmit("0000");
    });

    expect(result.current.pinErrorCode).toBe("locked");
    expect(result.current.pinAttemptsLeft).toBe(0);
    expect(result.current.pinLockedUntil).toBeTruthy();
  });

  qaTest("jury.pin.03", async () => {
    // 2 failed attempts → 1 remaining (singular form data-level check)
    api.listPeriods.mockResolvedValue([SEMESTER]);
    api.authenticateJuror.mockResolvedValue({
      juror_id: "j-1",
      needs_pin: true,
    });
    api.verifyJurorPin.mockResolvedValue({
      ok: false,
      error_code: "invalid",
      failed_attempts: 2,
    });

    const { result } = renderHook(() => useJuryState());

    act(() => {
      result.current.setJuryName("Test Juror");
      result.current.setAffiliation("EE");
    });

    await act(async () => {
      await result.current.handleIdentitySubmit();
    });

    await waitFor(() => expect(result.current.step).toBe("pin"));

    await act(async () => {
      await result.current.handlePinSubmit("0000");
    });

    expect(result.current.pinErrorCode).toBe("invalid");
    expect(result.current.pinAttemptsLeft).toBe(1); // MAX(3) − failed(2)
  });
});

describe("period availability guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCurrentPeriod.mockResolvedValue(null);
    api.getJurorEditState.mockResolvedValue({ edit_allowed: false, lock_active: false });
  });

  it("shows a locked-period error when current periods are locked", async () => {
    api.listPeriods.mockResolvedValue([
      { id: "sem-1", name: "2024-2025 Spring", is_current: true, is_locked: true },
    ]);

    const { result } = renderHook(() => useJuryState());
    act(() => {
      result.current.setJuryName("Test Juror");
      result.current.setAffiliation("EE");
    });

    await act(async () => {
      await result.current.handleIdentitySubmit();
    });

    expect(result.current.step).toBe("identity");
    expect(result.current.authError).toContain("locked");
    expect(api.authenticateJuror).not.toHaveBeenCalled();
  });
});

// ── jury.flow — submission guard, edit mode, navigation ──────────────────

describe("jury.flow — flow mechanics", () => {
  const MOCK_CRITERIA_ROWS = [
    { key: "technical", label: "Technical", max_score: 25 },
    { key: "design",    label: "Design",    max_score: 25 },
    { key: "delivery",  label: "Delivery",  max_score: 25 },
    { key: "teamwork",  label: "Teamwork",  max_score: 25 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.getCurrentPeriod.mockResolvedValue(null);
    api.upsertScore.mockResolvedValue({ ok: true });
    api.getJurorEditState.mockResolvedValue({ edit_allowed: false, lock_active: false });
    api.listPeriodCriteria.mockResolvedValue(MOCK_CRITERIA_ROWS);
  });

  qaTest("jury.flow.01", async () => {
    // One project with partial scores — submit confirm must remain closed.
    const { result } = renderHook(() => useJuryState());
    await advanceToEval2(result);

    // Fill only one criterion on p-1, leave rest null
    act(() => { result.current.handleScore("p-1", "technical", "20"); });
    await act(async () => { result.current.handleScoreBlur("p-1", "technical"); });

    // confirmingSubmit must stay false — not all criteria filled.
    await new Promise((r) => setTimeout(r, 100));
    expect(result.current.confirmingSubmit).toBe(false);
  });

  qaTest("jury.flow.02", async () => {
    // All projects fully filled does NOT auto-open confirmation.
    // Confirmation opens only after explicit submit click/handler.
    const { result } = renderHook(() => useJuryState());
    await advanceToEval2(result);

    const criteria = ["technical", "design", "delivery", "teamwork"];
    for (const pid of ["p-1", "p-2"]) {
      for (const cid of criteria) {
        act(() => { result.current.handleScore(pid, cid, "20"); });
        await act(async () => { result.current.handleScoreBlur(pid, cid); });
      }
    }

    await waitFor(() => expect(result.current.allComplete).toBe(true), { timeout: 3000 });
    expect(result.current.confirmingSubmit).toBe(false);

    await act(async () => {
      await result.current.handleRequestSubmit();
    });
    await waitFor(() => expect(result.current.confirmingSubmit).toBe(true), { timeout: 3000 });
  });

  qaTest("jury.flow.03", async () => {
    // Edit mode: handleEditScores preloads scores, comments, groupSynced from done state
    const fullScores = { technical: 20, design: 20, delivery: 20, teamwork: 20 };
    const submitted = new Date().toISOString();

    api.listPeriods.mockResolvedValue([SEMESTER_T]);
    api.authenticateJuror.mockResolvedValue({ juror_id: "j-1", needs_pin: true });
    api.listProjects.mockResolvedValue([
      {
        project_id: "p-1", group_no: 1, project_title: "Alpha", group_students: "Alice",
        scores: fullScores, comment: "Well done",
        total: 80, final_submitted_at: submitted, updated_at: submitted,
      },
    ]);
    api.getJurorEditState.mockResolvedValue({
      edit_allowed: true,
      lock_active: false,
      final_submitted_at: submitted,
    });
    api.verifyJurorPin.mockResolvedValue({
      ok: true, juror_id: "j-1", juror_name: "Test Juror", affiliation: "EE", session_token: "sess-1",
    });

    const { result } = renderHook(() => useJuryState());
    act(() => {
      result.current.setJuryName("Test Juror");
      result.current.setAffiliation("EE");
    });
    await act(async () => { await result.current.handleIdentitySubmit(); });
    await waitFor(() => expect(result.current.step).toBe("pin"));
    await act(async () => { await result.current.handlePinSubmit("1234"); });
    await waitFor(() => expect(result.current.step).toBe("done"));

    act(() => { result.current.handleEditScores(); });

    expect(result.current.step).toBe("eval");
    expect(result.current.editMode).toBe(true);
    expect(result.current.scores["p-1"].technical).toBe(20);
    expect(result.current.scores["p-1"].design).toBe(20);
    expect(result.current.comments["p-1"]).toBe("Well done");
    expect(result.current.groupSynced["p-1"]).toBe(true);
  });

  qaTest("jury.flow.04", async () => {
    // Navigating to next group must not mutate previous group scores
    const { result } = renderHook(() => useJuryState());
    await advanceToEval2(result);

    // Set scores for p-1
    act(() => { result.current.handleScore("p-1", "technical", "15"); });
    await act(async () => { result.current.handleScoreBlur("p-1", "technical"); });

    const scoresBefore = result.current.scores["p-1"].technical;

    // Navigate to p-2
    await act(async () => { await result.current.handleNavigate(1); });

    // p-1 score must be unchanged
    expect(result.current.scores["p-1"].technical).toBe(scoresBefore);
  });
});

// ── resume flow guard (no implicit submit modal) ─────────────────────────

describe("resume flow guard — no implicit submit modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCurrentPeriod.mockResolvedValue(null);
  });

  qaTest("jury.resume.01", async () => {
    // A fully-scored juror resuming via PIN should NOT see submit confirmation
    // until they explicitly press submit.
    api.listPeriods.mockResolvedValue([SEMESTER]);
    api.authenticateJuror.mockResolvedValue({
      juror_id: "j-1",
      needs_pin: true,
    });
    // All 4 criteria filled — enough for groupSynced to be true
    const project = makeProject({
      scores: { technical: 20, design: 20, delivery: 20, teamwork: 20 },
      total: null, // no DB total → allFilled computed client-side
      final_submitted_at: null,
    });
    api.listProjects.mockResolvedValue([project]);
    api.getJurorEditState.mockResolvedValue({ edit_allowed: false, lock_active: false });
    api.verifyJurorPin.mockResolvedValue({
      ok: true,
      juror_id: "j-1",
      juror_name: "Test Juror",
      affiliation: "EE",
      session_token: "sess-1",
    });

    const { result } = renderHook(() => useJuryState());

    act(() => {
      result.current.setJuryName("Test Juror");
      result.current.setAffiliation("EE");
    });

    await act(async () => {
      await result.current.handleIdentitySubmit();
    });

    await waitFor(() => expect(result.current.step).toBe("pin"));

    // Submit correct PIN and load existing scores
    await act(async () => {
      await result.current.handlePinSubmit("1234");
    });

    // Should land on progress_check (has data, showProgressCheck=true) or eval,
    // and confirmingSubmit must remain false until explicit submit request.
    await waitFor(() =>
      expect(["progress_check", "eval"]).toContain(result.current.step)
    );

    expect(result.current.confirmingSubmit).toBe(false);
  });
});

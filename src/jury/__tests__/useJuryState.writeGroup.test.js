// src/jury/__tests__/useJuryState.writeGroup.test.js
// ============================================================
// useJuryState — writeGroup, auto-done, edit mode, lock, normalization.
// Covers the untested core state-machine paths identified in the audit.
// ============================================================

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mocks (declared before any imports that touch the mocked modules) ─────

vi.mock("../../components/toast/useToast", () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

vi.mock("../../shared/api", () => ({
  listSemesters:               vi.fn(),
  createOrGetJurorAndIssuePin: vi.fn(),
  verifyJurorPin:              vi.fn(),
  listProjects:                vi.fn(),
  upsertScore:                 vi.fn(),
  getJurorEditState:           vi.fn().mockResolvedValue({ edit_allowed: false, lock_active: false }),
  finalizeJurorSubmission:     vi.fn(),
  getActiveSemester:           vi.fn().mockResolvedValue(null),
}));

vi.mock("../../config", () => ({
  CRITERIA: [
    { id: "technical", label: "Technical", max: 25 },
    { id: "design",    label: "Design",    max: 25 },
    { id: "delivery",  label: "Delivery",  max: 25 },
    { id: "teamwork",  label: "Teamwork",  max: 25 },
  ],
  APP_CONFIG: { maxScore: 100 },
}));

// ── Imports (after vi.mock declarations) ──────────────────────────────────

import * as api from "../../shared/api";
import useJuryState from "../useJuryState";

// ── Fixtures ──────────────────────────────────────────────────────────────

const SEMESTER = { id: "sem-1", name: "2024-2025 Spring", is_active: true };

const makeProjects = (overrides = []) => {
  const defaults = [
    {
      project_id: "p-1", group_no: 1,
      project_title: "Alpha", group_students: "Alice, Bob",
      scores: { technical: null, design: null, delivery: null, teamwork: null },
      comment: "", total: null, final_submitted_at: null,
      updated_at: new Date().toISOString(),
    },
    {
      project_id: "p-2", group_no: 2,
      project_title: "Beta", group_students: "Carol, Dave",
      scores: { technical: null, design: null, delivery: null, teamwork: null },
      comment: "", total: null, final_submitted_at: null,
      updated_at: new Date().toISOString(),
    },
  ];
  return defaults.map((d, i) => ({ ...d, ...(overrides[i] || {}) }));
};

// ── Helper: advance hook to eval step ────────────────────────────────────
// identity → semester(auto) → pin → PIN verify → eval
async function advanceToEval(result, projectOverrides = []) {
  const projects = makeProjects(projectOverrides);
  api.listSemesters.mockResolvedValue([SEMESTER]);
  api.createOrGetJurorAndIssuePin.mockResolvedValue({
    juror_id: "j-1",
    needs_pin: true,
  });
  api.listProjects.mockResolvedValue(projects);
  api.getJurorEditState.mockResolvedValue({ edit_allowed: false, lock_active: false });
  api.verifyJurorPin.mockResolvedValue({
    ok: true,
    juror_id: "j-1",
    juror_name: "Test Juror",
    juror_inst: "EE",
  });

  act(() => {
    result.current.setJuryName("Test Juror");
    result.current.setJuryDept("EE");
  });

  await act(async () => {
    await result.current.handleIdentitySubmit();
  });

  await waitFor(() => expect(result.current.step).toBe("pin"));

  await act(async () => {
    await result.current.handlePinSubmit("1234");
  });

  await waitFor(() =>
    expect(["progress_check", "eval"]).toContain(result.current.step)
  );

  // If on progress_check, advance to eval
  if (result.current.step === "progress_check") {
    act(() => {
      result.current.handleProgressContinue();
    });
    await waitFor(() => expect(result.current.step).toBe("eval"));
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("writeGroup — happy path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getActiveSemester.mockResolvedValue(null);
    api.upsertScore.mockResolvedValue({ ok: true });
  });

  it("calls upsertScore with correct args when a score is entered and blurred", async () => {
    const { result } = renderHook(() => useJuryState());
    await advanceToEval(result);

    // Enter a score for group 1, technical criterion
    act(() => {
      result.current.handleScore("p-1", "technical", "20");
    });

    // Blur triggers writeGroup
    await act(async () => {
      result.current.handleScoreBlur("p-1", "technical");
    });

    expect(api.upsertScore).toHaveBeenCalledWith(
      "sem-1",  // semesterId
      "p-1",    // projectId
      "j-1",    // jurorId
      expect.objectContaining({ technical: 20 }),
      expect.any(String) // comment
    );
  });

  it("skips upsertScore when snapshot is unchanged (dedup)", async () => {
    const { result } = renderHook(() => useJuryState());
    await advanceToEval(result);

    // Enter + blur to trigger first write
    act(() => {
      result.current.handleScore("p-1", "technical", "20");
    });
    await act(async () => {
      result.current.handleScoreBlur("p-1", "technical");
    });

    const firstCallCount = api.upsertScore.mock.calls.length;

    // Blur again with same value — should NOT trigger another upsertScore
    await act(async () => {
      result.current.handleScoreBlur("p-1", "technical");
    });

    expect(api.upsertScore.mock.calls.length).toBe(firstCallCount);
  });

  it("sets saveStatus to 'saving' during write and 'saved' after", async () => {
    let resolveUpsert;
    api.upsertScore.mockImplementation(
      () => new Promise((resolve) => { resolveUpsert = resolve; })
    );

    const { result } = renderHook(() => useJuryState());
    await advanceToEval(result);

    act(() => {
      result.current.handleScore("p-1", "technical", "20");
    });

    // Start blur — upsert is in flight
    const blurPromise = act(async () => {
      result.current.handleScoreBlur("p-1", "technical");
    });

    // Resolve the upsert
    await act(async () => {
      resolveUpsert({ ok: true });
    });
    await blurPromise;

    expect(result.current.saveStatus).toBe("saved");
  });
});

describe("writeGroup — error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getActiveSemester.mockResolvedValue(null);
  });

  it("sets saveStatus to 'error' when upsertScore fails", async () => {
    api.upsertScore.mockRejectedValue(new Error("network failure"));

    const { result } = renderHook(() => useJuryState());
    await advanceToEval(result);

    act(() => {
      result.current.handleScore("p-1", "technical", "20");
    });
    await act(async () => {
      result.current.handleScoreBlur("p-1", "technical");
    });

    expect(result.current.saveStatus).toBe("error");
  });

  it("sets editLockActive=true when upsertScore returns semester_locked error", async () => {
    api.upsertScore.mockRejectedValue(new Error("semester_locked"));

    const { result } = renderHook(() => useJuryState());
    await advanceToEval(result);

    act(() => {
      result.current.handleScore("p-1", "technical", "20");
    });
    await act(async () => {
      result.current.handleScoreBlur("p-1", "technical");
    });

    expect(result.current.editLockActive).toBe(true);
    expect(result.current.saveStatus).toBe("error");
  });
});

describe("score normalization on blur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getActiveSemester.mockResolvedValue(null);
    api.upsertScore.mockResolvedValue({ ok: true });
  });

  it("clamps a value above max to max on blur", async () => {
    const { result } = renderHook(() => useJuryState());
    await advanceToEval(result);

    act(() => {
      result.current.handleScore("p-1", "technical", "30");
    });
    await act(async () => {
      result.current.handleScoreBlur("p-1", "technical");
    });

    // Score should be clamped to 25 (max for technical)
    expect(result.current.scores["p-1"].technical).toBe(25);
    // The upsert should receive 25, not 30
    expect(api.upsertScore).toHaveBeenCalledWith(
      expect.any(String), expect.any(String), expect.any(String),
      expect.objectContaining({ technical: 25 }),
      expect.any(String)
    );
  });

  it("clamps negative value to 0 on blur", async () => {
    const { result } = renderHook(() => useJuryState());
    await advanceToEval(result);

    act(() => {
      result.current.handleScore("p-1", "technical", "-5");
    });
    await act(async () => {
      result.current.handleScoreBlur("p-1", "technical");
    });

    expect(result.current.scores["p-1"].technical).toBe(0);
  });
});

describe("auto-done transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getActiveSemester.mockResolvedValue(null);
    api.upsertScore.mockResolvedValue({ ok: true });
    api.getJurorEditState.mockResolvedValue({ edit_allowed: false, lock_active: false });
  });

  it("triggers confirmingSubmit when all groups become synced", async () => {
    const { result } = renderHook(() => useJuryState());
    await advanceToEval(result);

    // Fill all criteria for project 1
    const criteria = ["technical", "design", "delivery", "teamwork"];
    for (const cid of criteria) {
      act(() => { result.current.handleScore("p-1", cid, "20"); });
      await act(async () => { result.current.handleScoreBlur("p-1", cid); });
    }

    // Fill all criteria for project 2
    for (const cid of criteria) {
      act(() => { result.current.handleScore("p-2", cid, "20"); });
      await act(async () => { result.current.handleScoreBlur("p-2", cid); });
    }

    // Auto-done should trigger: allComplete should be true and
    // confirmingSubmit should eventually become true
    await waitFor(() => expect(result.current.allComplete).toBe(true));
    await waitFor(() => expect(result.current.confirmingSubmit).toBe(true), { timeout: 3000 });
  });
});

describe("edit mode flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getActiveSemester.mockResolvedValue(null);
    api.upsertScore.mockResolvedValue({ ok: true });
  });

  it("transitions to eval step when edit_allowed is true and handleEditScores is called", async () => {
    const fullScores = { technical: 20, design: 20, delivery: 20, teamwork: 20 };
    const submitted = new Date().toISOString();

    api.listSemesters.mockResolvedValue([SEMESTER]);
    api.createOrGetJurorAndIssuePin.mockResolvedValue({
      juror_id: "j-1", needs_pin: true,
    });
    api.listProjects.mockResolvedValue([
      {
        project_id: "p-1", group_no: 1,
        project_title: "Alpha", group_students: "Alice",
        scores: fullScores, comment: "Good",
        total: 80, final_submitted_at: submitted,
        updated_at: submitted,
      },
      {
        project_id: "p-2", group_no: 2,
        project_title: "Beta", group_students: "Bob",
        scores: fullScores, comment: "Nice",
        total: 80, final_submitted_at: submitted,
        updated_at: submitted,
      },
    ]);
    api.getJurorEditState.mockResolvedValue({ edit_allowed: true, lock_active: false });
    api.verifyJurorPin.mockResolvedValue({
      ok: true, juror_id: "j-1", juror_name: "Test Juror", juror_inst: "EE",
    });

    const { result } = renderHook(() => useJuryState());

    act(() => {
      result.current.setJuryName("Test Juror");
      result.current.setJuryDept("EE");
    });

    await act(async () => {
      await result.current.handleIdentitySubmit();
    });
    await waitFor(() => expect(result.current.step).toBe("pin"));

    await act(async () => {
      await result.current.handlePinSubmit("1234");
    });

    // Should land on "done" since final_submitted_at is set
    await waitFor(() => expect(result.current.step).toBe("done"));
    expect(result.current.editAllowed).toBe(true);

    // Trigger edit mode
    act(() => {
      result.current.handleEditScores();
    });

    expect(result.current.step).toBe("eval");
    expect(result.current.editMode).toBe(true);
    // Scores should be preserved from the done state
    expect(result.current.scores["p-1"].technical).toBe(20);
  });
});

describe("handleCancelSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getActiveSemester.mockResolvedValue(null);
    api.upsertScore.mockResolvedValue({ ok: true });
    api.getJurorEditState.mockResolvedValue({ edit_allowed: false, lock_active: false });
  });

  it("clears confirmingSubmit when cancel is called", async () => {
    const { result } = renderHook(() => useJuryState());
    await advanceToEval(result);

    // Fill all criteria for both projects to trigger auto-done
    const criteria = ["technical", "design", "delivery", "teamwork"];
    for (const pid of ["p-1", "p-2"]) {
      for (const cid of criteria) {
        act(() => { result.current.handleScore(pid, cid, "20"); });
        await act(async () => { result.current.handleScoreBlur(pid, cid); });
      }
    }

    await waitFor(() => expect(result.current.confirmingSubmit).toBe(true), { timeout: 3000 });

    // Cancel
    act(() => {
      result.current.handleCancelSubmit();
    });

    expect(result.current.confirmingSubmit).toBe(false);
  });
});

// src/jury/__tests__/DoneStep.test.jsx
import { describe, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { qaTest } from "../../test/qaTest.js";

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));

// Mock the API — submitJuryFeedback
const mockSubmitFeedback = vi.fn().mockResolvedValue({ data: true });
vi.mock("../../shared/api", () => ({
  submitJuryFeedback: (...args) => mockSubmitFeedback(...args),
}));

// DoneStep uses useConfetti which needs canvas — mock it
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  globalAlpha: 1,
  fillStyle: "",
}));

// We need to import after mocks
const { default: DoneStep } = await import("../steps/DoneStep.jsx");

function makeState(overrides = {}) {
  return {
    periodId: "period-1",
    jurorSessionToken: "token-abc",
    juryName: "Dr. Yıldız",
    projects: [
      { project_id: "p1", title: "Project Alpha", members: "A, B" },
      { project_id: "p2", title: "Project Beta", members: "C, D" },
      { project_id: "p3", title: "Project Gamma", members: "E, F" },
    ],
    effectiveCriteria: [
      { id: "technical", label: "Technical", short_label: "Tech", max: 30 },
      { id: "written", label: "Written", short_label: "Written", max: 30 },
    ],
    scores: {},
    doneScores: {},
    doneComments: {},
    editAllowed: false,
    setStep: vi.fn(),
    clearLocalSession: vi.fn(),
    handleEditScores: vi.fn(),
    tenantAdminEmail: "admin@example.com",
    periodName: "Spring 2026",
    ...overrides,
  };
}

describe("DoneStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  qaTest("jury.done.01", () => {
    const state = makeState({ juryName: "Dr. Yıldız" });
    render(<DoneStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText(/Thank you, Dr\. Yıldız/i)).toBeTruthy();
  });

  qaTest("jury.done.02", () => {
    const state = makeState({
      projects: [
        { project_id: "p1", title: "A", members: "" },
        { project_id: "p2", title: "B", members: "" },
        { project_id: "p3", title: "C", members: "" },
        { project_id: "p4", title: "D", members: "" },
        { project_id: "p5", title: "E", members: "" },
      ],
    });
    render(<DoneStep state={state} onBack={vi.fn()} />);
    expect(screen.getByText(/5 groups/i)).toBeTruthy();
  });

  qaTest("jury.done.03", () => {
    const state = makeState();
    render(<DoneStep state={state} onBack={vi.fn()} />);

    // Textarea should NOT be visible initially
    expect(screen.queryByPlaceholderText(/comment/i)).toBeNull();

    // Click a star (4th star)
    const stars = screen.getAllByRole("button").filter((btn) =>
      btn.classList.contains("dj-star")
    );
    fireEvent.click(stars[3]);

    // Now textarea should be visible
    expect(screen.getByPlaceholderText(/comment/i)).toBeTruthy();
  });

  qaTest("jury.done.04", async () => {
    const state = makeState();
    render(<DoneStep state={state} onBack={vi.fn()} />);

    // Click 4th star
    const stars = screen.getAllByRole("button").filter((btn) =>
      btn.classList.contains("dj-star")
    );
    fireEvent.click(stars[3]);

    // Click send
    const sendBtn = screen.getByRole("button", { name: /send/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith("period-1", "token-abc", 4, "");
    });

    // Should show thank you message
    await waitFor(() => {
      expect(screen.getByText(/thank you for your feedback/i)).toBeTruthy();
    });
  });

  qaTest("jury.done.05", () => {
    const state = makeState({ tenantAdminEmail: "admin@example.com" });
    render(<DoneStep state={state} onBack={vi.fn()} />);

    const editLink = screen.getByText(/request edit/i);
    expect(editLink.closest("a")).toBeTruthy();
    expect(editLink.closest("a").href).toMatch(/^mailto:/);
  });

  qaTest("jury.done.06", () => {
    const onBack = vi.fn();
    const state = makeState();
    render(<DoneStep state={state} onBack={onBack} />);

    const homeLink = screen.getByText(/return to home/i);
    fireEvent.click(homeLink);

    expect(state.clearLocalSession).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });

  qaTest("jury.done.07", () => {
    const state = makeState({
      projects: [
        { project_id: "p1", title: "Project Alpha", avg_score: 85 },
        { project_id: "p2", title: "Project Beta", avg_score: 72 },
        { project_id: "p3", title: "Project Gamma", avg_score: 90 },
      ],
    });
    render(<DoneStep state={state} onBack={vi.fn()} />);

    // Rankings section should be present
    expect(screen.getByText(/current rankings/i)).toBeTruthy();
    // Projects should appear in the rankings
    expect(screen.getByText("Project Alpha")).toBeTruthy();
    expect(screen.getByText("Project Beta")).toBeTruthy();
    expect(screen.getByText("Project Gamma")).toBeTruthy();
  });
});

// src/jury/__tests__/ScoringGrid.test.jsx
// ============================================================
// Component tests for ScoringGrid — ARIA labels, input behavior,
// lock state, and comment field.
// ============================================================

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../config", () => ({
  CRITERIA: [
    {
      id: "technical", label: "Technical", max: 25, blurb: "Tech quality",
      mudek: [], rubric: [{ range: "0–12", level: "Low", desc: "Needs work", min: 0, max: 12 }],
    },
    {
      id: "design", label: "Design", max: 25, blurb: "Design quality",
      mudek: [], rubric: [{ range: "0–12", level: "Low", desc: "Needs work", min: 0, max: 12 }],
    },
  ],
}));

import ScoringGrid from "../ScoringGrid";

const defaultProps = {
  pid: "p-1",
  scoresPid: { technical: null, design: null },
  commentsPid: "",
  touchedPid: { technical: false, design: false },
  lockActive: false,
  handleScore: vi.fn(),
  handleScoreBlur: vi.fn(),
  handleCommentChange: vi.fn(),
  handleCommentBlur: vi.fn(),
  totalScore: 0,
  allComplete: false,
  editMode: false,
  completedGroups: 0,
  totalGroups: 2,
  handleFinalSubmit: vi.fn(),
};

describe("ScoringGrid", () => {
  it("renders score inputs with ARIA labels", () => {
    render(<ScoringGrid {...defaultProps} />);
    expect(screen.getByLabelText("Score for Technical, max 25")).toBeInTheDocument();
    expect(screen.getByLabelText("Score for Design, max 25")).toBeInTheDocument();
  });

  it("renders comment textarea with ARIA label", () => {
    render(<ScoringGrid {...defaultProps} />);
    expect(screen.getByLabelText("Comments for this group")).toBeInTheDocument();
  });

  it("calls handleScore on input change", () => {
    const handleScore = vi.fn();
    render(<ScoringGrid {...defaultProps} handleScore={handleScore} />);

    const input = screen.getByLabelText("Score for Technical, max 25");
    fireEvent.change(input, { target: { value: "20" } });

    expect(handleScore).toHaveBeenCalledWith("p-1", "technical", "20");
  });

  it("calls handleScoreBlur on input blur", () => {
    const handleScoreBlur = vi.fn();
    render(<ScoringGrid {...defaultProps} handleScoreBlur={handleScoreBlur} />);

    const input = screen.getByLabelText("Score for Technical, max 25");
    fireEvent.blur(input);

    expect(handleScoreBlur).toHaveBeenCalledWith("p-1", "technical");
  });

  it("disables all inputs when lockActive is true", () => {
    render(<ScoringGrid {...defaultProps} lockActive={true} />);

    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it("displays rubric button with correct ARIA label", () => {
    render(<ScoringGrid {...defaultProps} />);
    expect(screen.getByLabelText("View rubric for Technical")).toBeInTheDocument();
    expect(screen.getByLabelText("View rubric for Design")).toBeInTheDocument();
  });

  it("shows total score", () => {
    render(<ScoringGrid {...defaultProps} totalScore={45} />);
    expect(screen.getByText("45 / 100")).toBeInTheDocument();
  });
});

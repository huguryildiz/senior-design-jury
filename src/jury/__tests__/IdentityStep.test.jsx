import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import IdentityStep from "../steps/IdentityStep";

function makeState(overrides = {}) {
  return {
    juryName: "",
    affiliation: "",
    authError: "",
    currentPeriodInfo: null,
    activeProjectCount: null,
    handleIdentitySubmit: vi.fn(),
    ...overrides,
  };
}

describe("IdentityStep", () => {
  it("renders active period metadata when available", () => {
    const state = makeState({
      currentPeriodInfo: {
        name: "Spring 2026",
        organizations: {
          institution_name: "TED University",
          name: "Electrical & Electronics Engineering",
        },
      },
      activeProjectCount: 5,
    });

    render(<IdentityStep state={state} onBack={vi.fn()} />);

    expect(screen.getByText("Spring 2026")).toBeInTheDocument();
    expect(screen.getByText("TED University")).toBeInTheDocument();
    expect(
      screen.getByText("Electrical & Electronics Engineering")
    ).toBeInTheDocument();
    expect(screen.getByText("5 Groups")).toBeInTheDocument();
  });

  it("does not render period metadata when current period is missing", () => {
    const state = makeState();
    render(<IdentityStep state={state} onBack={vi.fn()} />);
    expect(screen.queryByText("Spring 2026")).not.toBeInTheDocument();
  });
});

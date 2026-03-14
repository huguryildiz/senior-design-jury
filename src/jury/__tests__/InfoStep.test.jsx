// src/jury/__tests__/InfoStep.test.jsx
// ============================================================
// InfoStep — identity form validation, error banner, Enter key.
// ============================================================

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("../../shared/Icons", () => ({
  InfoIcon:          "span",
  UserRoundCheckIcon: "span",
  AlertCircleIcon:   "span",
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────

import InfoStep from "../InfoStep";

// ── Fixtures ──────────────────────────────────────────────────────────────

const noop = vi.fn();

function renderInfo(overrides = {}) {
  const defaults = {
    juryName:           "",
    setJuryName:        noop,
    juryDept:           "",
    setJuryDept:        noop,
    activeSemester:     null,
    activeProjectCount: null,
    onStart:            noop,
    onBack:             noop,
    error:              "",
  };
  return render(<InfoStep {...defaults} {...overrides} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("InfoStep — submit guard", () => {
  qaTest("jury.info.01", () => {
    // Both fields empty → Start disabled
    renderInfo({ juryName: "", juryDept: "" });
    expect(screen.getByRole("button", { name: /start evaluation/i })).toBeDisabled();
  });

  qaTest("jury.info.02", () => {
    // Both fields filled → Start enabled
    renderInfo({ juryName: "Alice", juryDept: "EE" });
    expect(screen.getByRole("button", { name: /start evaluation/i })).not.toBeDisabled();
  });

  it("Start button is disabled when only name is filled", () => {
    renderInfo({ juryName: "Alice", juryDept: "" });
    expect(screen.getByRole("button", { name: /start evaluation/i })).toBeDisabled();
  });

  it("Start button is disabled when only dept is filled", () => {
    renderInfo({ juryName: "", juryDept: "EE" });
    expect(screen.getByRole("button", { name: /start evaluation/i })).toBeDisabled();
  });
});

describe("InfoStep — error banner", () => {
  qaTest("jury.info.03", () => {
    renderInfo({ error: "Could not load semesters. Please try again." });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/could not load semesters/i)).toBeInTheDocument();
  });

  it("Error banner is not shown when error is empty", () => {
    renderInfo({ error: "" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("InfoStep — project count label", () => {
  qaTest("jury.info.04", () => {
    renderInfo({ activeProjectCount: 1 });
    expect(screen.getByText("1 Project Group")).toBeInTheDocument();
  });

  it("Shows plural form for multiple project groups", () => {
    renderInfo({ activeProjectCount: 6 });
    expect(screen.getByText("6 Project Groups")).toBeInTheDocument();
  });
});

describe("InfoStep — Enter key submission", () => {
  qaTest("jury.info.05", () => {
    const onStart = vi.fn();
    renderInfo({ juryName: "Alice", juryDept: "EE", onStart });

    const deptInput = screen.getByLabelText(/institution \/ department/i);
    fireEvent.keyDown(deptInput, { key: "Enter" });

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("Enter key does NOT trigger onStart when fields are empty", () => {
    const onStart = vi.fn();
    renderInfo({ juryName: "", juryDept: "", onStart });

    const deptInput = screen.getByLabelText(/institution \/ department/i);
    fireEvent.keyDown(deptInput, { key: "Enter" });

    expect(onStart).not.toHaveBeenCalled();
  });
});

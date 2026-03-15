// src/jury/__tests__/EvalHeader.test.jsx
// ============================================================
// SaveIndicator — aria-live accessibility and state text tests.
// Audit items: M-1, a11y.saveindicator
// ============================================================

import { render, screen } from "@testing-library/react";
import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import { SaveIndicator } from "../EvalHeader";

describe("SaveIndicator — aria-live", () => {
  qaTest("a11y.saveindicator.01", () => {
    const { container } = render(<SaveIndicator saveStatus="idle" />);
    const liveRegion = container.querySelector("[role='status']");
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  qaTest("a11y.saveindicator.02", () => {
    const { rerender } = render(<SaveIndicator saveStatus="idle" />);
    expect(screen.queryByText("Saving…")).not.toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();

    rerender(<SaveIndicator saveStatus="saving" />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();

    rerender(<SaveIndicator saveStatus="saved" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.queryByText("Saving…")).not.toBeInTheDocument();
  });
});

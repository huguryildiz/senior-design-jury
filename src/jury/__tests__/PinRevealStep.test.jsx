// src/jury/__tests__/PinRevealStep.test.jsx
// ============================================================
// Component tests for PinRevealStep — PIN digit display,
// checkbox gate, copy failure message, and continue button.
// ============================================================

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PinRevealStep from "../PinRevealStep";

describe("PinRevealStep", () => {
  it("displays all four PIN digits", () => {
    render(<PinRevealStep pin="1234" onContinue={vi.fn()} />);

    const digits = screen.getAllByText(/^[0-9]$/);
    expect(digits).toHaveLength(4);
    expect(digits[0]).toHaveTextContent("1");
    expect(digits[1]).toHaveTextContent("2");
    expect(digits[2]).toHaveTextContent("3");
    expect(digits[3]).toHaveTextContent("4");
  });

  it("disables Continue button until checkbox is checked", () => {
    render(<PinRevealStep pin="5678" onContinue={vi.fn()} />);

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeDisabled();

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(continueBtn).not.toBeDisabled();
  });

  it("calls onContinue when Continue is clicked after checkbox", () => {
    const onContinue = vi.fn();
    render(<PinRevealStep pin="5678" onContinue={onContinue} />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("shows copy failure message when clipboard is unavailable", async () => {
    // Remove clipboard API entirely
    const original = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    // jsdom has no execCommand — define a stub so the spy works
    if (!document.execCommand) {
      document.execCommand = () => false;
    }
    vi.spyOn(document, "execCommand").mockReturnValue(false);

    render(<PinRevealStep pin="9999" onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /copy pin/i }));

    // Wait for the error message
    expect(
      await screen.findByText(/could not copy automatically/i)
    ).toBeInTheDocument();

    // Restore
    Object.defineProperty(navigator, "clipboard", {
      value: original,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("renders Return Home button when onBack is provided", () => {
    render(<PinRevealStep pin="1234" onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("button", { name: /return home/i })).toBeInTheDocument();
  });

  it("does not render Return Home button when onBack is absent", () => {
    render(<PinRevealStep pin="1234" onContinue={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /return home/i })).not.toBeInTheDocument();
  });
});

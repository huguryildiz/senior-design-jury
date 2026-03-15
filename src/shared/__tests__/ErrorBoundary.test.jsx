// src/shared/__tests__/ErrorBoundary.test.jsx
// ============================================================
// Top-level ErrorBoundary — catches render errors, shows fallback.
// Audit item: M-3 (error.boundary.01)
// ============================================================

import { render, screen } from "@testing-library/react";
import { describe, expect, vi, beforeEach, afterEach } from "vitest";
import ErrorBoundary from "../ErrorBoundary";
import { qaTest } from "../../test/qaTest.js";

function BrokenComponent() {
  throw new Error("Test render error");
}

describe("ErrorBoundary", () => {
  let consoleError;

  beforeEach(() => {
    // Suppress expected console.error output from React's error boundary reporting
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  qaTest("error.boundary.01", () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

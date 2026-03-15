// src/admin/__tests__/PinResetDialog.test.jsx
// ============================================================
// PinResetDialog — confirmation step semester context (TC-020)
//                  and result step juror context (TC-021).
// ============================================================

import { render, screen } from "@testing-library/react";
import { describe, expect, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import PinResetDialog from "../settings/PinResetDialog";

vi.mock("../../shared/Icons", () => ({
  KeyRoundIcon: "span",
  TriangleAlertIcon: "span",
}));

const BASE_TARGET = { juror_id: "j1", juror_name: "Alice", juror_inst: "EE" };

function renderDialog(overrides = {}) {
  const defaults = {
    pinResetTarget: BASE_TARGET,
    resetPinInfo: null,
    pinResetLoading: false,
    pinCopied: false,
    viewSemesterLabel: "2026 Spring",
    onCopyPin: vi.fn(),
    onClose: vi.fn(),
    onConfirmReset: vi.fn(),
  };
  return render(<PinResetDialog {...defaults} {...overrides} />);
}

describe("PinResetDialog — confirmation step", () => {
  qaTest("pin.reset.01", () => {
    renderDialog();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  qaTest("pin.reset.02", () => {
    renderDialog({ viewSemesterLabel: "2026 Spring" });
    expect(screen.getByText("2026 Spring")).toBeInTheDocument();
  });

  qaTest("pin.reset.03", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset pin/i })).toBeInTheDocument();
  });
});

describe("PinResetDialog — result step", () => {
  qaTest("pin.reset.04", () => {
    renderDialog({ resetPinInfo: { pin_plain_once: "4729" } });
    expect(screen.getByText("4729")).toBeInTheDocument();
  });

  qaTest("pin.reset.05", () => {
    renderDialog({ resetPinInfo: { pin_plain_once: "4729" } });
    // After code change: result step shows juror name for context
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});

// src/jury/__tests__/PinStep.test.jsx
// ============================================================
// PinStep UI — error state rendering tests.
// ============================================================

import { render, screen } from "@testing-library/react";
import { describe, expect, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import PinStep from "../PinStep";

vi.mock("../../shared/Icons", () => ({
  KeyRoundIcon:      "span",
  AlertCircleIcon:   "span",
  LockIcon:          "span",
  TriangleAlertIcon: "span",
}));

const DEFAULT_PROPS = {
  pinError:       "",
  pinErrorCode:   "",
  pinAttemptsLeft: 3,
  pinLockedUntil: "",
  onPinSubmit:    vi.fn(),
  onBack:         vi.fn(),
};

function renderPin(overrides = {}) {
  return render(<PinStep {...DEFAULT_PROPS} {...overrides} />);
}

describe("PinStep — attempt counter", () => {
  qaTest("jury.pin.01", () => {
    renderPin({
      pinError:        "Incorrect PIN",
      pinErrorCode:    "invalid",
      pinAttemptsLeft: 2,
    });
    expect(screen.getByText(/2 attempts remaining/i)).toBeInTheDocument();
  });

  qaTest("jury.pin.03", () => {
    renderPin({
      pinError:        "Incorrect PIN",
      pinErrorCode:    "invalid",
      pinAttemptsLeft: 1,
    });
    // Singular form: "1 attempt remaining" (no "s")
    expect(screen.getByText(/1 attempt remaining/i)).toBeInTheDocument();
  });
});

describe("PinStep — navigator.vibrate safety", () => {
  qaTest("jury.pin.04", () => {
    // Confirms PinStep renders without errors when navigator.vibrate is
    // undefined (e.g., Firefox, JSDOM). Covers the optional-chaining guard.
    const originalVibrate = navigator.vibrate;
    Object.defineProperty(navigator, "vibrate", {
      value: undefined,
      configurable: true,
    });

    expect(() => renderPin()).not.toThrow();

    Object.defineProperty(navigator, "vibrate", {
      value: originalVibrate,
      configurable: true,
    });
  });
});

describe("PinStep — lockout screen", () => {
  qaTest("jury.pin.02", () => {
    const future = new Date(Date.now() + 600_000).toISOString();
    renderPin({
      pinError:        "Too many login attempts",
      pinErrorCode:    "locked",
      pinLockedUntil:  future,
    });
    expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument();
    // PIN boxes should NOT be rendered in locked state
    expect(screen.queryByText(/verify pin/i)).not.toBeInTheDocument();
  });
});

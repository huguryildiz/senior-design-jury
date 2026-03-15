// src/jury/__tests__/GroupStatusPanel.test.jsx
// ============================================================
// GroupStatusPanel — retry action and error banner tests.
// Audit item: m-4
// ============================================================

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import GroupStatusPanel from "../GroupStatusPanel";

vi.mock("../../shared/Icons", () => ({
  CheckCircle2Icon:  "span",
  PencilIcon:        "span",
  LockIcon:          "span",
  TriangleAlertIcon: "span",
}));

const PID = "group-42";

const DEFAULT_PROPS = {
  pid:         PID,
  groupSynced: {},
  editMode:    false,
  lockActive:  false,
  saveStatus:  "idle",
  onRetry:     vi.fn(),
};

function renderPanel(overrides = {}) {
  return render(<GroupStatusPanel {...DEFAULT_PROPS} {...overrides} />);
}

describe("GroupStatusPanel — error banner", () => {
  qaTest("retry.panel.02", () => {
    renderPanel({ saveStatus: "idle" });
    expect(screen.queryByText(/retry/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/could not save/i)).not.toBeInTheDocument();
  });

  qaTest("retry.panel.01", () => {
    const onRetry = vi.fn();
    renderPanel({ saveStatus: "error", onRetry });

    expect(screen.getByText(/could not save/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onRetry).toHaveBeenCalledWith(PID);
  });
});

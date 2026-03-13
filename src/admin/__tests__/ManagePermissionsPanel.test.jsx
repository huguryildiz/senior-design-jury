import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, vi } from "vitest";
import ManagePermissionsPanel from "../ManagePermissionsPanel";
import { qaTest } from "../../test/qaTest.js";

const mkJuror = (overrides = {}) => ({
  juror_id: "j1",
  juror_name: "Alice",
  juror_inst: "EE",
  editEnabled: false,
  finalSubmittedAt: null,
  totalProjects: 6,
  completedProjects: 0,
  ...overrides,
});

const DEFAULT_PROPS = {
  settings: { evalLockActive: false },
  jurors: [],
  activeSemesterId: "s1",
  activeSemesterName: "2026 Spring",
  evalLockError: "",
  isMobile: false,
  isOpen: true,
  onToggle: vi.fn(),
  onRequestEvalLockChange: vi.fn().mockResolvedValue({}),
  onToggleEdit: vi.fn().mockResolvedValue({}),
  onForceCloseEdit: vi.fn().mockResolvedValue({}),
};

describe("ManagePermissionsPanel — canEnableEdit gate", () => {
  beforeEach(() => localStorage.clear());

  qaTest("perms.gate.01", () => {
    const juror = mkJuror({
      finalSubmittedAt: "2026-03-13T10:00:00Z",
      editEnabled: false,
      completedProjects: 6,
    });
    render(<ManagePermissionsPanel {...DEFAULT_PROPS} jurors={[juror]} />);
    expect(screen.getByLabelText("Unlock editing")).toBeInTheDocument();
  });

  qaTest("perms.gate.02", () => {
    const juror = mkJuror({
      finalSubmittedAt: "2026-03-13T10:00:00Z",
      editEnabled: false,
      completedProjects: 6,
    });
    render(
      <ManagePermissionsPanel
        {...DEFAULT_PROPS}
        settings={{ evalLockActive: true }}
        jurors={[juror]}
      />
    );
    // showActionControls = editEnabled || (isCompleted && !evalLockActive) = false || (true && false) = false
    expect(screen.queryByLabelText("Unlock editing")).toBeNull();
  });

  qaTest("perms.gate.03", () => {
    const juror = mkJuror({ finalSubmittedAt: null, editEnabled: false });
    render(<ManagePermissionsPanel {...DEFAULT_PROPS} jurors={[juror]} />);
    expect(screen.queryByLabelText("Unlock editing")).toBeNull();
  });
});

describe("ManagePermissionsPanel — lock eval toggle", () => {
  qaTest("perms.lock.01", () => {
    render(
      <ManagePermissionsPanel {...DEFAULT_PROPS} settings={{ evalLockActive: true }} />
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  qaTest("perms.lock.02", () => {
    const onRequestEvalLockChange = vi.fn().mockResolvedValue({});
    render(
      <ManagePermissionsPanel
        {...DEFAULT_PROPS}
        onRequestEvalLockChange={onRequestEvalLockChange}
      />
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onRequestEvalLockChange).toHaveBeenCalledWith(true);
  });
});

describe("ManagePermissionsPanel — Lock Editing (force close)", () => {
  qaTest("perms.forceclose.01", () => {
    const juror = mkJuror({
      editEnabled: true,
      finalSubmittedAt: "2026-03-13T10:00:00Z",
    });
    render(<ManagePermissionsPanel {...DEFAULT_PROPS} jurors={[juror]} />);
    expect(screen.getByLabelText("Lock editing")).toBeInTheDocument();
  });

  qaTest("perms.forceclose.02", async () => {
    const onForceCloseEdit = vi.fn().mockResolvedValue({});
    const juror = mkJuror({
      juror_id: "j1",
      editEnabled: true,
      finalSubmittedAt: "2026-03-13T10:00:00Z",
    });
    render(
      <ManagePermissionsPanel
        {...DEFAULT_PROPS}
        jurors={[juror]}
        onForceCloseEdit={onForceCloseEdit}
      />
    );
    fireEvent.click(screen.getByLabelText("Lock editing"));
    expect(onForceCloseEdit).toHaveBeenCalledWith(expect.objectContaining({ jurorId: "j1" }));
  });
});

describe("ManagePermissionsPanel — search", () => {
  beforeEach(() => localStorage.clear());

  qaTest("perms.search.01", () => {
    const juror = mkJuror({ juror_name: "Alice" });
    render(<ManagePermissionsPanel {...DEFAULT_PROPS} jurors={[juror]} />);
    fireEvent.change(screen.getByLabelText("Search jurors"), {
      target: { value: "ali" },
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  qaTest("perms.search.02", () => {
    const editing = mkJuror({
      juror_id: "j1",
      juror_name: "Alice",
      editEnabled: true,
      finalSubmittedAt: "2026-03-13T10:00:00Z",
    });
    const notEditing = mkJuror({
      juror_id: "j2",
      juror_name: "Bob",
      editEnabled: false,
      finalSubmittedAt: null,
    });
    render(
      <ManagePermissionsPanel {...DEFAULT_PROPS} jurors={[editing, notEditing]} />
    );
    fireEvent.change(screen.getByLabelText("Search jurors"), {
      target: { value: "lock editing" },
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  qaTest("perms.search.03", () => {
    const editing = mkJuror({
      juror_id: "j1",
      juror_name: "Alice",
      editEnabled: true,
      finalSubmittedAt: "2026-03-13T10:00:00Z",
    });
    const completed = mkJuror({
      juror_id: "j2",
      juror_name: "Bob",
      editEnabled: false,
      finalSubmittedAt: "2026-03-13T10:00:00Z",
    });
    render(
      <ManagePermissionsPanel {...DEFAULT_PROPS} jurors={[editing, completed]} />
    );
    fireEvent.change(screen.getByLabelText("Search jurors"), {
      target: { value: "unlock editing" },
    });
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});

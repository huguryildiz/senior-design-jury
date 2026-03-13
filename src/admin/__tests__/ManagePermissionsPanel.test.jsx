import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagePermissionsPanel from "../ManagePermissionsPanel";

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

  it("shows Unlock Editing button for a completed, non-editing juror", () => {
    const juror = mkJuror({
      finalSubmittedAt: "2026-03-13T10:00:00Z",
      editEnabled: false,
      completedProjects: 6,
    });
    render(<ManagePermissionsPanel {...DEFAULT_PROPS} jurors={[juror]} />);
    expect(screen.getByLabelText("Unlock editing")).toBeInTheDocument();
  });

  it("does not show Unlock Editing when evalLockActive is true", () => {
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

  it("does not show Unlock Editing when juror has not submitted (not completed)", () => {
    const juror = mkJuror({ finalSubmittedAt: null, editEnabled: false });
    render(<ManagePermissionsPanel {...DEFAULT_PROPS} jurors={[juror]} />);
    expect(screen.queryByLabelText("Unlock editing")).toBeNull();
  });
});

describe("ManagePermissionsPanel — lock eval toggle", () => {
  it("checkbox is checked when evalLockActive=true", () => {
    render(
      <ManagePermissionsPanel {...DEFAULT_PROPS} settings={{ evalLockActive: true }} />
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("calls onRequestEvalLockChange(true) when unchecked checkbox is clicked", () => {
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
  it("shows Lock Editing button when juror is in edit mode", () => {
    const juror = mkJuror({
      editEnabled: true,
      finalSubmittedAt: "2026-03-13T10:00:00Z",
    });
    render(<ManagePermissionsPanel {...DEFAULT_PROPS} jurors={[juror]} />);
    expect(screen.getByLabelText("Lock editing")).toBeInTheDocument();
  });

  it("calls onForceCloseEdit with jurorId when Lock Editing is clicked", async () => {
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

  it("shows juror matching name substring", () => {
    const juror = mkJuror({ juror_name: "Alice" });
    render(<ManagePermissionsPanel {...DEFAULT_PROPS} jurors={[juror]} />);
    fireEvent.change(screen.getByLabelText("Search jurors"), {
      target: { value: "ali" },
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it('"lock editing" query matches only jurors in edit mode', () => {
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

  it('"unlock editing" query matches only completed jurors not in edit mode', () => {
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

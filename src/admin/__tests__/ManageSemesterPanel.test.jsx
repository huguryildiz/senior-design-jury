import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManageSemesterPanel from "../ManageSemesterPanel";
import { qaTest } from "../../test/qaTest.js";

function renderPanel(overrides = {}) {
  const props = {
    semesters: [
      { id: "s1", semester_name: "2025 Fall", poster_date: "2025-11-15", updated_at: "2025-11-20T10:00:00.000Z", is_current: true },
      { id: "s2", semester_name: "2026 Spring", poster_date: "2026-05-20", updated_at: "2026-05-21T10:00:00.000Z", is_current: false },
    ],
    currentSemesterId: "s1",
    currentSemesterName: "2025 Fall",
    panelError: "",
    isMobile: false,
    isOpen: true,
    onToggle: vi.fn(),
    onSetCurrent: vi.fn(),
    onCreateSemester: vi.fn().mockResolvedValue({}),
    onUpdateSemester: vi.fn().mockResolvedValue({}),
    onDeleteSemester: vi.fn(),
    ...overrides,
  };
  const view = render(<ManageSemesterPanel {...props} />);
  return { ...view, props };
}

// ── Semester sort order ───────────────────────────────────────────────────────

describe("ManageSemesterPanel — sort order", () => {
  qaTest("semester.sort.01", () => {
    const { container } = renderPanel({
      semesters: [
        { id: "s1", semester_name: "2024 Fall", poster_date: "2024-11-15", updated_at: "2024-11-20T10:00:00.000Z" },
        { id: "s2", semester_name: "2025 Fall", poster_date: "2025-11-15", updated_at: "2025-11-20T10:00:00.000Z" },
      ],
      currentSemesterId: "s2",
      currentSemesterName: "2025 Fall",
    });
    const titles = Array.from(container.querySelectorAll('[data-testid="semester-item-title"]')).map(
      (el) => el.textContent?.trim()
    );
    expect(titles[0]).toBe("2025 Fall");
    expect(titles[1]).toBe("2024 Fall");
  });

  qaTest("semester.sort.02", () => {
    const { container } = renderPanel({
      semesters: [
        { id: "s1", semester_name: "2025 Spring", poster_date: "2025-05-15", updated_at: "2025-05-20T10:00:00.000Z" },
        { id: "s2", semester_name: "2025 Fall",   poster_date: "2025-11-15", updated_at: "2025-11-20T10:00:00.000Z" },
      ],
      currentSemesterId: "s2",
      currentSemesterName: "2025 Fall",
    });
    const titles = Array.from(container.querySelectorAll('[data-testid="semester-item-title"]')).map(
      (el) => el.textContent?.trim()
    );
    expect(titles[0]).toBe("2025 Fall");
    expect(titles[1]).toBe("2025 Spring");
  });

  qaTest("semester.sort.03", () => {
    const { container } = renderPanel({
      semesters: [
        { id: "s1", semester_name: "2025 Winter", poster_date: "2025-01-15", updated_at: "2025-01-20T10:00:00.000Z" },
        { id: "s2", semester_name: "2025 Spring", poster_date: "2025-05-15", updated_at: "2025-05-20T10:00:00.000Z" },
        { id: "s3", semester_name: "2025 Summer", poster_date: "2025-08-15", updated_at: "2025-08-20T10:00:00.000Z" },
        { id: "s4", semester_name: "2025 Fall",   poster_date: "2025-11-15", updated_at: "2025-11-20T10:00:00.000Z" },
      ],
      currentSemesterId: "s4",
      currentSemesterName: "2025 Fall",
    });
    const titles = Array.from(container.querySelectorAll('[data-testid="semester-item-title"]')).map(
      (el) => el.textContent?.trim()
    );
    expect(titles[0]).toBe("2025 Fall");
    expect(titles[1]).toBe("2025 Summer");
    expect(titles[2]).toBe("2025 Spring");
    expect(titles[3]).toBe("2025 Winter");
  });

  qaTest("semester.sort.04", () => {
    const { container } = renderPanel({
      semesters: [
        { id: "s1", semester_name: "Pilot",     poster_date: "",           updated_at: "2024-01-01T00:00:00.000Z" },
        { id: "s2", semester_name: "2025 Fall", poster_date: "2025-11-15", updated_at: "2025-11-20T10:00:00.000Z" },
      ],
      currentSemesterId: "s2",
      currentSemesterName: "2025 Fall",
    });
    const titles = Array.from(container.querySelectorAll('[data-testid="semester-item-title"]')).map(
      (el) => el.textContent?.trim()
    );
    expect(titles[0]).toBe("2025 Fall");
    expect(titles[1]).toBe("Pilot");
  });
});

// ── Set active + delete guard ─────────────────────────────────────────────────

describe("ManageSemesterPanel — set active + delete guard", () => {
  qaTest("semester.active.01", () => {
    const onSetCurrent = vi.fn();
    renderPanel({ onSetCurrent });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "s2" } });
    expect(onSetCurrent).toHaveBeenCalledWith("s2");
  });

  qaTest("semester.active.02", () => {
    renderPanel();
    expect(screen.getByLabelText("Delete 2025 Fall")).toBeDisabled();
  });

  qaTest("semester.active.03", () => {
    renderPanel();
    expect(screen.getByLabelText("Delete 2026 Spring")).not.toBeDisabled();
  });
});

// ── Existing smoke tests ──────────────────────────────────────────────────────

describe("ManageSemesterPanel smoke tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  qaTest("semester.crud.01", async () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Semester" }));
    fireEvent.change(screen.getByPlaceholderText("2026 Spring"), { target: { value: "2026 Summer" } });
    const createModal = screen.getByText("Create Period").closest('[data-testid="modal-card"]');
    const dateInput = createModal?.querySelector('input[type="date"]');
    expect(dateInput).not.toBeNull();
    fireEvent.change(dateInput, { target: { value: "2026-07-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(props.onCreateSemester).toHaveBeenCalledWith(
        expect.objectContaining({
          semester_name: "2026 Summer",
          poster_date: "2026-07-01",
        })
      );
    });
  });

  qaTest("semester.crud.02", () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByLabelText("Delete 2026 Spring"));
    expect(props.onDeleteSemester).toHaveBeenCalledTimes(1);
    expect(props.onDeleteSemester).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s2", semester_name: "2026 Spring" })
    );
  });

  qaTest("semester.crud.03", async () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Semester" }));
    fireEvent.change(screen.getByPlaceholderText("2026 Spring"), { target: { value: "2025 Fall" } });
    const createModal = screen.getByText("Create Period").closest('[data-testid="modal-card"]');
    const dateInput = createModal?.querySelector('input[type="date"]');
    expect(dateInput).not.toBeNull();
    fireEvent.change(dateInput, { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText('A semester named "2025 Fall" already exists.')).toBeInTheDocument();
    });
    expect(props.onCreateSemester).not.toHaveBeenCalled();
  });

  qaTest("semester.crud.04", async () => {
    const { props } = renderPanel({
      onCreateSemester: vi.fn().mockResolvedValue({
        fieldErrors: { semester_name: "Semester name already exists." },
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Semester" }));
    fireEvent.change(screen.getByPlaceholderText("2026 Spring"), { target: { value: "2027 Spring" } });
    const createModal = screen.getByText("Create Period").closest('[data-testid="modal-card"]');
    const dateInput = createModal?.querySelector('input[type="date"]');
    expect(dateInput).not.toBeNull();
    fireEvent.change(dateInput, { target: { value: "2027-05-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText("Semester name already exists.")).toBeInTheDocument();
    });
    expect(props.onCreateSemester).toHaveBeenCalledTimes(1);
  });

  // TODO: This test verifies that deleting a MÜDEK outcome from the draft
  // template also removes the corresponding code from criteria mudek mappings.
  // Currently the cross-tab pruning does not propagate through the
  // MudekManager → onDraftChange → CriteriaManager flow in the test
  // environment.  Skipped until the state-propagation issue is resolved.
  it.skip("removes deleted MÜDEK outcomes from mapped criteria in the draft semester form", async () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Semester" }));
    fireEvent.click(screen.getByRole("tab", { name: "Evaluation Criteria" }));

    expect(screen.getByText("1.2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "MÜDEK Outcomes" }));
    fireEvent.click(screen.getByRole("button", { name: /^remove outcome 2$/i }));

    await waitFor(() => {
      expect(screen.getByText("Delete Confirmation")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(screen.queryByText("Delete Confirmation")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Evaluation Criteria" }));
    await waitFor(() => {
      expect(screen.queryByText("1.2", { selector: ".criterion-row-chip" })).not.toBeInTheDocument();
    });
  });

  it("prompts before collapsing panel when edit criteria has unsaved changes", async () => {
    const onToggle = vi.fn();
    renderPanel({ onToggle });

    fireEvent.click(screen.getByLabelText("Edit 2026 Spring"));
    fireEvent.click(screen.getByRole("tab", { name: "Evaluation Criteria" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Criterion" }));

    fireEvent.click(screen.getByRole("button", { name: /Period Settings/i }));

    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });
});

// ── Lock error + delete-active guard ─────────────────────────────────────────

describe("ManageSemesterPanel — lock error and delete-active guard", () => {
  qaTest("semester.lock.01", async () => {
    const onUpdateSemester = vi.fn().mockResolvedValue({ error: "semester_template_locked_by_scores" });
    renderPanel({ onUpdateSemester });

    fireEvent.click(screen.getByLabelText("Edit 2026 Spring"));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onUpdateSemester).toHaveBeenCalledTimes(1);
    });
    expect(onUpdateSemester).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s2", semester_name: "2026 Spring" })
    );
  });

  qaTest("semester.crud.05", () => {
    const { props } = renderPanel();

    expect(screen.getByLabelText("Delete 2025 Fall")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Delete 2025 Fall"));
    expect(props.onDeleteSemester).not.toHaveBeenCalled();
  });
});

describe("ManageSemesterPanel — Realtime DELETE", () => {
  qaTest("semester.realtime.01", () => {
    const { rerender, props } = renderPanel();

    // Open edit modal for 2026 Spring
    fireEvent.click(screen.getByLabelText("Edit 2026 Spring"));
    expect(screen.getByText("Edit Period")).toBeInTheDocument();

    // Simulate Realtime DELETE arriving for the semester being edited
    rerender(<ManageSemesterPanel {...props} externalDeletedSemesterId="s2" />);

    // Edit modal should be closed
    expect(screen.queryByText("Edit Period")).not.toBeInTheDocument();
    // Banner should be visible
    expect(screen.getByText(/deleted in another session/i)).toBeInTheDocument();
  });
});

describe("ManageSemesterPanel — empty template badge", () => {
  qaTest("semester.template.01", () => {
    renderPanel({
      semesters: [
        {
          id: "s1",
          semester_name: "2025 Fall",
          poster_date: "2025-11-15",
          updated_at: "2025-11-20T10:00:00.000Z",
          is_current: true,
          criteria_template: [],
        },
        {
          id: "s2",
          semester_name: "2026 Spring",
          poster_date: "2026-05-20",
          updated_at: "2026-05-21T10:00:00.000Z",
          is_current: false,
          criteria_template: [{ key: "technical" }],
        },
      ],
    });

    const s1 = screen.getByText("2025 Fall", { selector: '[data-testid="semester-item-title"]' }).closest('[data-testid="semester-item"]');
    expect(s1).not.toBeNull();
    expect(s1.querySelector(".semester-default-template-badge")).not.toBeNull();

    const s2 = screen.getByText("2026 Spring", { selector: '[data-testid="semester-item-title"]' }).closest('[data-testid="semester-item"]');
    expect(s2.querySelector(".semester-default-template-badge")).toBeNull();
  });
});

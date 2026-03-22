import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManageSemesterPanel from "../ManageSemesterPanel";
import { qaTest } from "../../test/qaTest.js";

function renderPanel(overrides = {}) {
  const props = {
    semesters: [
      { id: "s1", name: "2025 Fall", poster_date: "2025-11-15", updated_at: "2025-11-20T10:00:00.000Z", is_active: true },
      { id: "s2", name: "2026 Spring", poster_date: "2026-05-20", updated_at: "2026-05-21T10:00:00.000Z", is_active: false },
    ],
    activeSemesterId: "s1",
    activeSemesterName: "2025 Fall",
    panelError: "",
    isMobile: false,
    isOpen: true,
    onToggle: vi.fn(),
    onSetActive: vi.fn(),
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
        { id: "s1", name: "2024 Fall", poster_date: "2024-11-15", updated_at: "2024-11-20T10:00:00.000Z" },
        { id: "s2", name: "2025 Fall", poster_date: "2025-11-15", updated_at: "2025-11-20T10:00:00.000Z" },
      ],
      activeSemesterId: "s2",
      activeSemesterName: "2025 Fall",
    });
    const titles = Array.from(container.querySelectorAll(".manage-item-title")).map(
      (el) => el.textContent?.trim()
    );
    expect(titles[0]).toBe("2025 Fall");
    expect(titles[1]).toBe("2024 Fall");
  });

  qaTest("semester.sort.02", () => {
    const { container } = renderPanel({
      semesters: [
        { id: "s1", name: "2025 Spring", poster_date: "2025-05-15", updated_at: "2025-05-20T10:00:00.000Z" },
        { id: "s2", name: "2025 Fall",   poster_date: "2025-11-15", updated_at: "2025-11-20T10:00:00.000Z" },
      ],
      activeSemesterId: "s2",
      activeSemesterName: "2025 Fall",
    });
    const titles = Array.from(container.querySelectorAll(".manage-item-title")).map(
      (el) => el.textContent?.trim()
    );
    expect(titles[0]).toBe("2025 Fall");
    expect(titles[1]).toBe("2025 Spring");
  });

  qaTest("semester.sort.03", () => {
    const { container } = renderPanel({
      semesters: [
        { id: "s1", name: "2025 Winter", poster_date: "2025-01-15", updated_at: "2025-01-20T10:00:00.000Z" },
        { id: "s2", name: "2025 Spring", poster_date: "2025-05-15", updated_at: "2025-05-20T10:00:00.000Z" },
        { id: "s3", name: "2025 Summer", poster_date: "2025-08-15", updated_at: "2025-08-20T10:00:00.000Z" },
        { id: "s4", name: "2025 Fall",   poster_date: "2025-11-15", updated_at: "2025-11-20T10:00:00.000Z" },
      ],
      activeSemesterId: "s4",
      activeSemesterName: "2025 Fall",
    });
    const titles = Array.from(container.querySelectorAll(".manage-item-title")).map(
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
        { id: "s1", name: "Pilot",     poster_date: "",           updated_at: "2024-01-01T00:00:00.000Z" },
        { id: "s2", name: "2025 Fall", poster_date: "2025-11-15", updated_at: "2025-11-20T10:00:00.000Z" },
      ],
      activeSemesterId: "s2",
      activeSemesterName: "2025 Fall",
    });
    const titles = Array.from(container.querySelectorAll(".manage-item-title")).map(
      (el) => el.textContent?.trim()
    );
    expect(titles[0]).toBe("2025 Fall");
    expect(titles[1]).toBe("Pilot");
  });
});

// ── Set active + delete guard ─────────────────────────────────────────────────

describe("ManageSemesterPanel — set active + delete guard", () => {
  qaTest("semester.active.01", () => {
    const onSetActive = vi.fn();
    renderPanel({ onSetActive });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "s2" } });
    expect(onSetActive).toHaveBeenCalledWith("s2");
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
    const createModal = screen.getByText("Create Semester").closest(".manage-modal-card");
    const dateInput = createModal?.querySelector('input[type="date"]');
    expect(dateInput).not.toBeNull();
    fireEvent.change(dateInput, { target: { value: "2026-07-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(props.onCreateSemester).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "2026 Summer",
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
      expect.objectContaining({ id: "s2", name: "2026 Spring" })
    );
  });

  qaTest("semester.crud.03", async () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Semester" }));
    fireEvent.change(screen.getByPlaceholderText("2026 Spring"), { target: { value: "2025 Fall" } });
    const createModal = screen.getByText("Create Semester").closest(".manage-modal-card");
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
        fieldErrors: { name: "Semester name already exists." },
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Semester" }));
    fireEvent.change(screen.getByPlaceholderText("2026 Spring"), { target: { value: "2027 Spring" } });
    const createModal = screen.getByText("Create Semester").closest(".manage-modal-card");
    const dateInput = createModal?.querySelector('input[type="date"]');
    expect(dateInput).not.toBeNull();
    fireEvent.change(dateInput, { target: { value: "2027-05-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText("Semester name already exists.")).toBeInTheDocument();
    });
    expect(props.onCreateSemester).toHaveBeenCalledTimes(1);
  });

  it("removes deleted MÜDEK outcomes from mapped criteria in the draft semester form", async () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Semester" }));
    fireEvent.click(screen.getByRole("tab", { name: "Evaluation Criteria" }));

    expect(screen.getByText("1.2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "MÜDEK Outcomes" }));
    fireEvent.click(screen.getByRole("button", { name: /remove outcome 2/i }));

    await waitFor(() => {
      expect(screen.getByText("Delete Confirmation")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(screen.queryByText("1.2", { selector: ".criterion-row-chip" })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save MÜDEK Outcomes" }));
    fireEvent.click(screen.getByRole("tab", { name: "Evaluation Criteria" }));
    await waitFor(() => {
      expect(screen.queryByText("1.2", { selector: ".criterion-row-chip" })).not.toBeInTheDocument();
    });
  });
});

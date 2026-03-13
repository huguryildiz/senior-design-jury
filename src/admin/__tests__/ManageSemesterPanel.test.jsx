import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManageSemesterPanel from "../ManageSemesterPanel";

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

describe("ManageSemesterPanel smoke tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates semester with valid input", async () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Semester" }));
    fireEvent.change(screen.getByPlaceholderText("2026 Spring"), { target: { value: "2026 Summer" } });
    const createModal = screen.getByText("Create Semester").closest(".manage-modal-card");
    const dateInput = createModal?.querySelector('input[type="date"]');
    expect(dateInput).not.toBeNull();
    fireEvent.change(dateInput, { target: { value: "2026-07-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(props.onCreateSemester).toHaveBeenCalledWith({
        name: "2026 Summer",
        poster_date: "2026-07-01",
      });
    });
  });

  it("calls delete callback for non-active semester", () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByLabelText("Delete 2026 Spring"));
    expect(props.onDeleteSemester).toHaveBeenCalledTimes(1);
    expect(props.onDeleteSemester).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s2", name: "2026 Spring" })
    );
  });

  it("does not submit duplicate semester name", async () => {
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

  it("shows create field error from API response", async () => {
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
});

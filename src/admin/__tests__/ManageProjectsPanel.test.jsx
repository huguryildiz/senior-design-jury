import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManageProjectsPanel from "../ManageProjectsPanel";

const DEFAULT_PROPS = {
  projects: [],
  semesterName: "2026 Spring",
  activeSemesterId: "s1",
  activeSemesterName: "2026 Spring",
  semesterOptions: [{ id: "s1", name: "2026 Spring" }],
  panelError: "",
  isMobile: false,
  isOpen: true,
  onToggle: vi.fn(),
  onImport: vi.fn().mockResolvedValue({}),
  onAddGroup: vi.fn().mockResolvedValue({}),
  onEditGroup: vi.fn().mockResolvedValue({}),
  onDeleteProject: vi.fn(),
};

async function openImportAndGetInput(container) {
  fireEvent.click(screen.getByRole("button", { name: /import csv/i }));
  await waitFor(() => expect(container.querySelector('input[type="file"]')).not.toBeNull());
  return container.querySelector('input[type="file"]');
}

async function uploadFile(container, file) {
  const input = await openImportAndGetInput(container);
  fireEvent.change(input, { target: { files: [file] } });
}

function makeCSV(...lines) {
  return lines.join("\n") + "\n";
}

describe("ManageProjectsPanel — CSV import validation", () => {
  beforeEach(() => localStorage.clear());

  it("shows error when file exceeds 2MB [Fix 6 regression]", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const content = "a".repeat(3 * 1024 * 1024);
    const bigFile = new File([content], "big.csv", { type: "text/csv" });
    await uploadFile(container, bigFile);
    await waitFor(() => {
      expect(screen.getByText(/file is too large/i)).toBeInTheDocument();
    });
  });

  it("shows error when required header columns are missing", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("no,project,students", "1,Project A,Alice");
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/header row is required/i)).toBeInTheDocument();
    });
  });

  it("shows error when group_no is zero", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("group_no,project_title,group_students", "0,Project A,Alice");
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/invalid group_no/i)).toBeInTheDocument();
    });
  });

  it("shows error when group_no is negative", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("group_no,project_title,group_students", "-1,Project A,Alice");
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/invalid group_no/i)).toBeInTheDocument();
    });
  });

  it("shows error when group_no is non-numeric", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("group_no,project_title,group_students", "abc,Project A,Alice");
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/invalid group_no/i)).toBeInTheDocument();
    });
  });

  it("warns about invalid separator when students are comma-separated in CSV field", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    // Quoted field with comma inside — parseCsv treats it as one field but contains comma
    const csv = `group_no,project_title,group_students\n1,Project A,"Alice, Bob"\n`;
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/invalid student separator/i)).toBeInTheDocument();
    });
  });

  it("shows error for duplicate group_no within the same CSV", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV(
      "group_no,project_title,group_students",
      "1,Project A,Alice",
      "1,Project B,Bob"
    );
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/duplicate group_no/i)).toBeInTheDocument();
    });
  });

  it("accepts valid semicolon-separated students (quoted CSV field)", async () => {
    const onImport = vi.fn().mockResolvedValue({});
    const { container } = render(
      <ManageProjectsPanel {...DEFAULT_PROPS} onImport={onImport} />
    );
    // Semicolons must be quoted — parseCsv treats unquoted ; as a column delimiter
    const csv = `group_no,project_title,group_students\n1,Project A,"Alice; Bob"\n`;
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    // No error should be shown
    expect(screen.queryByText(/invalid group_no/i)).toBeNull();
    expect(screen.queryByText(/file is too large/i)).toBeNull();
  });
});

describe("ManageProjectsPanel — CRUD smoke tests", () => {
  beforeEach(() => localStorage.clear());

  it("calls onDeleteProject when delete is clicked", () => {
    const project = { id: "p1", group_no: 1, project_title: "Project A", group_students: "Alice" };
    const onDeleteProject = vi.fn();
    render(
      <ManageProjectsPanel {...DEFAULT_PROPS} projects={[project]} onDeleteProject={onDeleteProject} />
    );
    fireEvent.click(screen.getByLabelText(/delete group 1/i));
    expect(onDeleteProject).toHaveBeenCalledTimes(1);
    expect(onDeleteProject).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1" }),
      expect.anything()
    );
  });
});

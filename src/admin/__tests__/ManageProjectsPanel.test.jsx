import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, vi } from "vitest";
import ManageProjectsPanel from "../ManageProjectsPanel";
import { qaTest } from "../../test/qaTest.js";

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

  qaTest("groups.csv.01", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const content = "a".repeat(3 * 1024 * 1024);
    const bigFile = new File([content], "big.csv", { type: "text/csv" });
    await uploadFile(container, bigFile);
    await waitFor(() => {
      expect(screen.getByText(/file is too large/i)).toBeInTheDocument();
    });
  });

  qaTest("groups.csv.02", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("no,project,students", "1,Project A,Alice");
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/header row is required/i)).toBeInTheDocument();
    });
  });

  qaTest("groups.csv.03", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("group_no,project_title,group_students", "0,Project A,Alice");
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/invalid group_no/i)).toBeInTheDocument();
    });
  });

  qaTest("groups.csv.04", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("group_no,project_title,group_students", "-1,Project A,Alice");
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/invalid group_no/i)).toBeInTheDocument();
    });
  });

  qaTest("groups.csv.05", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("group_no,project_title,group_students", "abc,Project A,Alice");
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/invalid group_no/i)).toBeInTheDocument();
    });
  });

  qaTest("groups.csv.06", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    // Quoted field with comma inside — parseCsv treats it as one field but contains comma
    const csv = `group_no,project_title,group_students\n1,Project A,"Alice, Bob"\n`;
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/invalid student separator/i)).toBeInTheDocument();
    });
  });

  qaTest("groups.csv.07", async () => {
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

  qaTest("groups.csv.08", async () => {
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

describe("ManageProjectsPanel — import summary", () => {
  beforeEach(() => localStorage.clear());

  qaTest("groups.csv.summary.01", async () => {
    const existing = [
      { id: "p1", group_no: 1, project_title: "Existing Project", group_students: "Alice" },
    ];
    const onImport = vi.fn().mockResolvedValue({});
    const { container } = render(
      <ManageProjectsPanel {...DEFAULT_PROPS} projects={existing} onImport={onImport} />
    );
    // CSV: group 1 already exists (will be skipped), group 2 is new (will be added)
    const csv = makeCSV(
      "group_no,project_title,group_students",
      "1,Old Project,Alice",
      "2,New Project,Bob"
    );
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    const input = await openImportAndGetInput(container);
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText(/import complete/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 added/i)).toBeInTheDocument();
    expect(screen.getByText(/1 skipped/i)).toBeInTheDocument();
  });
});

describe("ManageProjectsPanel — edit modal safety", () => {
  beforeEach(() => localStorage.clear());

  qaTest("groups.edit.01", async () => {
    const onEditGroup = vi.fn(async () => ({ ok: false, message: "Network error" }));
    render(
      <ManageProjectsPanel
        {...DEFAULT_PROPS}
        projects={[{ id: "p1", group_no: 1, project_title: "Test", group_students: "Alice", semester_id: "s1" }]}
        onEditGroup={onEditGroup}
      />
    );
    // Open edit modal
    fireEvent.click(screen.getByLabelText(/edit group 1/i));
    await waitFor(() => expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument());
    // Click save
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(onEditGroup).toHaveBeenCalled());
    // Modal must still be open (Save button still present)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });
    // In-modal error must appear
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});

describe("ManageProjectsPanel — group_no upper bound validation", () => {
  beforeEach(() => localStorage.clear());

  qaTest("groups.csv.09", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV(
      "group_no,project_title,group_students",
      "1000,Project A,Alice"
    );
    const file = new File([csv], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/invalid group_no/i)).toBeInTheDocument();
    });
  });

  qaTest("groups.create.01", async () => {
    render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    // Open the add group form — use exact name to avoid matching "Group Settings" header
    fireEvent.click(screen.getByRole("button", { name: /^group$/i }));
    // Group number input has placeholder "1"
    await waitFor(() => expect(screen.getByPlaceholderText("1")).toBeInTheDocument());
    // Fill in group_no > 999
    fireEvent.change(screen.getByPlaceholderText("1"), { target: { value: "1000" } });
    // Fill in required project title
    fireEvent.change(screen.getByPlaceholderText(/smart traffic/i), { target: { value: "Test Project" } });
    // Fill in required student name (first student placeholder is "Ali Yilmaz")
    fireEvent.change(screen.getByPlaceholderText(/ali yilmaz/i), { target: { value: "Alice" } });
    // Save button in add form is labeled "Create"
    await waitFor(() => expect(screen.getByRole("button", { name: /create/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    await waitFor(() => {
      expect(screen.getByText(/between 1 and 999/i)).toBeInTheDocument();
    });
  });
});

describe("ManageProjectsPanel — import flow hardening", () => {
  beforeEach(() => localStorage.clear());

  qaTest("groups.import.02", async () => {
    const { container } = render(<ManageProjectsPanel {...DEFAULT_PROPS} />);
    const file = new File([""], "groups.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/empty|no valid rows|nothing to import/i)).toBeInTheDocument();
    });
  });
});

describe("ManageProjectsPanel — delete guard", () => {
  beforeEach(() => localStorage.clear());

  qaTest("groups.delete.02", () => {
    const onDeleteProject = vi.fn();
    render(
      <ManageProjectsPanel
        {...DEFAULT_PROPS}
        // project without server-confirmed id
        projects={[{ group_no: 1, project_title: "No-ID Group", group_students: "Alice", semester_id: "s1" }]}
        onDeleteProject={onDeleteProject}
      />
    );
    fireEvent.click(screen.getByLabelText(/delete group 1/i));
    // onDeleteProject must NOT be called when id is missing
    expect(onDeleteProject).not.toHaveBeenCalled();
    // Panel error must appear
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("ManageProjectsPanel — CRUD smoke tests", () => {
  beforeEach(() => localStorage.clear());

  qaTest("groups.crud.01", () => {
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

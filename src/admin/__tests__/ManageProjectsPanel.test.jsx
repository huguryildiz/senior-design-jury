import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, vi } from "vitest";
import ManageProjectsPanel from "../ManageProjectsPanel";
import { qaTest } from "../../test/qaTest.js";
import { act } from "react";

const DEFAULT_PROPS = {
  projects: [],
  semesterName: "2026 Spring",
  currentSemesterId: "s1",
  semesterOptions: [{ id: "s1", semester_name: "2026 Spring" }],
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
    // Open actions dropdown then click Edit
    const table = screen.getByRole("table");
    fireEvent.click(within(table).getByRole("button", { name: "Actions" }));
    await waitFor(() => screen.getByRole("menuitem", { name: /edit/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /edit/i }));
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

  qaTest("groups.delete.02", async () => {
    const onDeleteProject = vi.fn();
    render(
      <ManageProjectsPanel
        {...DEFAULT_PROPS}
        // project without server-confirmed id
        projects={[{ group_no: 1, project_title: "No-ID Group", group_students: "Alice", semester_id: "s1" }]}
        onDeleteProject={onDeleteProject}
      />
    );
    // Open actions dropdown then click Delete
    const table = screen.getByRole("table");
    fireEvent.click(within(table).getByRole("button", { name: "Actions" }));
    await waitFor(() => screen.getByRole("menuitem", { name: /delete/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));
    // onDeleteProject must NOT be called when id is missing
    expect(onDeleteProject).not.toHaveBeenCalled();
    // Panel error must appear
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("ManageProjectsPanel — CRUD smoke tests", () => {
  beforeEach(() => localStorage.clear());

  qaTest("groups.crud.01", async () => {
    const project = { id: "p1", group_no: 1, project_title: "Project A", group_students: "Alice" };
    const onDeleteProject = vi.fn();
    render(
      <ManageProjectsPanel {...DEFAULT_PROPS} projects={[project]} onDeleteProject={onDeleteProject} />
    );
    // Open actions dropdown then click Delete
    const table = screen.getByRole("table");
    fireEvent.click(within(table).getByRole("button", { name: "Actions" }));
    await waitFor(() => screen.getByRole("menuitem", { name: /delete/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));
    expect(onDeleteProject).toHaveBeenCalledTimes(1);
    expect(onDeleteProject).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1" }),
      expect.anything()
    );
  });
});

describe("ManageProjectsPanel — stale edit conflict", () => {
  beforeEach(() => localStorage.clear());

  qaTest("groups.stale.01", async () => {
    const project = {
      id: "p1",
      group_no: 1,
      project_title: "Test",
      group_students: "Alice",
      semester_id: "s1",
      updated_at: "2024-01-01T00:00:00Z",
    };
    const onEditGroup = vi.fn().mockResolvedValue({ ok: true });
    const { rerender } = render(
      <ManageProjectsPanel {...DEFAULT_PROPS} projects={[project]} onEditGroup={onEditGroup} />
    );
    // Open actions dropdown then click Edit
    const table = screen.getByRole("table");
    fireEvent.click(within(table).getByRole("button", { name: "Actions" }));
    await waitFor(() => screen.getByRole("menuitem", { name: /edit/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /edit/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument());
    // Simulate external update: project updated_at changes while modal is open
    const updatedProject = { ...project, updated_at: "2024-01-02T00:00:00Z" };
    await act(async () => {
      rerender(<ManageProjectsPanel {...DEFAULT_PROPS} projects={[updatedProject]} onEditGroup={onEditGroup} />);
    });
    // Try to save — should be blocked
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByText(/updated elsewhere/i)).toBeInTheDocument();
    });
    expect(onEditGroup).not.toHaveBeenCalled();
  });
});

describe("ManageProjectsPanel — external delete during edit", () => {
  beforeEach(() => localStorage.clear());

  qaTest("groups.delete.03", async () => {
    const project = {
      id: "p1",
      group_no: 1,
      project_title: "Test",
      group_students: "Alice",
      semester_id: "s1",
    };
    const { rerender } = render(
      <ManageProjectsPanel {...DEFAULT_PROPS} projects={[project]} />
    );
    // Open actions dropdown then click Edit
    const table = screen.getByRole("table");
    fireEvent.click(within(table).getByRole("button", { name: "Actions" }));
    await waitFor(() => screen.getByRole("menuitem", { name: /edit/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /edit/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument());
    // Simulate external delete: project disappears from list
    await act(async () => {
      rerender(<ManageProjectsPanel {...DEFAULT_PROPS} projects={[]} />);
    });
    // Modal must be closed
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    });
    // Panel-level error must appear
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/deleted elsewhere/i)).toBeInTheDocument();
  });
});

describe("ManageProjectsPanel — no semesters create UX", () => {
  beforeEach(() => localStorage.clear());

  qaTest("groups.create.02", async () => {
    render(<ManageProjectsPanel {...DEFAULT_PROPS} semesterOptions={[]} />);
    // Open the add group form
    fireEvent.click(screen.getByRole("button", { name: /^group$/i }));
    await waitFor(() => {
      expect(screen.getByText(/no semesters exist/i)).toBeInTheDocument();
    });
  });
});

describe("ManageProjectsPanel — retry button", () => {
  beforeEach(() => localStorage.clear());

  qaTest("groups.retry.01", () => {
    const onRetry = vi.fn();
    render(
      <ManageProjectsPanel
        {...DEFAULT_PROPS}
        panelError="Could not load groups."
        onRetry={onRetry}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManageJurorsPanel from "../ManageJurorsPanel";

const DEFAULT_PROPS = {
  jurors: [],
  panelError: "",
  isMobile: false,
  isOpen: true,
  onToggle: vi.fn(),
  onImport: vi.fn().mockResolvedValue({}),
  onAddJuror: vi.fn().mockResolvedValue({}),
  onEditJuror: vi.fn().mockResolvedValue({}),
  onResetPin: vi.fn(),
  onDeleteJuror: vi.fn(),
};

/** Opens the import CSV section and returns the hidden file input element. */
async function openImportAndGetInput(container) {
  fireEvent.click(screen.getByRole("button", { name: /import csv/i }));
  await waitFor(() => expect(container.querySelector('input[type="file"]')).not.toBeNull());
  return container.querySelector('input[type="file"]');
}

/** Fires a file-change event on the file input with the given File object. */
async function uploadFile(container, file) {
  const input = await openImportAndGetInput(container);
  fireEvent.change(input, { target: { files: [file] } });
}

function makeCSV(...lines) {
  return lines.join("\n") + "\n";
}

describe("ManageJurorsPanel — CSV import validation", () => {
  beforeEach(() => localStorage.clear());

  it("shows error when file exceeds 2MB [Fix 6 regression]", async () => {
    const { container } = render(<ManageJurorsPanel {...DEFAULT_PROPS} />);
    const content = "a".repeat(3 * 1024 * 1024); // 3MB
    const bigFile = new File([content], "big.csv", { type: "text/csv" });
    await uploadFile(container, bigFile);
    await waitFor(() => {
      expect(screen.getByText(/file is too large/i)).toBeInTheDocument();
    });
  });

  it("shows error when required header columns are missing", async () => {
    const { container } = render(<ManageJurorsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("name,institution", "Alice,EE");
    const file = new File([csv], "jurors.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/header row is required/i)).toBeInTheDocument();
    });
  });

  it("shows error when juror_name is blank", async () => {
    const { container } = render(<ManageJurorsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("juror_name,juror_inst", ",EE");
    const file = new File([csv], "jurors.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/missing juror_name/i)).toBeInTheDocument();
    });
  });

  it("shows error when juror_inst is blank", async () => {
    const { container } = render(<ManageJurorsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("juror_name,juror_inst", "Alice,");
    const file = new File([csv], "jurors.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/missing juror_inst/i)).toBeInTheDocument();
    });
  });

  it("shows error when same juror appears twice in the CSV", async () => {
    const { container } = render(<ManageJurorsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("juror_name,juror_inst", "Alice,EE", "Alice,EE");
    const file = new File([csv], "jurors.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/duplicate juror rows/i)).toBeInTheDocument();
    });
  });

  it("treats existing system jurors as a warning, not an error", async () => {
    const existing = [{ juror_id: "j1", juror_name: "Alice", juror_inst: "EE" }];
    const { container } = render(
      <ManageJurorsPanel {...DEFAULT_PROPS} jurors={existing} />
    );
    const csv = makeCSV("juror_name,juror_inst", "Alice,EE");
    const file = new File([csv], "jurors.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getByText(/skipped existing jurors/i)).toBeInTheDocument();
    });
  });
});

describe("ManageJurorsPanel — PIN reset", () => {
  it("calls onResetPin with correct juror data when PIN button is clicked", () => {
    const juror = { juror_id: "j1", juror_name: "Alice", juror_inst: "EE" };
    const onResetPin = vi.fn();
    render(<ManageJurorsPanel {...DEFAULT_PROPS} jurors={[juror]} onResetPin={onResetPin} />);
    fireEvent.click(screen.getByLabelText(/reset pin for alice/i));
    expect(onResetPin).toHaveBeenCalledTimes(1);
    expect(onResetPin).toHaveBeenCalledWith(
      expect.objectContaining({ jurorId: "j1", juror_name: "Alice" })
    );
  });
});

describe("ManageJurorsPanel — CRUD smoke tests", () => {
  it("calls onDeleteJuror when delete button is clicked", () => {
    const juror = { juror_id: "j1", juror_name: "Alice", juror_inst: "EE" };
    const onDeleteJuror = vi.fn();
    render(
      <ManageJurorsPanel {...DEFAULT_PROPS} jurors={[juror]} onDeleteJuror={onDeleteJuror} />
    );
    fireEvent.click(screen.getByLabelText(/delete alice/i));
    expect(onDeleteJuror).toHaveBeenCalledTimes(1);
    expect(onDeleteJuror).toHaveBeenCalledWith(expect.objectContaining({ juror_id: "j1" }));
  });

  it("calls onAddJuror with name and inst when create form is submitted", async () => {
    const onAddJuror = vi.fn().mockResolvedValue({});
    render(<ManageJurorsPanel {...DEFAULT_PROPS} onAddJuror={onAddJuror} />);

    // Open add modal
    fireEvent.click(screen.getByRole("button", { name: "Juror" }));
    await waitFor(() => screen.getByText("Create Juror"));

    fireEvent.change(screen.getByPlaceholderText(/Dr\. Andrew Collins/), {
      target: { value: "Bob Smith" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Middle East Technical University/),
      { target: { value: "Computer Science" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onAddJuror).toHaveBeenCalledTimes(1));
    expect(onAddJuror).toHaveBeenCalledWith({
      juror_name: "Bob Smith",
      juror_inst: "Computer Science",
    });
  });
});

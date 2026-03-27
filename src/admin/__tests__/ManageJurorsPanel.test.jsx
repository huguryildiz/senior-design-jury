import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, vi } from "vitest";
import ManageJurorsPanel from "../ManageJurorsPanel";
import { qaTest } from "../../test/qaTest.js";

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

  qaTest("jurors.csv.01", async () => {
    const { container } = render(<ManageJurorsPanel {...DEFAULT_PROPS} />);
    const content = "a".repeat(3 * 1024 * 1024); // 3MB
    const bigFile = new File([content], "big.csv", { type: "text/csv" });
    await uploadFile(container, bigFile);
    await waitFor(() => {
      expect(screen.getByText(/file is too large/i)).toBeInTheDocument();
    });
  });

  qaTest("jurors.csv.02", async () => {
    const { container } = render(<ManageJurorsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("name,institution", "Alice,EE");
    const file = new File([csv], "jurors.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/header row is required/i)).toBeInTheDocument();
    });
  });

  qaTest("jurors.csv.03", async () => {
    const { container } = render(<ManageJurorsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("juror_name,juror_inst", ",EE");
    const file = new File([csv], "jurors.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/missing juror_name/i)).toBeInTheDocument();
    });
  });

  qaTest("jurors.csv.04", async () => {
    const { container } = render(<ManageJurorsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("juror_name,juror_inst", "Alice,");
    const file = new File([csv], "jurors.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/missing juror_inst/i)).toBeInTheDocument();
    });
  });

  qaTest("jurors.csv.05", async () => {
    const { container } = render(<ManageJurorsPanel {...DEFAULT_PROPS} />);
    const csv = makeCSV("juror_name,juror_inst", "Alice,EE", "Alice,EE");
    const file = new File([csv], "jurors.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      expect(screen.getByText(/duplicate juror rows/i)).toBeInTheDocument();
    });
  });

  qaTest("jurors.csv.06", async () => {
    const existing = [{ juror_id: "j1", juror_name: "Alice", juror_inst: "EE" }];
    const { container } = render(
      <ManageJurorsPanel {...DEFAULT_PROPS} jurors={existing} />
    );
    const csv = makeCSV("juror_name,juror_inst", "Alice,EE");
    const file = new File([csv], "jurors.csv", { type: "text/csv" });
    await uploadFile(container, file);
    await waitFor(() => {
      // No error alert should appear — only a warning about skipped jurors.
      expect(container.querySelector(".alert-card--error")).toBeNull();
      expect(screen.getByText(/skipped existing jurors/i)).toBeInTheDocument();
    });
  });
});

describe("ManageJurorsPanel — PIN reset", () => {
  qaTest("jurors.pin.01", async () => {
    const juror = { juror_id: "j1", juror_name: "Alice", juror_inst: "EE" };
    const onResetPin = vi.fn();
    render(<ManageJurorsPanel {...DEFAULT_PROPS} jurors={[juror]} onResetPin={onResetPin} />);
    // Open actions dropdown within table
    const table = screen.getByRole("table");
    fireEvent.click(within(table).getByRole("button", { name: "Actions" }));
    await waitFor(() => screen.getByRole("menuitem", { name: /reset pin/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /reset pin/i }));
    expect(onResetPin).toHaveBeenCalledTimes(1);
    expect(onResetPin).toHaveBeenCalledWith(
      expect.objectContaining({ jurorId: "j1", juror_name: "Alice" })
    );
  });
});

describe("ManageJurorsPanel — CRUD smoke tests", () => {
  qaTest("jurors.crud.01", async () => {
    const juror = { juror_id: "j1", juror_name: "Alice", juror_inst: "EE" };
    const onDeleteJuror = vi.fn();
    render(
      <ManageJurorsPanel {...DEFAULT_PROPS} jurors={[juror]} onDeleteJuror={onDeleteJuror} />
    );
    // Open actions dropdown within table
    const table = screen.getByRole("table");
    fireEvent.click(within(table).getByRole("button", { name: "Actions" }));
    await waitFor(() => screen.getByRole("menuitem", { name: /delete/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));
    expect(onDeleteJuror).toHaveBeenCalledTimes(1);
    expect(onDeleteJuror).toHaveBeenCalledWith(expect.objectContaining({ juror_id: "j1" }));
  });

  qaTest("jurors.crud.02", async () => {
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

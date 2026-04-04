import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OutcomeEditor from "../components/OutcomeEditor";

function renderEditor(outcomeConfig = []) {
  const onSave = vi.fn(async () => ({ ok: true }));

  render(
    <OutcomeEditor
      outcomeConfig={outcomeConfig}
      onSave={onSave}
      disabled={false}
      isLocked={false}
    />
  );

  return { onSave };
}

describe("OutcomeEditor collapsible rows", () => {
  it("renders existing outcomes collapsed by default", () => {
    renderEditor([
      { id: "po_1_2", code: "1.2", desc_en: "English summary", desc_tr: "Turkish summary" },
    ]);

    expect(screen.getByRole("button", { name: /expand 1\.2/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Outcome 1 code")).not.toBeInTheDocument();
    expect(screen.queryByText("EN", { selector: ".outcome-editor-row-chip" })).not.toBeInTheDocument();
    expect(screen.queryByText("TR", { selector: ".outcome-editor-row-chip" })).not.toBeInTheDocument();
    expect(document.querySelectorAll(".outcome-editor-row-title-line .outcome-editor-row-flag")).toHaveLength(0);
    expect(screen.queryByText("English and Turkish outcome text")).not.toBeInTheDocument();
    expect(screen.queryByText("English description")).not.toBeInTheDocument();
    expect(screen.queryByText("Turkish description")).not.toBeInTheDocument();
  });

  it("expands an existing outcome when the summary is clicked", () => {
    renderEditor([
      { id: "po_1_2", code: "1.2", desc_en: "English summary", desc_tr: "Turkish summary" },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /expand 1\.2/i }));

    expect(screen.getByLabelText("Outcome 1 code")).toBeInTheDocument();
    expect(screen.getByLabelText("Outcome 1 English description")).toBeInTheDocument();
    expect(screen.getByLabelText("Outcome 1 Turkish description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /collapse 1\.2/i })).toBeInTheDocument();
    expect(screen.queryByText("EN", { selector: ".outcome-editor-row-chip" })).not.toBeInTheDocument();
    expect(screen.queryByText("TR", { selector: ".outcome-editor-row-chip" })).not.toBeInTheDocument();
    expect(document.querySelectorAll(".outcome-editor-row-title-line .outcome-editor-row-flag")).toHaveLength(0);
    expect(screen.queryByText("English and Turkish outcome text")).not.toBeInTheDocument();
    expect(screen.getAllByText("English description").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Turkish description").length).toBeGreaterThan(0);
  });

  it("starts newly added outcomes expanded", () => {
    renderEditor([]);

    fireEvent.click(screen.getByRole("button", { name: /add mÜDEK outcome/i }));
    expect(screen.getByLabelText("Outcome 1 code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /collapse outcome 1/i })).toBeInTheDocument();
    expect(screen.getAllByText("English description").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Turkish description").length).toBeGreaterThan(0);
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CriteriaManager from "../CriteriaManager";
import { CRITERIA, RUBRIC_EDITOR_TEXT } from "../../config";

function renderManager(rubric, criterionMax = 100, onSave = vi.fn(async () => ({ ok: true }))) {
  const template = [
    {
      key: "technical",
      label: "Technical",
      shortLabel: "Tech",
      color: "#1D4ED8",
      max: criterionMax,
      blurb: "Technical quality",
      mudek: [],
      rubric,
    },
  ];

  render(
    <CriteriaManager
      template={template}
      mudekTemplate={[]}
      onSave={onSave}
      disabled={false}
      isLocked={false}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: /edit rubric/i }));
  return { onSave };
}

describe("CriteriaManager rubric range validation UX", () => {
  it("seeds empty default-criterion rubric from config bands", () => {
    const technicalFromConfig = CRITERIA.find((c) => c.id === "technical");
    const template = [
      {
        key: "technical",
        label: "Technical Content",
        shortLabel: "Technical",
        color: "#1D4ED8",
        max: 30,
        blurb: "",
        mudek: [],
        rubric: [],
      },
    ];

    render(
      <CriteriaManager
        template={template}
        mudekTemplate={[]}
        onSave={vi.fn(async () => ({ ok: true }))}
        disabled={false}
        isLocked={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /edit rubric/i }));

    expect(screen.getByLabelText("Band 1 level").value).toBe(technicalFromConfig.rubric[0].level);
    expect(screen.getByLabelText("Band 1 min").value).toBe(String(technicalFromConfig.rubric[0].min));
    expect(screen.getByLabelText("Band 1 max").value).toBe(String(technicalFromConfig.rubric[0].max));
    expect(screen.getByLabelText("Band 1 description").value).toBe(technicalFromConfig.rubric[0].desc);
  });

  it("uses rubric editor placeholders from config constants", () => {
    const template = [
      {
        key: "technical",
        label: "Technical",
        shortLabel: "Tech",
        color: "#1D4ED8",
        max: 100,
        blurb: "",
        mudek: [],
        rubric: [{ level: "", min: "", max: "", desc: "" }],
      },
    ];

    render(
      <CriteriaManager
        template={template}
        mudekTemplate={[{ id: "po_1_2", code: "1.2", desc_en: "x", desc_tr: "x" }]}
        onSave={vi.fn(async () => ({ ok: true }))}
        disabled={false}
        isLocked={false}
      />
    );

    expect(screen.getByLabelText("Criterion 1 description")).toHaveAttribute("placeholder", RUBRIC_EDITOR_TEXT.criterionBlurbPlaceholder);

    fireEvent.click(screen.getByRole("button", { name: /edit rubric/i }));
    expect(screen.getByLabelText("Band 1 level")).toHaveAttribute("placeholder", RUBRIC_EDITOR_TEXT.rubricBandNamePlaceholder);
    expect(screen.getByLabelText("Band 1 min")).toHaveAttribute("placeholder", RUBRIC_EDITOR_TEXT.rubricBandMinPlaceholder);
    expect(screen.getByLabelText("Band 1 max")).toHaveAttribute("placeholder", RUBRIC_EDITOR_TEXT.rubricBandMaxPlaceholder);
    expect(screen.getByLabelText("Band 1 description")).toHaveAttribute("placeholder", "Describe expectations for this band");

    fireEvent.click(screen.getByRole("button", { name: /select mÜdek outcomes/i }));
    expect(screen.getByLabelText("Filter MÜDEK Outcomes")).toHaveAttribute("placeholder", RUBRIC_EDITOR_TEXT.mudekFilterPlaceholder);
  });

  it("uses band labels in overlap messages", () => {
    renderManager([
      { level: "Developing", min: 10, max: 20, desc: "" },
      { level: "Good", min: 15, max: 25, desc: "" },
    ]);

    expect(screen.getAllByText('"Developing" and "Good" overlap.').length).toBeGreaterThan(0);
  });

  it("falls back to Band N when label is empty", () => {
    renderManager([
      { level: "", min: 10, max: 20, desc: "" },
      { level: "Good", min: 15, max: 25, desc: "" },
    ]);

    expect(screen.getAllByText('"Band 1" and "Good" overlap.').length).toBeGreaterThan(0);
  });

  it("marks both conflicting bands' score inputs as invalid", () => {
    renderManager([
      { level: "Developing", min: 10, max: 20, desc: "" },
      { level: "Good", min: 15, max: 25, desc: "" },
    ]);

    expect(screen.getByLabelText("Band 1 min").className).toContain("is-danger");
    expect(screen.getByLabelText("Band 1 max").className).toContain("is-danger");
    expect(screen.getByLabelText("Band 2 min").className).toContain("is-danger");
    expect(screen.getByLabelText("Band 2 max").className).toContain("is-danger");
  });

  it("shows reversed-range message with band label", () => {
    renderManager([{ level: "Excellent", min: 30, max: 10, desc: "" }]);

    expect(screen.getByText('"Excellent" range is invalid')).toBeInTheDocument();
  });

  it("updates overlap message when a band is renamed", () => {
    renderManager([
      { level: "Developing", min: 10, max: 20, desc: "" },
      { level: "Good", min: 15, max: 25, desc: "" },
    ]);

    fireEvent.change(screen.getByLabelText("Band 1 level"), {
      target: { value: "Starter" },
    });

    expect(screen.getAllByText('"Starter" and "Good" overlap.').length).toBeGreaterThan(0);
    expect(screen.queryByText('"Developing" and "Good" overlap.')).not.toBeInTheDocument();
  });

  it("keeps a minimal top summary while inline errors are primary", () => {
    renderManager([{ level: "Excellent", min: 30, max: 10, desc: "" }]);

    expect(screen.getAllByText("Fix highlighted score ranges.").length).toBeGreaterThan(0);
    expect(screen.getByText('"Excellent" range is invalid')).toBeInTheDocument();
  });

  it("renders the coverage error as a blocking validation alert", () => {
    renderManager([
      { level: "Excellent", min: 20, max: 30, desc: "" },
      { level: "Good", min: 11, max: 19, desc: "" },
      { level: "Developing", min: 0, max: 9, desc: "" },
    ], 30);

    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("manage-delete-warning--danger");
    expect(screen.getByText("Score range [0–30] not fully covered. Fix gaps or overlaps.")).toBeInTheDocument();
  });

  it("Save Criteria button stays enabled even when form has errors", () => {
    render(
      <CriteriaManager
        template={[
          {
            key: "technical",
            label: "Technical",
            shortLabel: "Tech",
            color: "#1D4ED8",
            max: 100,
            blurb: "Technical quality",
            mudek: ["1.2"],
            rubric: [
              { level: "Excellent", min: 50, max: 100, desc: "Strong performance." },
              { level: "Good", min: 0, max: 49, desc: "Adequate performance." },
            ],
          },
        ]}
        mudekTemplate={[{ id: "po_1_2", code: "1.2", desc_en: "x", desc_tr: "x" }]}
        onSave={vi.fn(async () => ({ ok: true }))}
        disabled={false}
        isLocked={false}
      />
    );

    const saveButton = screen.getByRole("button", { name: /save criteria/i });
    expect(saveButton).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /add criterion/i }));
    expect(saveButton).toBeEnabled();
  });

  it("shows a visible MÜDEK selection error when none is selected", () => {
    render(
      <CriteriaManager
        template={[
          {
            key: "technical",
            label: "Technical",
            shortLabel: "Tech",
            color: "#1D4ED8",
            max: 100,
            blurb: "Technical quality",
            mudek: [],
            rubric: [
              { level: "Excellent", min: 50, max: 100, desc: "Strong performance." },
              { level: "Good", min: 0, max: 49, desc: "Adequate performance." },
            ],
          },
        ]}
        mudekTemplate={[{ id: "po_1_2", code: "1.2", desc_en: "x", desc_tr: "x" }]}
        onSave={vi.fn(async () => ({ ok: true }))}
        disabled={false}
        isLocked={false}
      />
    );

    expect(screen.getAllByText("Select at least one MÜDEK outcome").length).toBeGreaterThan(0);
  });

  it("clamps band values above criterion max during editing", () => {
    renderManager([{ level: "Excellent", min: 0, max: 100, desc: "" }]);

    const bandMax = screen.getByLabelText("Band 1 max");
    fireEvent.change(bandMax, { target: { value: "130" } });
    expect(bandMax.value).toBe("100");
  });

  it("re-clamps rubric values immediately when criterion max is reduced", () => {
    renderManager([{ level: "Excellent", min: 20, max: 30, desc: "" }], 30);

    fireEvent.change(screen.getByLabelText(/criterion 1 max score/i), {
      target: { value: "10" },
    });

    expect(screen.getByLabelText("Band 1 min").value).toBe("10");
    expect(screen.getByLabelText("Band 1 max").value).toBe("10");
  });

  it("shows the expected helper text in MÜDEK Outcomes section", () => {
    const template = [
      {
        key: "technical",
        label: "Technical",
        shortLabel: "Tech",
        color: "#1D4ED8",
        max: 100,
        blurb: "",
        mudek: [],
        rubric: [],
      },
    ];

    render(
      <CriteriaManager
        template={template}
        mudekTemplate={[{ id: "po_1_1", code: "1.1", desc_en: "x", desc_tr: "x" }]}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText("Select the MÜDEK outcomes mapped to this criterion.")).toBeInTheDocument();
    expect(screen.getByText("Define score ranges so bands cover the full criterion score without overlap.")).toBeInTheDocument();
  });

  it("renders collapsed rubric summary pills using shared level-pill styles and tooltip content", () => {
    const template = [
      {
        key: "technical",
        label: "Technical",
        shortLabel: "Tech",
        color: "#1D4ED8",
        max: 30,
        blurb: "",
        mudek: [],
        rubric: [
          { level: "Excellent", min: 27, max: 30, desc: "Problem is clearly defined." },
          { level: "Good", min: 20, max: "", desc: "" },
        ],
      },
    ];

    render(
      <CriteriaManager
        template={template}
        mudekTemplate={[]}
        onSave={vi.fn(async () => ({ ok: true }))}
        disabled={false}
        isLocked={false}
      />
    );

    const excellentPill = screen.getByText("Excellent").closest(".level-pill");
    expect(excellentPill).toBeInTheDocument();
    expect(excellentPill.className).toContain("level-pill");
    expect(excellentPill.className).toContain("level-pill--excellent");

    const excellentTrigger = screen.getByLabelText("Rubric Excellent details");
    expect(excellentTrigger.querySelector(".criteria-rubric-summary-pill-x")).not.toBeInTheDocument();
    expect(excellentTrigger.querySelector("button")).not.toBeInTheDocument();

    expect(screen.getAllByLabelText(/Rubric .* details/)).toHaveLength(2);
    fireEvent.click(excellentTrigger);
    expect(screen.getAllByLabelText(/Rubric .* details/)).toHaveLength(2);
    expect(screen.getByText("Good")).toBeInTheDocument();

    fireEvent.focus(excellentTrigger);
    expect(screen.getByText("Range: 27–30")).toBeInTheDocument();
    expect(screen.getByText("Problem is clearly defined.")).toBeInTheDocument();

    fireEvent.blur(excellentTrigger);
    fireEvent.focus(screen.getByLabelText("Rubric Good details"));
    expect(screen.queryByText("Range: 20–")).not.toBeInTheDocument();
  });

  it("shows selected MÜDEK pill tooltip with EN description and preserves remove behavior", () => {
    const template = [
      {
        key: "technical",
        label: "Technical",
        shortLabel: "Tech",
        color: "#1D4ED8",
        max: 30,
        blurb: "",
        mudek: ["3.1"],
        rubric: [],
      },
    ];

    render(
      <CriteriaManager
        template={template}
        mudekTemplate={[
          {
            id: "po_3_1",
            code: "3.1",
            desc_en: "Ability to analyze a complex engineering problem.",
            desc_tr: "x",
          },
        ]}
        onSave={vi.fn(async () => ({ ok: true }))}
        disabled={false}
        isLocked={false}
      />
    );

    fireEvent.focus(screen.getByLabelText("MÜDEK 3.1 details"));
    expect(screen.getByText("Ability to analyze a complex engineering problem.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove MÜDEK 3.1" }));
    expect(screen.getByText("None selected")).toBeInTheDocument();
  });
});

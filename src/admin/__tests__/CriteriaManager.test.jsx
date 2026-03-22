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

  fireEvent.click(screen.getByRole("button", { name: /expand criterion technical/i }));
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

    fireEvent.click(screen.getByRole("button", { name: /expand criterion technical content/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /expand criterion technical/i }));
    expect(screen.getByLabelText("Criterion 1 description")).toHaveAttribute("placeholder", RUBRIC_EDITOR_TEXT.criterionBlurbPlaceholder);

    expect(screen.getByLabelText("Band 1 level")).toHaveAttribute("placeholder", RUBRIC_EDITOR_TEXT.rubricBandNamePlaceholder);
    expect(screen.getByLabelText("Band 1 min")).toHaveAttribute("placeholder", RUBRIC_EDITOR_TEXT.rubricBandMinPlaceholder);
    expect(screen.getByLabelText("Band 1 max")).toHaveAttribute("placeholder", RUBRIC_EDITOR_TEXT.rubricBandMaxPlaceholder);
    expect(screen.getByLabelText("Band 1 description")).toHaveAttribute("placeholder", "Describe expectations for this band");

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

  it("renders existing criterion rows collapsed by default", () => {
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

    expect(screen.getByRole("button", { name: /expand criterion technical/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Criterion 1 label")).not.toBeInTheDocument();
  });

  it("expands a criterion when the summary is clicked", () => {
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

    fireEvent.click(screen.getByRole("button", { name: /expand criterion technical/i }));
    expect(screen.getByLabelText("Criterion 1 label")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /collapse criterion technical/i })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /expand criterion technical/i }));
    expect(screen.getByText("Select the MÜDEK outcomes mapped to this criterion.")).toBeInTheDocument();
    expect(screen.getByText("Define score ranges so bands cover the full criterion score without overlap.")).toBeInTheDocument();
  });

  it("renders collapsed rubric summary pills using shared level-pill styles", () => {
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

    expect(screen.getByRole("button", { name: /expand criterion technical/i })).toBeInTheDocument();
    const excellentPill = screen.getByText("Excellent").closest(".level-pill");
    expect(excellentPill).toBeInTheDocument();
    expect(excellentPill.className).toContain("level-pill");
    expect(excellentPill.className).toContain("level-pill--excellent");
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("shows tooltip details for collapsed MÜDEK and rubric preview pills", () => {
    const template = [
      {
        key: "technical",
        label: "Technical",
        shortLabel: "Tech",
        color: "#1D4ED8",
        max: 30,
        blurb: "",
        mudek: ["1.2"],
        rubric: [
          { level: "Excellent", min: 27, max: 30, desc: "Strong depth and clarity." },
        ],
      },
    ];

    render(
      <CriteriaManager
        template={template}
        mudekTemplate={[
          {
            id: "po_1_2",
            code: "1.2",
            desc_en: "Ability to analyze and solve engineering problems.",
            desc_tr: "Mühendislik problemlerini analiz etme ve çözme yeteneği.",
          },
        ]}
        onSave={vi.fn(async () => ({ ok: true }))}
        disabled={false}
        isLocked={false}
      />
    );

    fireEvent.focus(screen.getByLabelText(/1\.2 — 🇬🇧 Ability to analyze and solve engineering problems\./i));
    expect(screen.getByText("🇬🇧 Ability to analyze and solve engineering problems.")).toBeInTheDocument();
    expect(screen.getByText("🇹🇷 Mühendislik problemlerini analiz etme ve çözme yeteneği.")).toBeInTheDocument();

    fireEvent.focus(screen.getByLabelText(/Excellent — Range: 27–30 — Strong depth and clarity\./i));
    expect(screen.getByText("Range: 27–30")).toBeInTheDocument();
    expect(screen.getByText("Description: Strong depth and clarity.")).toBeInTheDocument();
  });

  it("shows all collapsed MÜDEK chips and rubric pills without +N truncation", () => {
    const template = [
      {
        key: "technical",
        label: "Technical",
        shortLabel: "Tech",
        color: "#1D4ED8",
        max: 30,
        blurb: "",
        mudek: ["1.1", "1.2", "2", "3.1", "3.2"],
        rubric: [
          { level: "Excellent", min: 27, max: 30, desc: "" },
          { level: "Good", min: 21, max: 26, desc: "" },
          { level: "Developing", min: 11, max: 20, desc: "" },
          { level: "Insufficient", min: 0, max: 10, desc: "" },
          { level: "Bonus", min: 0, max: 0, desc: "" },
        ],
      },
    ];

    render(
      <CriteriaManager
        template={template}
        mudekTemplate={[
          { id: "po_1_1", code: "1.1", desc_en: "x", desc_tr: "x" },
          { id: "po_1_2", code: "1.2", desc_en: "x", desc_tr: "x" },
          { id: "po_2", code: "2", desc_en: "x", desc_tr: "x" },
          { id: "po_3_1", code: "3.1", desc_en: "x", desc_tr: "x" },
          { id: "po_3_2", code: "3.2", desc_en: "x", desc_tr: "x" },
        ]}
        onSave={vi.fn(async () => ({ ok: true }))}
        disabled={false}
        isLocked={false}
      />
    );

    expect(screen.getByText("1.1")).toBeInTheDocument();
    expect(screen.getByText("1.2")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3.1")).toBeInTheDocument();
    expect(screen.getByText("3.2")).toBeInTheDocument();
    expect(screen.queryByText("+1")).not.toBeInTheDocument();
    expect(screen.getByText("Excellent")).toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getByText("Developing")).toBeInTheDocument();
    expect(screen.getByText("Insufficient")).toBeInTheDocument();
    expect(screen.getByText("Bonus")).toBeInTheDocument();
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
            desc_tr: "Mühendislik problemlerini analiz etme yeteneği.",
          },
        ]}
        onSave={vi.fn(async () => ({ ok: true }))}
        disabled={false}
        isLocked={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /expand criterion technical/i }));
    fireEvent.focus(screen.getAllByLabelText(/3\.1 — 🇬🇧 Ability to analyze a complex engineering problem\./i)[0]);
    expect(screen.getByText("🇬🇧 Ability to analyze a complex engineering problem.")).toBeInTheDocument();
    expect(screen.getByText("🇹🇷 Mühendislik problemlerini analiz etme yeteneği.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove MÜDEK 3.1" }));
    expect(screen.getByText("None selected", { selector: ".criteria-mudek-none" })).toBeInTheDocument();
  });

  it("opens a delete confirmation dialog before removing a criterion", () => {
    render(
      <CriteriaManager
        template={[
          {
            key: "technical",
            label: "Technical",
            shortLabel: "Tech",
            color: "#1D4ED8",
            max: 30,
            blurb: "",
            mudek: [],
            rubric: [],
          },
          {
            key: "design",
            label: "Design",
            shortLabel: "Design",
            color: "#F59E0B",
            max: 70,
            blurb: "",
            mudek: [],
            rubric: [],
          },
        ]}
        mudekTemplate={[]}
        onSave={vi.fn(async () => ({ ok: true }))}
        disabled={false}
        isLocked={false}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: /remove criterion/i })[0]);
    expect(screen.getByRole("dialog", { name: /delete confirmation/i })).toBeInTheDocument();
    expect(screen.getByText("Delete Confirmation")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByText("Technical")).not.toBeInTheDocument();
  });
});

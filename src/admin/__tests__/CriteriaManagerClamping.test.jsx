import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CriteriaManager from "../CriteriaManager";

function renderManager() {
  const template = [
    {
      key: "technical",
      label: "Technical",
      shortLabel: "Tech",
      color: "#1D4ED8",
      max: 30,
      blurb: "Technical quality",
      mudek: [],
      rubric: [],
    },
  ];

  const onSave = vi.fn(async () => ({ ok: true }));

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

describe("CriteriaManager Max Score Clamping", () => {
  it("clumps values below 0 to 0", () => {
    renderManager();
    const maxInput = screen.getByLabelText(/criterion 1 max score/i);
    
    fireEvent.change(maxInput, { target: { value: "-1" } });
    expect(maxInput.value).toBe("0");

    fireEvent.change(maxInput, { target: { value: "-50" } });
    expect(maxInput.value).toBe("0");
  });

  it("clumps values above 100 to 100", () => {
    renderManager();
    const maxInput = screen.getByLabelText(/criterion 1 max score/i);
    
    fireEvent.change(maxInput, { target: { value: "101" } });
    expect(maxInput.value).toBe("100");

    fireEvent.change(maxInput, { target: { value: "250" } });
    expect(maxInput.value).toBe("100");
  });

  it("keeps values between 0 and 100 unchanged", () => {
    renderManager();
    const maxInput = screen.getByLabelText(/criterion 1 max score/i);
    
    fireEvent.change(maxInput, { target: { value: "30" } });
    expect(maxInput.value).toBe("30");

    fireEvent.change(maxInput, { target: { value: "0" } });
    expect(maxInput.value).toBe("0");

    fireEvent.change(maxInput, { target: { value: "100" } });
    expect(maxInput.value).toBe("100");
  });

  it("allows empty input (clearing the field)", () => {
    renderManager();
    const maxInput = screen.getByLabelText(/criterion 1 max score/i);
    
    fireEvent.change(maxInput, { target: { value: "" } });
    expect(maxInput.value).toBe("");
  });

  it("still updates the total score summary correctly with clamped values", () => {
    renderManager();
    const maxInput = screen.getByLabelText(/criterion 1 max score/i);
    
    fireEvent.change(maxInput, { target: { value: "120" } }); // Should clamp to 100
    expect(screen.getByText(/Total: 100 \/ 100/)).toBeInTheDocument();

    fireEvent.change(maxInput, { target: { value: "-10" } }); // Should clamp to 0
    expect(screen.getByText(/Total: 0 \/ 100/)).toBeInTheDocument();
  });
});

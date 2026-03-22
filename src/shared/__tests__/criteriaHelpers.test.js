import { describe, expect, it } from "vitest";
import { criterionToTemplate } from "../criteriaHelpers";

describe("criterionToTemplate rubric max-bounding", () => {
  it("clamps rubric band min/max to criterion max before save", () => {
    const row = {
      _key: "teamwork",
      label: "Teamwork",
      shortLabel: "Team",
      color: "#1D4ED8",
      max: 10,
      blurb: "",
      mudek: [],
      rubric: [
        { level: "Excellent", min: 9, max: 30, desc: "" },
        { level: "Good", min: -5, max: 12, desc: "" },
      ],
    };

    const saved = criterionToTemplate(row);

    expect(saved.rubric[0].min).toBe(9);
    expect(saved.rubric[0].max).toBe(10);
    expect(saved.rubric[0].range).toBe("9–10");
    expect(saved.rubric[1].min).toBe(0);
    expect(saved.rubric[1].max).toBe(10);
    expect(saved.rubric[1].range).toBe("0–10");
  });
});

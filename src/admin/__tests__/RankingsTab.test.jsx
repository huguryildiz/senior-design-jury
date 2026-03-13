import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RankingsTab from "../RankingsTab";

describe("RankingsTab", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("applies dense ranking with ties and excludes non-finalized groups", () => {
    const ranked = [
      { id: "p2", groupNo: 2, name: "B", students: "", totalAvg: 95, avg: {} },
      { id: "p1", groupNo: 1, name: "A", students: "", totalAvg: 95, avg: {} },
      { id: "p3", groupNo: 3, name: "C", students: "", totalAvg: 90, avg: {} },
      { id: "p4", groupNo: 4, name: "D", students: "", totalAvg: 80, avg: {} },
      { id: "p5", groupNo: 5, name: "E", students: "", totalAvg: null, avg: {} },
    ];

    const { container } = render(<RankingsTab ranked={ranked} semesterName="2026 Spring" />);

    expect(screen.queryByText("Group 5")).toBeNull();
    expect(screen.getAllByAltText("1 place medal")).toHaveLength(2);
    expect(screen.getAllByAltText("3 place medal")).toHaveLength(1);
    expect(container.querySelector(".rank-badge.rank-num")?.textContent?.trim()).toBe("4");

    const groupLabels = Array.from(container.querySelectorAll(".group-card-name"))
      .map((el) => el.textContent?.trim() || "");
    expect(groupLabels[0]).toContain("Group 2");
    expect(groupLabels[1]).toContain("Group 1");
  });

  it("exports currently filtered/sorted list", async () => {
    const exportSpy = vi.spyOn(await import("../utils"), "exportRankingsXLSX").mockResolvedValue();
    const ranked = [
      { id: "p1", groupNo: 1, name: "Alpha", students: "", totalAvg: 88, avg: {} },
      { id: "p2", groupNo: 2, name: "Beta", students: "", totalAvg: 77, avg: {} },
    ];
    render(<RankingsTab ranked={ranked} semesterName="2026 Spring" />);

    screen.getByRole("button", { name: /excel/i }).click();
    expect(exportSpy).toHaveBeenCalledTimes(1);
    exportSpy.mockRestore();
  });
});

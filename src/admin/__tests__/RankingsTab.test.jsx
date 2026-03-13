import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("rankMap is stable when search filters the visible list [Fix 1 regression]", () => {
    // 4 groups: Delta has rank 4 — after search filters out top-3, Delta's rank must remain 4
    const ranked = [
      { id: "p1", groupNo: 1, name: "Alpha", students: "", totalAvg: 80, avg: {} }, // rank 2
      { id: "p2", groupNo: 2, name: "Beta",  students: "", totalAvg: 90, avg: {} }, // rank 1
      { id: "p3", groupNo: 3, name: "Gamma", students: "", totalAvg: 70, avg: {} }, // rank 3
      { id: "p4", groupNo: 4, name: "Delta", students: "", totalAvg: 60, avg: {} }, // rank 4 → rank-num badge
    ];
    const { container } = render(
      <RankingsTab ranked={ranked} semesterName="2026 Spring" />
    );

    // Filter to show only Delta — its rank must remain 4, not reset to 1
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "delta" } });

    const badges = Array.from(container.querySelectorAll(".rank-badge"));
    expect(badges).toHaveLength(1); // only Delta visible
    const deltaBadge = badges[0];
    expect(deltaBadge.classList.contains("rank-num")).toBe(true);
    expect(deltaBadge.textContent?.trim()).toBe("4");
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

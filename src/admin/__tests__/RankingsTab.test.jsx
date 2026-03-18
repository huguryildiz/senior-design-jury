import { beforeEach, describe, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RankingsTab from "../RankingsTab";
import { qaTest } from "../../test/qaTest.js";

describe("RankingsTab", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  qaTest("rank.01", () => {
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

  qaTest("rank.02", () => {
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

  qaTest("rank.03", async () => {
    const exportSpy = vi.spyOn(await import("../xlsx/exportXLSX"), "exportRankingsXLSX").mockResolvedValue();
    const ranked = [
      { id: "p1", groupNo: 1, name: "Alpha", students: "", totalAvg: 88, avg: {} },
      { id: "p2", groupNo: 2, name: "Beta", students: "", totalAvg: 77, avg: {} },
    ];
    render(<RankingsTab ranked={ranked} semesterName="2026 Spring" />);

    screen.getByRole("button", { name: /excel/i }).click();
    expect(exportSpy).toHaveBeenCalledTimes(1);
    exportSpy.mockRestore();
  });

  qaTest("results.rank.01", () => {
    // Project with totalAvg: null (no finalized scores) must not appear in ranked list
    const ranked = [
      { id: "p1", groupNo: 11, name: "AlphaUniq", students: "", totalAvg: 85, avg: {} },
      { id: "p2", groupNo: 22, name: "BetaNull",  students: "", totalAvg: null, avg: {} },
    ];
    const { container } = render(<RankingsTab ranked={ranked} semesterName="2026 Spring" />);

    const cards = Array.from(container.querySelectorAll(".rank-badge"));
    expect(cards).toHaveLength(1); // only the ranked project gets a badge
    expect(screen.queryByText(/BetaNull/)).toBeNull();
  });

  qaTest("results.rank.02", () => {
    // Competition ranking: two tied at rank 1 → next rank is 3 (not 2)
    // Ranks 1-3 use medal badges; rank 4+ uses rank-num badge
    const ranked = [
      { id: "p1", groupNo: 1, name: "Alpha", students: "", totalAvg: 90, avg: {} },
      { id: "p2", groupNo: 2, name: "Beta",  students: "", totalAvg: 90, avg: {} },
      { id: "p3", groupNo: 3, name: "Gamma", students: "", totalAvg: 80, avg: {} },
      { id: "p4", groupNo: 4, name: "Delta", students: "", totalAvg: 70, avg: {} },
    ];
    const { container } = render(<RankingsTab ranked={ranked} semesterName="2026 Spring" />);

    // Both tied projects at score 90 get rank 1 medal
    expect(screen.getAllByAltText("1 place medal")).toHaveLength(2);
    // No rank 2 medal — rank 2 is skipped (competition ranking)
    expect(screen.queryByAltText("2 place medal")).toBeNull();
    // Third project (score 80) gets rank 3 medal
    expect(screen.getAllByAltText("3 place medal")).toHaveLength(1);
    // Fourth project (score 70) gets rank-num badge "4"
    const numBadge = container.querySelector(".rank-badge.rank-num");
    expect(numBadge).toBeTruthy();
    expect(numBadge.textContent.trim()).toBe("4");
  });

  qaTest("results.rank.03", () => {
    // Search/filter must not change the absolute rank number of visible projects
    const ranked = [
      { id: "p1", groupNo: 1, name: "Alpha", students: "", totalAvg: 90, avg: {} },
      { id: "p2", groupNo: 2, name: "Beta",  students: "", totalAvg: 80, avg: {} },
      { id: "p3", groupNo: 3, name: "Gamma", students: "", totalAvg: 70, avg: {} },
      { id: "p4", groupNo: 4, name: "Delta", students: "", totalAvg: 60, avg: {} },
    ];
    const { container } = render(<RankingsTab ranked={ranked} semesterName="2026 Spring" />);

    // Filter to show only Delta (rank 4 — a rank-num badge)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "delta" } });

    const badges = Array.from(container.querySelectorAll(".rank-badge"));
    expect(badges).toHaveLength(1);
    // Rank must remain 4 — not reset to 1
    expect(badges[0].classList.contains("rank-num")).toBe(true);
    expect(badges[0].textContent.trim()).toBe("4");
  });

  qaTest("results.rank.04", () => {
    // Project with totalAvg: null does not shift rank positions of other projects
    const ranked = [
      { id: "p1", groupNo: 1, name: "Alpha", students: "", totalAvg: 85, avg: {} },
      { id: "p2", groupNo: 2, name: "Beta",  students: "", totalAvg: null, avg: {} },
      { id: "p3", groupNo: 3, name: "Gamma", students: "", totalAvg: 75, avg: {} },
      { id: "p4", groupNo: 4, name: "Delta", students: "", totalAvg: 65, avg: {} },
    ];
    const { container } = render(<RankingsTab ranked={ranked} semesterName="2026 Spring" />);

    // Only 3 ranked projects visible (null excluded)
    const badges = Array.from(container.querySelectorAll(".rank-badge"));
    expect(badges).toHaveLength(3);

    // Alpha is rank 1 medal, Gamma is rank 2 medal, Delta is rank 3 medal
    // The null project did not shift ranks (Gamma should not be rank 3)
    expect(screen.getAllByAltText("1 place medal")).toHaveLength(1);
    expect(screen.getAllByAltText("2 place medal")).toHaveLength(1);
    expect(screen.getAllByAltText("3 place medal")).toHaveLength(1);
  });
});

import { beforeEach, describe, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/auth", () => ({
  useAuth: () => ({ activeOrganization: null }),
}));

import RankingsPage from "../RankingsPage";
import { qaTest } from "../../test/qaTest.js";

describe("RankingsPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  qaTest("rank.01", () => {
    const summaryData = [
      { id: "p2", title: "B", members: "", totalAvg: 95, avg: {} },
      { id: "p1", title: "A", members: "", totalAvg: 95, avg: {} },
      { id: "p3", title: "C", members: "", totalAvg: 90, avg: {} },
      { id: "p4", title: "D", members: "", totalAvg: 80, avg: {} },
      { id: "p5", title: "E", members: "", totalAvg: null, avg: {} },
    ];

    render(<RankingsPage summaryData={summaryData} periodName="2026 Spring" />);

    expect(screen.queryByText("Group 5")).toBeNull();
    expect(screen.getAllByRole("img", { name: /1st place/i })).toHaveLength(2);
    expect(screen.getAllByRole("img", { name: /3rd place/i })).toHaveLength(1);
    // Rank 4 should be displayed as a number badge (not a medal)
    expect(screen.getByText("4", { selector: "span" })).toBeTruthy();
  });

  qaTest("rank.02", () => {
    // 4 groups: Delta has rank 4 — after search filters out top-3, Delta's rank must remain 4
    const summaryData = [
      { id: "p1", title: "Alpha", members: "", totalAvg: 80, avg: {} }, // rank 2
      { id: "p2", title: "Beta",  members: "", totalAvg: 90, avg: {} }, // rank 1
      { id: "p3", title: "Gamma", members: "", totalAvg: 70, avg: {} }, // rank 3
      { id: "p4", title: "Delta", members: "", totalAvg: 60, avg: {} }, // rank 4 → num badge
    ];
    render(
      <RankingsPage summaryData={summaryData} periodName="2026 Spring" />
    );

    // Filter to show only Delta — its rank must remain 4, not reset to 1
    const searchInput = screen.getByPlaceholderText(/Search groups/i);
    fireEvent.change(searchInput, { target: { value: "delta" } });

    // After filtering, only Delta (rank 4) is visible - should display "4" in rank area
    expect(screen.getByText("Delta")).toBeTruthy();
    expect(screen.getByText("4", { selector: "span" })).toBeTruthy();
  });

  qaTest("rank.03", async () => {
    const exportSpy = vi.spyOn(await import("../xlsx/exportXLSX"), "exportRankingsXLSX").mockResolvedValue();
    const summaryData = [
      { id: "p1", title: "Alpha", members: "", totalAvg: 88, avg: {} },
      { id: "p2", title: "Beta", members: "", totalAvg: 77, avg: {} },
    ];
    render(<RankingsPage summaryData={summaryData} periodName="2026 Spring" />);

    screen.getByRole("button", { name: /excel/i }).click();
    expect(exportSpy).toHaveBeenCalledTimes(1);
    exportSpy.mockRestore();
  });

  qaTest("results.rank.01", () => {
    // Project with totalAvg: null (no finalized scores) must not appear in ranked list
    const summaryData = [
      { id: "p1", title: "AlphaUniq", members: "", totalAvg: 85, avg: {} },
      { id: "p2", title: "BetaNull",  members: "", totalAvg: null, avg: {} },
    ];
    render(<RankingsPage summaryData={summaryData} periodName="2026 Spring" />);

    // Only the ranked project (AlphaUniq) should appear, not BetaNull
    expect(screen.getByText(/AlphaUniq/)).toBeTruthy();
    expect(screen.queryByText(/BetaNull/)).toBeNull();
  });

  qaTest("results.rank.02", () => {
    // Competition ranking: two tied at rank 1 → next rank is 3 (not 2)
    // Ranks 1-3 use medal badges; rank 4+ uses rank-num badge
    const summaryData = [
      { id: "p1", title: "Alpha", members: "", totalAvg: 90, avg: {} },
      { id: "p2", title: "Beta",  members: "", totalAvg: 90, avg: {} },
      { id: "p3", title: "Gamma", members: "", totalAvg: 80, avg: {} },
      { id: "p4", title: "Delta", members: "", totalAvg: 70, avg: {} },
    ];
    render(<RankingsPage summaryData={summaryData} periodName="2026 Spring" />);

    // Both tied projects at score 90 get rank 1 medal
    expect(screen.getAllByRole("img", { name: /1st place/i })).toHaveLength(2);
    // No rank 2 medal — rank 2 is skipped (competition ranking)
    expect(screen.queryByRole("img", { name: /2nd place/i })).toBeNull();
    // Third project (score 80) gets rank 3 medal
    expect(screen.getAllByRole("img", { name: /3rd place/i })).toHaveLength(1);
    // Fourth project (score 70) gets rank-num badge "4"
    expect(screen.getByText("4", { selector: "span" })).toBeTruthy();
  });

  qaTest("results.rank.03", () => {
    // Search/filter must not change the absolute rank number of visible projects
    const summaryData = [
      { id: "p1", title: "Alpha", members: "", totalAvg: 90, avg: {} },
      { id: "p2", title: "Beta",  members: "", totalAvg: 80, avg: {} },
      { id: "p3", title: "Gamma", members: "", totalAvg: 70, avg: {} },
      { id: "p4", title: "Delta", members: "", totalAvg: 60, avg: {} },
    ];
    render(<RankingsPage summaryData={summaryData} periodName="2026 Spring" />);

    // Filter to show only Delta (rank 4)
    const searchInput = screen.getByPlaceholderText(/Search groups/i);
    fireEvent.change(searchInput, { target: { value: "delta" } });

    // Rank must remain 4 — not reset to 1
    expect(screen.getByText("Delta")).toBeTruthy();
    expect(screen.getByText("4", { selector: "span" })).toBeTruthy();
  });

  qaTest("results.rank.04", () => {
    // Project with totalAvg: null does not shift rank positions of other projects
    const summaryData = [
      { id: "p1", title: "Alpha", members: "", totalAvg: 85, avg: {} },
      { id: "p2", title: "Beta",  members: "", totalAvg: null, avg: {} },
      { id: "p3", title: "Gamma", members: "", totalAvg: 75, avg: {} },
      { id: "p4", title: "Delta", members: "", totalAvg: 65, avg: {} },
    ];
    render(<RankingsPage summaryData={summaryData} periodName="2026 Spring" />);

    // Only 3 ranked projects visible (null excluded)
    expect(screen.queryByText(/Beta/)).toBeNull();
    expect(screen.getByText(/Alpha/)).toBeTruthy();
    expect(screen.getByText(/Gamma/)).toBeTruthy();
    expect(screen.getByText(/Delta/)).toBeTruthy();

    // Alpha is rank 1 medal, Gamma is rank 2 medal, Delta is rank 3 medal
    // The null project did not shift ranks
    expect(screen.getAllByRole("img", { name: /1st place/i })).toHaveLength(1);
    expect(screen.getAllByRole("img", { name: /2nd place/i })).toHaveLength(1);
    expect(screen.getAllByRole("img", { name: /3rd place/i })).toHaveLength(1);
  });
});

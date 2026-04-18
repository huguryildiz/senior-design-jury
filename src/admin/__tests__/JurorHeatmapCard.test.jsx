import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";

vi.mock("@/shared/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../admin/components/JurorBadge.jsx", () => ({
  default: ({ name }) => <div data-testid="badge">{name}</div>,
}));
vi.mock("../../admin/components/JurorStatusPill.jsx", () => ({
  default: ({ status }) => <div data-testid="status">{status}</div>,
}));

import JurorHeatmapCard from "../pages/heatmap/JurorHeatmapCard.jsx";

const juror = { key: "j1", name: "Dr. Alper Kılıç", dept: "EE" };
const rows = [
  { groupId: "g1", label: "P1", title: "Wearable ECG", score: 88, max: 100, partial: false, empty: false },
  { groupId: "g2", label: "P2", title: "MIMO Antenna", score: 76, max: 100, partial: true,  empty: false },
];

describe("JurorHeatmapCard", () => {
  qaTest("heatmap.mobile.card.01", () => {
    render(<JurorHeatmapCard juror={juror} avg={80.7} tabMax={100} status="completed" rows={rows} />);
    // Header button exists and is collapsed
    const toggle = screen.getByRole("button", { name: /expand juror/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Summary strip text
    expect(screen.getByText(/2 projects/i)).toBeInTheDocument();
    // Project titles NOT rendered yet
    expect(screen.queryByText("Wearable ECG")).not.toBeInTheDocument();
  });

  qaTest("heatmap.mobile.card.02", () => {
    render(<JurorHeatmapCard juror={juror} avg={80.7} tabMax={100} status="completed" rows={rows} />);
    const toggle = screen.getByRole("button", { name: /expand juror/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Wearable ECG")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Wearable ECG")).not.toBeInTheDocument();
  });

  qaTest("heatmap.mobile.card.03", () => {
    render(<JurorHeatmapCard juror={juror} avg={80.7} tabMax={100} status="completed" rows={rows} />);
    fireEvent.click(screen.getByRole("button", { name: /expand juror/i }));
    // P2 is partial; the row should include a flag span
    const flags = screen.getAllByText("!", { selector: "span.m-flag" });
    expect(flags.length).toBeGreaterThan(0);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import AvgDonut from "../pages/heatmap/AvgDonut.jsx";

describe("AvgDonut", () => {
  qaTest("heatmap.mobile.donut.01", () => {
    render(<AvgDonut value={80.7} max={100} />);
    expect(screen.getByText("80.7")).toBeInTheDocument();
    expect(screen.getByText("Avg")).toBeInTheDocument();
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("aria-label", expect.stringContaining("80.7"));
    expect(img).toHaveAttribute("aria-label", expect.stringContaining("100"));
  });

  qaTest("heatmap.mobile.donut.02", () => {
    const { container } = render(<AvgDonut value={null} max={100} />);
    expect(screen.getByText("\u2014")).toBeInTheDocument();
    const filled = container.querySelector('circle[data-fill="true"]');
    expect(filled).toBeNull();
  });
});

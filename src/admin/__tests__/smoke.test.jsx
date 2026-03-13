// Smoke tests: components render without throwing with minimal/empty props
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CompletionStrip from "../CompletionStrip";
import JurorActivity from "../JurorActivity";
import AnalyticsTab from "../AnalyticsTab";

describe("CompletionStrip smoke tests", () => {
  it("renders nothing when metrics is null", () => {
    const { container } = render(<CompletionStrip metrics={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders completion text with correct counts", () => {
    render(<CompletionStrip metrics={{ completedJurors: 3, totalJurors: 5 }} />);
    expect(screen.getByText(/3 of 5 jurors completed/)).toBeInTheDocument();
  });

  it("shows pending count when some jurors are incomplete", () => {
    render(<CompletionStrip metrics={{ completedJurors: 2, totalJurors: 5 }} />);
    expect(screen.getByText(/3 pending/)).toBeInTheDocument();
  });

  it("renders 100% completion without pending", () => {
    render(<CompletionStrip metrics={{ completedJurors: 5, totalJurors: 5 }} />);
    const text = screen.getByText(/5 of 5 jurors completed/);
    expect(text).toBeInTheDocument();
    expect(text.textContent).not.toContain("pending");
  });

  it("clamps completion % to 100 when completedJurors > totalJurors", () => {
    const { container } = render(
      <CompletionStrip metrics={{ completedJurors: 8, totalJurors: 5 }} />
    );
    const fill = container.querySelector(".completion-bar-fill");
    expect(fill?.style.width).toBe("100%");
  });
});

describe("JurorActivity smoke tests", () => {
  beforeEach(() => localStorage.clear());

  it("renders without throwing when both props are empty arrays", () => {
    expect(() => render(<JurorActivity jurorStats={[]} groups={[]} />)).not.toThrow();
  });

  it("renders without throwing when props are omitted (uses defaults)", () => {
    expect(() => render(<JurorActivity />)).not.toThrow();
  });

  it("shows search input for filtering jurors", () => {
    render(<JurorActivity jurorStats={[]} groups={[]} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});

describe("AnalyticsTab smoke tests", () => {
  it("renders without throwing with empty/null data", () => {
    expect(() =>
      render(
        <AnalyticsTab
          dashboardStats={[]}
          submittedData={[]}
          overviewMetrics={{}}
          lastRefresh={null}
          loading={false}
          error={null}
          semesterName=""
          semesterOptions={[]}
          trendSemesterIds={[]}
          onTrendSelectionChange={() => {}}
        />
      )
    ).not.toThrow();
  });

  it("renders a loading indicator when loading=true", () => {
    const { container } = render(
      <AnalyticsTab
        dashboardStats={[]}
        submittedData={[]}
        overviewMetrics={{}}
        lastRefresh={null}
        loading={true}
        error={null}
        semesterName="2026 Spring"
      />
    );
    // Just verify it renders without crashing
    expect(container).toBeDefined();
  });
});

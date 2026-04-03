// Smoke tests: components render without throwing with minimal/empty props
import { afterEach, beforeEach, describe, expect, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import { render, screen } from "@testing-library/react";

vi.mock("@/auth", () => ({
  useAuth: () => ({ activeOrganization: null }),
}));

import { ChartDataTable } from "../../charts/chartUtils";
import CompletionStrip from "../CompletionStrip";
import JurorActivity from "../JurorActivity";
import AnalyticsTab from "../AnalyticsTab";

describe("CompletionStrip smoke tests", () => {
  qaTest("smoke.strip.01", () => {
    const { container } = render(<CompletionStrip metrics={null} />);
    expect(container.firstChild).toBeNull();
  });

  qaTest("smoke.strip.02", () => {
    render(<CompletionStrip metrics={{ completedJurors: 3, totalJurors: 5 }} />);
    expect(screen.getByText(/3 of 5 jurors completed/)).toBeInTheDocument();
  });

  qaTest("smoke.strip.03", () => {
    render(<CompletionStrip metrics={{ completedJurors: 2, totalJurors: 5 }} />);
    expect(screen.getByText(/3 pending/)).toBeInTheDocument();
  });

  qaTest("smoke.strip.04", () => {
    render(<CompletionStrip metrics={{ completedJurors: 5, totalJurors: 5 }} />);
    const text = screen.getByText(/5 of 5 jurors completed/);
    expect(text).toBeInTheDocument();
    expect(text.textContent).not.toContain("pending");
  });

  qaTest("smoke.strip.05", () => {
    const { container } = render(
      <CompletionStrip metrics={{ completedJurors: 8, totalJurors: 5 }} />
    );
    const fill = container.querySelector(".completion-bar-fill");
    expect(fill?.style.width).toBe("100%");
  });
});

describe("JurorActivity smoke tests", () => {
  beforeEach(() => localStorage.clear());

  qaTest("smoke.juror.01", () => {
    expect(() => render(<JurorActivity jurorStats={[]} groups={[]} />)).not.toThrow();
  });

  qaTest("smoke.juror.02", () => {
    expect(() => render(<JurorActivity />)).not.toThrow();
  });

  qaTest("smoke.juror.03", () => {
    render(<JurorActivity jurorStats={[]} groups={[]} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});

describe("AnalyticsTab smoke tests", () => {
  qaTest("smoke.analytics.01", () => {
    expect(() =>
      render(
        <AnalyticsTab
          dashboardStats={[]}
          submittedData={[]}
          overviewMetrics={{}}
          lastRefresh={null}
          loading={false}
          error={null}
          periodName=""
          semesterOptions={[]}
          trendSemesterIds={[]}
          onTrendSelectionChange={() => {}}
        />
      )
    ).not.toThrow();
  });

  qaTest("smoke.analytics.02", () => {
    const { container } = render(
      <AnalyticsTab
        dashboardStats={[]}
        submittedData={[]}
        overviewMetrics={{}}
        lastRefresh={null}
        loading={true}
        error={null}
        periodName="2026 Spring"
      />
    );
    // Just verify it renders without crashing
    expect(container).toBeDefined();
  });
});

describe("ChartDataTable — reduced motion", () => {
  afterEach(() => {
    // Restore matchMedia after each test so we don't pollute other suites
    vi.restoreAllMocks();
  });

  qaTest("analytics.motion.01", () => {
    // Simulate prefers-reduced-motion: reduce being active
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media:   query,
      addEventListener:    vi.fn(),
      removeEventListener: vi.fn(),
      addListener:         vi.fn(),
      removeListener:      vi.fn(),
    }));

    const { container } = render(
      <ChartDataTable
        caption="Test"
        headers={["Group", "Score"]}
        rows={[["Group 1", "85"]]}
      />
    );

    // The <details> element must be open when reduced motion is active
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details.open).toBe(true);
  });
});

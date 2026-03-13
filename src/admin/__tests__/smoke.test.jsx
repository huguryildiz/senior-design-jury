// Smoke tests: components render without throwing with minimal/empty props
import { beforeEach, describe, expect } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import { render, screen } from "@testing-library/react";
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
          semesterName=""
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
        semesterName="2026 Spring"
      />
    );
    // Just verify it renders without crashing
    expect(container).toBeDefined();
  });
});

import { render, screen, within } from "@testing-library/react";
import { describe, expect, vi } from "vitest";
import OverviewTab from "../OverviewTab";
import { qaTest } from "../../test/qaTest.js";

vi.mock("../JurorActivity", () => ({
  default: () => <div data-testid="juror-activity" />,
}));

describe("OverviewTab", () => {
  qaTest("overview.01", () => {
    render(<OverviewTab jurorStats={[]} groups={[]} metrics={{ totalJurors: 0, totalEvaluations: 0 }} />);

    const completedCard = screen.getByText("Completed Jurors").closest(".stat-card");
    expect(completedCard).not.toBeNull();
    expect(within(completedCard).getByText("—")).toBeInTheDocument();
    expect(completedCard.querySelector(".stat-ring")).toBeNull();

    const scoredCard = screen.getByText("Scored Evaluations").closest(".stat-card");
    expect(scoredCard).not.toBeNull();
    expect(within(scoredCard).getByText("—")).toBeInTheDocument();
    expect(scoredCard.querySelector(".stat-ring")).toBeNull();
  });

  qaTest("overview.02", () => {
    render(
      <OverviewTab
        jurorStats={[]}
        groups={[]}
        metrics={{ totalJurors: 1, completedJurors: 3 }}
      />
    );

    const completedCard = screen.getByText("Completed Jurors").closest(".stat-card");
    expect(completedCard).not.toBeNull();
    const ringLabel = completedCard.querySelector(".stat-ring span");
    expect(ringLabel).not.toBeNull();
    expect(ringLabel.textContent).toBe("100%");
  });
});

import { render, screen, within } from "@testing-library/react";
import { describe, expect, vi } from "vitest";
import OverviewTab from "../OverviewTab";
import { qaTest } from "../../test/qaTest.js";

vi.mock("../overview/JurorActivityTable", () => ({
  default: () => <div data-testid="juror-activity" />,
}));

vi.mock("../overview/CriteriaProgress", () => ({
  default: () => <div data-testid="criteria-progress" />,
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

  qaTest("overview.03", () => {
    render(
      <OverviewTab
        jurorStats={[]}
        groups={[]}
        metrics={{
          totalJurors: 5,
          completedJurors: 2,
          inProgressJurors: 1,
          readyToSubmitJurors: 0, // zero — must NOT appear
          editingJurors: 0,       // zero — must NOT appear
          totalEvaluations: 15,
        }}
      />
    );

    const completedCard = screen.getByText("Completed Jurors").closest(".stat-card");
    expect(within(completedCard).getByText("1 in progress")).toBeInTheDocument();
    expect(within(completedCard).queryByText(/0 ready/)).toBeNull();
    expect(within(completedCard).queryByText(/0 editing/)).toBeNull();
  });

  qaTest("overview.04", () => {
    // When scoredEvaluations < totalEvaluations, sub "N total" should appear
    render(
      <OverviewTab
        jurorStats={[]}
        groups={[]}
        metrics={{
          totalJurors: 2,
          totalEvaluations: 10,
          scoredEvaluations: 7,
        }}
      />
    );
    const scoredCard = screen.getByText("Scored Evaluations").closest(".stat-card");
    expect(within(scoredCard).getByText("10 total")).toBeInTheDocument();

    // When all are scored, sub should NOT appear
    render(
      <OverviewTab
        jurorStats={[]}
        groups={[]}
        metrics={{
          totalJurors: 2,
          totalEvaluations: 10,
          scoredEvaluations: 10,
        }}
      />
    );
    const cards = screen.getAllByText("Scored Evaluations");
    const secondCard = cards[cards.length - 1].closest(".stat-card");
    expect(within(secondCard).queryByText(/total/)).toBeNull();
  });

  qaTest("overview.05", () => {
    const onGoToSettings = vi.fn();
    render(
      <OverviewTab
        jurorStats={[]}
        groups={[]}
        metrics={{ totalJurors: 0, totalEvaluations: 0 }}
        onGoToSettings={onGoToSettings}
      />
    );

    const settingsBtn = screen.getByRole("button", { name: /settings/i });
    expect(settingsBtn).toBeInTheDocument();
  });
});

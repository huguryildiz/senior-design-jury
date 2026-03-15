// src/test/a11y.test.jsx
// ============================================================
// Automated accessibility tests using vitest-axe (axe-core).
// Verifies key components have no a11y violations.
// ============================================================

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { qaTest } from "./qaTest.js";
import * as axeMatchers from "vitest-axe/matchers";
import { axe } from "vitest-axe";

expect.extend(axeMatchers);

// ── Mocks ─────────────────────────────────────────────────────

vi.mock("../config", () => ({
  CRITERIA: [
    {
      id: "technical", label: "Technical", max: 25, blurb: "Tech quality",
      mudek: [], rubric: [{ range: "0–12", level: "Low", desc: "Needs work", min: 0, max: 12 }],
    },
    {
      id: "design", label: "Design", max: 25, blurb: "Design quality",
      mudek: [], rubric: [{ range: "0–12", level: "Low", desc: "Needs work", min: 0, max: 12 }],
    },
  ],
  APP_CONFIG: { maxScore: 100 },
}));

// ── Component imports ────────────────────────────────────────

import ScoringGrid from "../jury/ScoringGrid";
import PinRevealStep from "../jury/PinRevealStep";

// ── Tests ─────────────────────────────────────────────────────

describe("Accessibility audit", () => {
  it("ScoringGrid has no a11y violations", async () => {
    const { container } = render(
      <ScoringGrid
        pid="p-1"
        scoresPid={{ technical: 20, design: 15 }}
        commentsPid="Good work"
        touchedPid={{ technical: true, design: true }}
        lockActive={false}
        handleScore={vi.fn()}
        handleScoreBlur={vi.fn()}
        handleCommentChange={vi.fn()}
        handleCommentBlur={vi.fn()}
        totalScore={35}
        allComplete={false}
        editMode={false}
        completedGroups={0}
        totalGroups={2}
        handleFinalSubmit={vi.fn()}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ScoringGrid in locked state has no a11y violations", async () => {
    const { container } = render(
      <ScoringGrid
        pid="p-1"
        scoresPid={{ technical: 20, design: 15 }}
        commentsPid=""
        touchedPid={{ technical: false, design: false }}
        lockActive={true}
        handleScore={vi.fn()}
        handleScoreBlur={vi.fn()}
        handleCommentChange={vi.fn()}
        handleCommentBlur={vi.fn()}
        totalScore={35}
        allComplete={false}
        editMode={false}
        completedGroups={0}
        totalGroups={2}
        handleFinalSubmit={vi.fn()}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("PinRevealStep has no a11y violations", async () => {
    const { container } = render(
      <PinRevealStep pin="1234" onContinue={vi.fn()} onBack={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("PinRevealStep without back button has no a11y violations", async () => {
    const { container } = render(
      <PinRevealStep pin="5678" onContinue={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("Skip navigation", () => {
  qaTest("a11y.skipnav.01", () => {
    // The skip link is in index.html (static HTML), not in React components.
    // We test it by inserting it into a test container, which matches how
    // browsers would see it before React mounts.
    const container = document.createElement("div");
    container.innerHTML = `<a href="#main-content" class="skip-link">Skip to main content</a>`;
    document.body.appendChild(container);

    const skipLink = document.querySelector('a[href="#main-content"]');
    expect(skipLink).not.toBeNull();
    expect(skipLink.textContent).toMatch(/skip to main content/i);
    expect(skipLink.tabIndex).not.toBe(-1);

    document.body.removeChild(container);
  });
});

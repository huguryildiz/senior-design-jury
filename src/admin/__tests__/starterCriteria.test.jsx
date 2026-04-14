// src/admin/__tests__/starterCriteria.test.jsx
// ============================================================
// StarterCriteriaDrawer — data integrity + component tests
// ============================================================

import { describe, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { qaTest } from "../../test/qaTest.js";
import StarterCriteriaDrawer, {
  STARTER_CRITERIA,
} from "../drawers/StarterCriteriaDrawer.jsx";

// ── Mock Drawer so tests don't need the full UI shell ──────

vi.mock("@/shared/ui/Drawer", () => ({
  default: ({ open, children }) =>
    open ? <div data-testid="drawer">{children}</div> : null,
}));

vi.mock("@/shared/ui/FbAlert", () => ({
  default: ({ children, variant }) => (
    <div data-testid={`fbalert-${variant}`}>{children}</div>
  ),
}));

vi.mock("@/shared/ui/CustomSelect", () => ({
  default: ({ value, onChange, options, disabled, placeholder }) => (
    <select
      data-testid="custom-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {(options || []).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

// ── REQUIRED_KEYS ─────────────────────────────────────────

const REQUIRED_KEYS = ["key", "label", "shortLabel", "color", "max", "blurb", "outcomes", "rubric"];
const RUBRIC_LEVELS = ["Excellent", "Good", "Developing", "Insufficient"];

// ── Data integrity ─────────────────────────────────────────

describe("STARTER_CRITERIA — data integrity", () => {
  qaTest("criteria.starter.01", () => {
    expect(STARTER_CRITERIA).toHaveLength(4);
  });

  qaTest("criteria.starter.02", () => {
    const total = STARTER_CRITERIA.reduce((sum, c) => sum + c.max, 0);
    expect(total).toBe(100);
  });

  qaTest("criteria.starter.03", () => {
    for (const criterion of STARTER_CRITERIA) {
      for (const key of REQUIRED_KEYS) {
        expect(criterion).toHaveProperty(key);
      }
    }
  });

  qaTest("criteria.starter.04", () => {
    for (const criterion of STARTER_CRITERIA) {
      expect(criterion.rubric).toHaveLength(4);
      const levels = criterion.rubric.map((b) => b.level);
      for (const expected of RUBRIC_LEVELS) {
        expect(levels).toContain(expected);
      }
    }
  });
});

// ── Component — Use Template ───────────────────────────────

describe("StarterCriteriaDrawer — Use Template", () => {
  qaTest("criteria.starter.05", () => {
    const onApplyTemplate = vi.fn();
    render(
      <StarterCriteriaDrawer
        open={true}
        onClose={vi.fn()}
        draftCriteria={[]}
        otherPeriods={[]}
        isLocked={false}
        onApplyTemplate={onApplyTemplate}
        onCopyFromPeriod={vi.fn()}
      />
    );

    const useBtn = screen.getByRole("button", { name: /use template/i });
    fireEvent.click(useBtn);

    expect(onApplyTemplate).toHaveBeenCalledOnce();
    expect(onApplyTemplate).toHaveBeenCalledWith(STARTER_CRITERIA);
  });
});

// ── Component — Copy & Use ─────────────────────────────────

describe("StarterCriteriaDrawer — Copy & Use", () => {
  qaTest("criteria.starter.06", () => {
    const onCopyFromPeriod = vi.fn();
    const periods = [{ id: "period-abc", name: "Spring 2026", criteria_count: 4 }];

    render(
      <StarterCriteriaDrawer
        open={true}
        onClose={vi.fn()}
        draftCriteria={[]}
        otherPeriods={periods}
        isLocked={false}
        onApplyTemplate={vi.fn()}
        onCopyFromPeriod={onCopyFromPeriod}
      />
    );

    // Select a period via the mocked CustomSelect
    const select = screen.getByTestId("custom-select");
    fireEvent.change(select, { target: { value: "period-abc" } });

    const copyBtn = screen.getByRole("button", { name: /copy & use/i });
    fireEvent.click(copyBtn);

    expect(onCopyFromPeriod).toHaveBeenCalledOnce();
    expect(onCopyFromPeriod).toHaveBeenCalledWith("period-abc");
  });
});

// ── Component — Overwrite warning ─────────────────────────

describe("StarterCriteriaDrawer — overwrite warning", () => {
  qaTest("criteria.starter.07", () => {
    const existingCriteria = [
      { key: "existing-01", label: "Test", shortLabel: "T", color: "#000", max: 100, blurb: "", outcomes: [], rubric: [] },
    ];

    render(
      <StarterCriteriaDrawer
        open={true}
        onClose={vi.fn()}
        draftCriteria={existingCriteria}
        otherPeriods={[]}
        isLocked={false}
        onApplyTemplate={vi.fn()}
        onCopyFromPeriod={vi.fn()}
      />
    );

    // Warning should appear (at least once — it renders in both Copy and Template sections)
    const warnings = screen.getAllByTestId("fbalert-warning");
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0]).toHaveTextContent(/replace your current criteria/i);
  });
});

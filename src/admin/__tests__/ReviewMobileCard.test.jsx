import { describe, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReviewMobileCard from "../components/ReviewMobileCard";
import { qaTest } from "../../test/qaTest.js";

// ReviewMobileCard uses jurorIdentity (pure functions) — no supabase needed.

const CRITERIA_4 = [
  { id: "technical", label: "Technical", shortLabel: "Tech", max: 30 },
  { id: "design",    label: "Design",    shortLabel: "Design", max: 30 },
  { id: "delivery",  label: "Delivery",  shortLabel: "Delivery", max: 30 },
  { id: "teamwork",  label: "Teamwork",  shortLabel: "Teamwork", max: 10 },
];

const CRITERIA_3 = [
  { id: "technical", label: "Technical", shortLabel: "Tech", max: 30 },
  { id: "design",    label: "Design",    shortLabel: "Design", max: 30 },
  { id: "delivery",  label: "Delivery",  shortLabel: "Delivery", max: 30 },
];

const FULL_ROW = {
  jurorId: "j1",
  juryName: "Dr. Aslıhan Koçak",
  affiliation: "TED University, EE",
  groupNo: 5,
  title: "Biomedical Signal Processing for Sleep Apnea Detection",
  students: "Emre Arslan, Beren Kaya, Mert Can",
  technical: 25,
  design: 28,
  delivery: 22,
  teamwork: 6,
  total: 81,
  effectiveStatus: "scored",
  jurorStatus: "completed",
  comments: "",
};

describe("ReviewMobileCard", () => {
  qaTest("reviews.mobile_card.01", () => {
    render(<ReviewMobileCard row={FULL_ROW} criteria={CRITERIA_4} />);
    // Score values appear in cells
    expect(screen.getByText("25")).toBeTruthy();
    expect(screen.getByText("28")).toBeTruthy();
    expect(screen.getByText("22")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    // All 4 criterion labels present
    expect(screen.getByText("TECH")).toBeTruthy();
    expect(screen.getByText("DESIGN")).toBeTruthy();
    expect(screen.getByText("DELIVERY")).toBeTruthy();
    expect(screen.getByText("TEAMWORK")).toBeTruthy();
    // Total ring label
    expect(screen.getByText("81")).toBeTruthy();
  });

  qaTest("reviews.mobile_card.02", () => {
    const partialRow = { ...FULL_ROW, effectiveStatus: "partial", design: null, total: 53 };
    const { container } = render(<ReviewMobileCard row={partialRow} criteria={CRITERIA_4} />);
    expect(container.querySelector(".rmc-card--partial")).toBeTruthy();
  });

  qaTest("reviews.mobile_card.03", () => {
    const emptyRow = {
      ...FULL_ROW,
      technical: null, design: null, delivery: null, teamwork: null,
      total: null,
      effectiveStatus: "empty",
      jurorStatus: "not_started",
    };
    render(<ReviewMobileCard row={emptyRow} criteria={CRITERIA_4} />);
    // Ring center shows em-dash when total is null
    expect(screen.getByText("—")).toBeTruthy();
    // All score cells have the empty class (opacity: 0.4)
    const cells = document.querySelectorAll(".rmc-score-cell--empty");
    expect(cells.length).toBe(4);
  });

  qaTest("reviews.mobile_card.04", () => {
    const noTeamRow = { ...FULL_ROW, students: "" };
    const { container } = render(<ReviewMobileCard row={noTeamRow} criteria={CRITERIA_4} />);
    expect(container.querySelector(".rmc-team-row")).toBeNull();
  });

  qaTest("reviews.mobile_card.05", () => {
    const fiveMemberRow = {
      ...FULL_ROW,
      students: "Alice Smith, Bob Jones, Carol White, Dave Brown, Eve Davis",
    };
    render(<ReviewMobileCard row={fiveMemberRow} criteria={CRITERIA_4} />);
    // First 4 show surnames; overflow chip shows +1
    expect(screen.getByText(/Smith/)).toBeTruthy();
    expect(screen.getByText(/Jones/)).toBeTruthy();
    expect(screen.getByText(/White/)).toBeTruthy();
    expect(screen.getByText(/Brown/)).toBeTruthy();
    expect(screen.getByText("+1")).toBeTruthy();
    // Eve Davis must NOT appear as a chip
    expect(screen.queryByText(/Davis/)).toBeNull();
  });

  qaTest("reviews.mobile_card.06", () => {
    const threeRow = { ...FULL_ROW, delivery: 22, teamwork: undefined };
    const { container } = render(<ReviewMobileCard row={threeRow} criteria={CRITERIA_3} />);
    // Last cell (index 2, odd count) must span 2 columns
    const spanCell = container.querySelector(".rmc-score-cell--span");
    expect(spanCell).toBeTruthy();
    // Only one span cell
    const spanCells = container.querySelectorAll(".rmc-score-cell--span");
    expect(spanCells.length).toBe(1);
  });

  qaTest("reviews.mobile_card.07", () => {
    const withComment = { ...FULL_ROW, comments: "Excellent presentation." };
    const { container } = render(<ReviewMobileCard row={withComment} criteria={CRITERIA_4} />);
    // MessageSquare icon is rendered via lucide-react as an svg
    const footer = container.querySelector(".rmc-footer-left");
    expect(footer).toBeTruthy();
    // lucide-react renders SVGs — check one is present inside the footer-left
    expect(footer.querySelector("svg")).toBeTruthy();
  });
});

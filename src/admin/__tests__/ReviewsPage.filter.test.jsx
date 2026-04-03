// src/admin/__tests__/ReviewsPage.filter.test.jsx
// ============================================================
// Phase A safety tests — lock Reviews filter pipeline behavior.
// ============================================================

import { beforeAll, beforeEach, describe, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/auth", () => ({
  useAuth: () => ({ activeOrganization: null }),
}));

import ReviewsPage from "../ReviewsPage";
import { qaTest } from "../../test/qaTest.js";

function setDesktopViewport() {
  Object.defineProperty(window, "innerWidth", { value: 1440, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 900, writable: true });
  window.dispatchEvent(new Event("resize"));
}

function createMatchMedia() {
  return vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Three rows across three different groups, with different score statuses.
// Row A (group 1) — fully scored → effectiveStatus "scored"
// Row B (group 2) — partially scored → effectiveStatus "partial"
// Row C (group 3) — not scored at all → effectiveStatus "empty"
function makeMultiGroupData() {
  return [
    {
      period: "2026 Spring",
      jurorId: "j1",
      juryName: "Alice",
      affiliation: "EE",
      projectId: "p1",
      groupNo: 1,
      projectName: "Project Alpha",
      students: "A Student",
      technical: 25,
      design: 25,
      delivery: 20,
      teamwork: 8,
      total: 78,
      comments: "good",
      updatedAt: "2026-03-10T10:00:00.000Z",
      updatedMs: new Date("2026-03-10T10:00:00.000Z").getTime(),
      finalSubmittedAt: "2026-03-10T11:00:00.000Z",
      finalSubmittedMs: new Date("2026-03-10T11:00:00.000Z").getTime(),
    },
    {
      period: "2026 Spring",
      jurorId: "j2",
      juryName: "Bob",
      affiliation: "EE",
      projectId: "p2",
      groupNo: 2,
      projectName: "Project Beta",
      students: "B Student",
      technical: 20,
      design: null,
      delivery: null,
      teamwork: null,
      total: null,
      comments: "",
      updatedAt: "2026-03-11T09:00:00.000Z",
      updatedMs: new Date("2026-03-11T09:00:00.000Z").getTime(),
      finalSubmittedAt: "",
      finalSubmittedMs: 0,
    },
    {
      period: "2026 Spring",
      jurorId: "j3",
      juryName: "Cara",
      affiliation: "EE",
      projectId: "p3",
      groupNo: 3,
      projectName: "Project Gamma",
      students: "C Student",
      technical: null,
      design: null,
      delivery: null,
      teamwork: null,
      total: null,
      comments: "",
      updatedAt: "2026-03-12T12:00:00.000Z",
      updatedMs: new Date("2026-03-12T12:00:00.000Z").getTime(),
      finalSubmittedAt: "",
      finalSubmittedMs: 0,
    },
  ];
}

function makeJurors() {
  return [
    { key: "j1", jurorId: "j1", name: "Alice", dept: "EE", editEnabled: false },
    { key: "j2", jurorId: "j2", name: "Bob", dept: "EE", editEnabled: false },
    { key: "j3", jurorId: "j3", name: "Cara", dept: "EE", editEnabled: false },
  ];
}

function renderMultiGroupDetails() {
  const data = makeMultiGroupData();
  const jurors = makeJurors();
  return render(
    <ReviewsPage
      data={data}
      jurors={jurors}
      assignedJurors={jurors}
      groups={[]}
      periodName="2026 Spring"
      summaryData={[]}
      loading={false}
    />
  );
}

function openFilterPanel() {
  fireEvent.click(screen.getByRole("button", { name: "Filter" }));
}

function setPanelSelect(label, value) {
  const groups = Array.from(document.querySelectorAll(".filter-group"));
  const group = groups.find((g) => g.querySelector("label")?.textContent?.trim() === label);
  const select = group?.querySelector("select");
  expect(select).toBeTruthy();
  fireEvent.change(select, { target: { value } });
}

function rowFor(name) {
  return screen.queryByRole("row", { name: new RegExp(`\\b${name}\\b`) });
}

describe("Reviews filter pipeline — Phase A safety", () => {
  beforeAll(() => {
    window.matchMedia = createMatchMedia();
  });

  beforeEach(() => {
    localStorage.clear();
    setDesktopViewport();
  });

  // phaseA.filter.01 — multi-select group and status filter
  qaTest("phaseA.filter.01", async () => {
    renderMultiGroupDetails();

    // Baseline: all three jurors visible before any filter
    expect(rowFor("Alice")).toBeInTheDocument();
    expect(rowFor("Bob")).toBeInTheDocument();
    expect(rowFor("Cara")).toBeInTheDocument();

    openFilterPanel();
    setPanelSelect("Project", "Project Alpha");

    await waitFor(() => {
      expect(rowFor("Alice")).toBeInTheDocument();
      expect(rowFor("Bob")).toBeNull();
      expect(rowFor("Cara")).toBeNull();
    });

    setPanelSelect("Score Status", "scored");

    await waitFor(() => {
      // Alice is in group 1 AND scored — must appear
      expect(rowFor("Alice")).toBeInTheDocument();
      expect(rowFor("Bob")).toBeNull();
      expect(rowFor("Cara")).toBeNull();
    });
  });

  // phaseA.filter.02 — no-filter baseline: all rows shown
  qaTest("phaseA.filter.02", async () => {
    renderMultiGroupDetails();

    // With no filters active all three rows must be visible
    expect(rowFor("Alice")).toBeInTheDocument();
    expect(rowFor("Bob")).toBeInTheDocument();
    expect(rowFor("Cara")).toBeInTheDocument();

    // Export panel reflects full row count
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByText("3 reviews · 3 jurors · 2026 Spring")).toBeInTheDocument();
  });

  // phaseA.filter.03 — activeFilterCount: no filter chips when no filters active
  qaTest("phaseA.filter.03", async () => {
    renderMultiGroupDetails();

    expect(screen.queryByText(/filter applied/i)).toBeNull();

    openFilterPanel();
    setPanelSelect("Score Status", "scored");

    await waitFor(() => {
      expect(screen.getByText("1 filter applied — showing 1 of 3 results")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Clear filters →"));

    await waitFor(() => {
      expect(screen.queryByText(/filter applied/i)).toBeNull();
      expect(rowFor("Alice")).toBeInTheDocument();
      expect(rowFor("Bob")).toBeInTheDocument();
      expect(rowFor("Cara")).toBeInTheDocument();
    });
  });
});

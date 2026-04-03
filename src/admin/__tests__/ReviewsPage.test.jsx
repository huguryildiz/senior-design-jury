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
    matches: query.includes("hover: none") || query.includes("pointer: coarse") ? false : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderDetails() {
  const data = [
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
      editingFlag: "editing",
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
  const jurors = [
    { key: "j1", jurorId: "j1", name: "Alice", dept: "EE", editEnabled: false },
    { key: "j2", jurorId: "j2", name: "Bob", dept: "EE", editEnabled: true },
    { key: "j3", jurorId: "j3", name: "Cara", dept: "EE", editEnabled: false },
  ];

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

function renderDetails2() {
  // Extended fixture with 4 rows for consistency tests
  const data = [
    {
      period: "2026 Spring", jurorId: "j1", juryName: "Alice", affiliation: "EE",
      projectId: "p1", groupNo: 1, projectName: "Project Alpha", students: "A Student",
      technical: 25, design: 25, delivery: 20, teamwork: 8, total: 78, comments: "good",
      updatedAt: "2026-03-10T10:00:00.000Z", updatedMs: new Date("2026-03-10T10:00:00.000Z").getTime(),
      finalSubmittedAt: "2026-03-10T11:00:00.000Z", finalSubmittedMs: new Date("2026-03-10T11:00:00.000Z").getTime(),
    },
    {
      period: "2026 Spring", jurorId: "j2", juryName: "Bob", affiliation: "EE",
      projectId: "p2", groupNo: 2, projectName: "Project Beta", students: "B Student",
      technical: 20, design: null, delivery: null, teamwork: null, total: null, comments: "",
      updatedAt: "2026-03-11T09:00:00.000Z", updatedMs: new Date("2026-03-11T09:00:00.000Z").getTime(),
      finalSubmittedAt: "", finalSubmittedMs: 0, editingFlag: "editing",
    },
    {
      period: "2026 Spring", jurorId: "j3", juryName: "Cara", affiliation: "EE",
      projectId: "p3", groupNo: 3, projectName: "Project Gamma", students: "C Student",
      technical: null, design: null, delivery: null, teamwork: null, total: null, comments: "",
      updatedAt: "2026-03-12T12:00:00.000Z", updatedMs: new Date("2026-03-12T12:00:00.000Z").getTime(),
      finalSubmittedAt: "", finalSubmittedMs: 0,
    },
    {
      period: "2026 Spring", jurorId: "j4", juryName: "Dave", affiliation: "CS",
      projectId: "p4", groupNo: 4, projectName: "Project Delta", students: "D Student",
      technical: null, design: null, delivery: null, teamwork: null, total: null, comments: "",
      updatedAt: "2026-03-13T08:00:00.000Z", updatedMs: new Date("2026-03-13T08:00:00.000Z").getTime(),
      finalSubmittedAt: "", finalSubmittedMs: 0,
    },
  ];
  const jurors = [
    { key: "j1", jurorId: "j1", name: "Alice", dept: "EE", editEnabled: false },
    { key: "j2", jurorId: "j2", name: "Bob", dept: "EE", editEnabled: true },
    { key: "j3", jurorId: "j3", name: "Cara", dept: "EE", editEnabled: false },
    { key: "j4", jurorId: "j4", name: "Dave", dept: "CS", editEnabled: false },
  ];
  return render(
    <ReviewsPage
      data={data} jurors={jurors} assignedJurors={jurors}
      groups={[]} periodName="2026 Spring" summaryData={[]} loading={false}
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

describe("Reviews filters", () => {
  beforeAll(() => {
    window.matchMedia = createMatchMedia();
  });

  beforeEach(() => {
    localStorage.clear();
    setDesktopViewport();
  });

  qaTest("details.01", async () => {
    renderDetails();
    expect(rowFor("Alice")).toBeInTheDocument();
    expect(rowFor("Bob")).toBeInTheDocument();
    expect(rowFor("Cara")).toBeInTheDocument();

    openFilterPanel();
    setPanelSelect("Score Status", "scored");

    await waitFor(() => {
      expect(rowFor("Alice")).toBeInTheDocument();
      expect(rowFor("Bob")).toBeNull();
      expect(rowFor("Cara")).toBeNull();
    });
  });

  qaTest("details.02", async () => {
    renderDetails();
    openFilterPanel();
    setPanelSelect("Juror Status", "editing");

    await waitFor(() => {
      expect(rowFor("Bob")).toBeInTheDocument();
      expect(rowFor("Alice")).toBeNull();
      expect(rowFor("Cara")).toBeNull();
    });
  });

  qaTest("details.03", async () => {
    renderDetails();
    const search = screen.getByPlaceholderText("Search juror or project...");
    fireEvent.change(search, { target: { value: "Project Beta" } });

    await waitFor(() => {
      expect(rowFor("Alice")).toBeNull();
      expect(rowFor("Bob")).toBeInTheDocument();
      expect(rowFor("Cara")).toBeNull();
    });
  });

  qaTest("details.04", async () => {
    renderDetails();
    const search = screen.getByPlaceholderText("Search juror or project...");
    fireEvent.change(search, { target: { value: "alice" } });

    await waitFor(() => {
      expect(rowFor("Alice")).toBeInTheDocument();
      expect(rowFor("Bob")).toBeNull();
      expect(rowFor("Cara")).toBeNull();
    });

    fireEvent.click(screen.getByText("Clear filters →"));

    await waitFor(() => {
      expect(rowFor("Alice")).toBeInTheDocument();
      expect(rowFor("Bob")).toBeInTheDocument();
      expect(rowFor("Cara")).toBeInTheDocument();
    });
  });

  qaTest("results.consistency.01", async () => {
    // Juror Status "Completed" filter must show only finalized, non-editing jurors
    renderDetails2();

    openFilterPanel();
    setPanelSelect("Juror Status", "completed");

    await waitFor(() => {
      expect(rowFor("Alice")).toBeInTheDocument(); // finalSubmittedAt set
      expect(rowFor("Bob")).toBeNull();            // editing
      expect(rowFor("Cara")).toBeNull();           // not started
      expect(rowFor("Dave")).toBeNull();           // not started
    });
  });

  qaTest("results.consistency.02", async () => {
    // Score Status "Scored" filter must show only rows where total is non-null
    renderDetails2();

    openFilterPanel();
    setPanelSelect("Score Status", "scored");

    await waitFor(() => {
      expect(rowFor("Alice")).toBeInTheDocument(); // total=78
      expect(rowFor("Bob")).toBeNull();            // total=null
      expect(rowFor("Cara")).toBeNull();           // total=null
      expect(rowFor("Dave")).toBeNull();           // total=null
    });
  });

  qaTest("results.consistency.03", async () => {
    // Score Status "Partial" filter must show only rows with some but not all criteria
    renderDetails2();

    openFilterPanel();
    setPanelSelect("Score Status", "partial");

    await waitFor(() => {
      expect(rowFor("Bob")).toBeInTheDocument(); // has technical only
      expect(rowFor("Alice")).toBeNull();        // fully scored
      expect(rowFor("Cara")).toBeNull();         // empty
      expect(rowFor("Dave")).toBeNull();         // empty
    });
  });

  qaTest("results.consistency.04", async () => {
    // Combined filters enforce AND logic (Project + Score Status)
    renderDetails2();

    openFilterPanel();
    setPanelSelect("Project", "Project Beta");
    setPanelSelect("Score Status", "partial");

    await waitFor(() => {
      expect(rowFor("Bob")).toBeInTheDocument();
      expect(rowFor("Alice")).toBeNull();
      expect(rowFor("Cara")).toBeNull();
      expect(rowFor("Dave")).toBeNull();
    });
  });
});

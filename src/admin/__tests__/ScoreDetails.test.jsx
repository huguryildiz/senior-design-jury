import { beforeAll, beforeEach, describe, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ScoreDetails from "../ScoreDetails";
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
      semester: "2026 Spring",
      jurorId: "j1",
      juryName: "Alice",
      juryDept: "EE",
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
      semester: "2026 Spring",
      jurorId: "j2",
      juryName: "Bob",
      juryDept: "EE",
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
      semester: "2026 Spring",
      jurorId: "j3",
      juryName: "Cara",
      juryDept: "EE",
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
    <ScoreDetails
      data={data}
      jurors={jurors}
      assignedJurors={jurors}
      groups={[]}
      semesterName="2026 Spring"
      summaryData={[]}
      loading={false}
    />
  );
}

describe("ScoreDetails filters", () => {
  beforeAll(() => {
    window.matchMedia = createMatchMedia();
  });

  beforeEach(() => {
    localStorage.clear();
    setDesktopViewport();
  });

  qaTest("details.01", async () => {
    renderDetails();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Cara")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filter by Score Status" }));
    fireEvent.click(screen.getByLabelText("All Statuses"));
    fireEvent.click(screen.getByLabelText("Scored"));

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.queryByText("Bob")).toBeNull();
      expect(screen.queryByText("Cara")).toBeNull();
    });
  });

  qaTest("details.02", async () => {
    renderDetails();
    fireEvent.click(screen.getByRole("button", { name: "Filter by Juror Status" }));
    fireEvent.click(screen.getByLabelText("All Statuses"));
    fireEvent.click(screen.getByLabelText("Editing"));

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.queryByText("Alice")).toBeNull();
      expect(screen.queryByText("Cara")).toBeNull();
    });
  });

  qaTest("details.03", async () => {
    renderDetails();
    fireEvent.click(screen.getByRole("button", { name: "Filter by Updated At" }));
    const popover = document.querySelector(".col-filter-popover-timestamp");
    const fromInput = popover?.querySelector('input[type="datetime-local"]');
    expect(fromInput).not.toBeNull();
    fireEvent.change(fromInput, { target: { value: "2026-03-11T00:00" } });
    fireEvent.blur(fromInput);

    await waitFor(() => {
      expect(screen.queryByText("Alice")).toBeNull();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Cara")).toBeInTheDocument();
    });
  });

  qaTest("details.04", async () => {
    renderDetails();
    fireEvent.click(screen.getByRole("button", { name: "Filter by Updated At" }));
    const popover = document.querySelector(".col-filter-popover-timestamp");
    const inputs = popover?.querySelectorAll('input[type="datetime-local"]');
    const fromInput = inputs?.[0];
    const toInput = inputs?.[1];
    expect(fromInput).not.toBeNull();
    expect(toInput).not.toBeNull();

    fireEvent.change(fromInput, { target: { value: "2026-03-12T00:00" } });
    fireEvent.change(toInput, { target: { value: "2026-03-10T00:00" } });
    fireEvent.blur(toInput);

    await waitFor(() => {
      expect(screen.getByText("The 'From' date cannot be later than the 'To' date.")).toBeInTheDocument();
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Cara")).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManageOrganizationsPanel from "../settings/ManageOrganizationsPanel";

vi.mock("../LastActivity", () => ({
  default: () => <span>Last activity</span>,
}));

const approveMock = vi.fn();
const rejectMock = vi.fn();

const BASE_PROPS = {
  isMobile: false,
  isOpen: true,
  onToggle: vi.fn(),
  orgList: [
    {
      id: "t1",
      code: "tedu-ee",
      shortLabel: "TEDU EE",
      university: "TED University",
      department: "Electrical Engineering",
      status: "active",
      created_at: "2026-03-01T10:00:00Z",
      updated_at: "2026-03-02T10:00:00Z",
      tenantAdmins: [
        { name: "Alice Smith", email: "alice@tedu.edu", status: "approved" },
      ],
      pendingApplications: [
        {
          applicationId: "app-1",
          name: "Bob Jones",
          email: "bob@tedu.edu",
          status: "pending",
          createdAt: "2026-03-03T10:00:00Z",
        },
      ],
    },
  ],
  filteredOrgs: [],
  error: "",
  search: "",
  setSearch: vi.fn(),
  showCreate: false,
  createForm: { code: "", shortLabel: "", university: "", department: "" },
  setCreateForm: vi.fn(),
  createError: "",
  openCreate: vi.fn(),
  closeCreate: vi.fn(),
  handleCreateOrg: vi.fn(),
  showEdit: false,
  editForm: { id: "", code: "", shortLabel: "", university: "", department: "", status: "active", created_at: "", updated_at: "" },
  setEditForm: vi.fn(),
  editError: "",
  openEdit: vi.fn(),
  closeEdit: vi.fn(),
  handleUpdateOrg: vi.fn(),
  handleApproveApplication: approveMock,
  handleRejectApplication: rejectMock,
  isDirty: false,
};

describe("ManageOrganizationsPanel", () => {
  beforeEach(() => {
    approveMock.mockClear();
    rejectMock.mockClear();
  });

  it("shows organization admins in review modal", () => {
    render(<ManageOrganizationsPanel {...BASE_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: /review admins for tedu ee/i }));

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /alice@tedu\.edu/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bob@tedu\.edu/i })).toBeInTheDocument();
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending approval").length).toBeGreaterThan(0);
  });

  it("calls approve/reject handlers for pending rows", () => {
    render(<ManageOrganizationsPanel {...BASE_PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: /review admins for tedu ee/i }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(approveMock).toHaveBeenCalledWith("app-1");
    expect(rejectMock).toHaveBeenCalledWith("app-1");
  });
});

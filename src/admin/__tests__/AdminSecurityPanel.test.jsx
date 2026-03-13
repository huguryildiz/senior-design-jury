import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminSecurityPanel from "../../components/admin/AdminSecurityPanel";
import { ToastProvider } from "../../components/toast/useToast";

// Prevent real API calls — return safe defaults
vi.mock("../../shared/api", async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    adminSecurityState: vi.fn().mockResolvedValue({
      admin_password_set: true,
      delete_password_set: true,
      backup_password_set: true,
    }),
    adminChangePassword: vi.fn().mockResolvedValue({}),
    adminChangeDeletePassword: vi.fn().mockResolvedValue({}),
    adminChangeBackupPassword: vi.fn().mockResolvedValue({}),
    adminBootstrapDeletePassword: vi.fn().mockResolvedValue({}),
    adminBootstrapBackupPassword: vi.fn().mockResolvedValue({}),
  };
});

const DEFAULT_PROPS = {
  isMobile: false,
  isOpen: true,
  onToggle: vi.fn(),
  onPasswordChanged: vi.fn(),
  adminPass: "testAdminPass",
};

function renderPanel(overrides = {}) {
  return render(
    <ToastProvider>
      <AdminSecurityPanel {...DEFAULT_PROPS} {...overrides} />
    </ToastProvider>
  );
}

/** Returns the three password inputs in the active Admin tab: [current, new, confirm] */
function getPasswordInputs(container) {
  return container.querySelectorAll('input[type="password"]');
}

describe("AdminSecurityPanel — password strength validation (Admin tab)", () => {
  it("shows error when new password is shorter than 10 characters", async () => {
    const { container } = renderPanel();
    await waitFor(() => {}); // let useEffect + adminSecurityState settle

    const inputs = getPasswordInputs(container);
    fireEvent.change(inputs[0], { target: { value: "current1!" } });
    fireEvent.change(inputs[1], { target: { value: "short" } });
    fireEvent.change(inputs[2], { target: { value: "short" } });

    fireEvent.click(screen.getByRole("button", { name: /update admin password/i }));

    await waitFor(() => {
      expect(screen.getByText(/use at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it("shows error when new password has no uppercase letter", async () => {
    const { container } = renderPanel();
    await waitFor(() => {});

    const inputs = getPasswordInputs(container);
    fireEvent.change(inputs[0], { target: { value: "current1!" } });
    fireEvent.change(inputs[1], { target: { value: "alllowercase1!" } });
    fireEvent.change(inputs[2], { target: { value: "alllowercase1!" } });

    fireEvent.click(screen.getByRole("button", { name: /update admin password/i }));

    await waitFor(() => {
      expect(screen.getByText(/use at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it("shows error when new password has no digit", async () => {
    const { container } = renderPanel();
    await waitFor(() => {});

    const inputs = getPasswordInputs(container);
    fireEvent.change(inputs[0], { target: { value: "current1!" } });
    fireEvent.change(inputs[1], { target: { value: "NoDigitsHere!" } });
    fireEvent.change(inputs[2], { target: { value: "NoDigitsHere!" } });

    fireEvent.click(screen.getByRole("button", { name: /update admin password/i }));

    await waitFor(() => {
      expect(screen.getByText(/use at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it("shows error when new password has no symbol", async () => {
    const { container } = renderPanel();
    await waitFor(() => {});

    const inputs = getPasswordInputs(container);
    fireEvent.change(inputs[0], { target: { value: "current1!" } });
    fireEvent.change(inputs[1], { target: { value: "NoSymbol1234" } });
    fireEvent.change(inputs[2], { target: { value: "NoSymbol1234" } });

    fireEvent.click(screen.getByRole("button", { name: /update admin password/i }));

    await waitFor(() => {
      expect(screen.getByText(/use at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it("shows error when new and confirm passwords do not match", async () => {
    const { container } = renderPanel();
    await waitFor(() => {});

    const inputs = getPasswordInputs(container);
    fireEvent.change(inputs[0], { target: { value: "current1!" } });
    fireEvent.change(inputs[1], { target: { value: "StrongPass1!" } });
    fireEvent.change(inputs[2], { target: { value: "DifferentPass1!" } });

    fireEvent.click(screen.getByRole("button", { name: /update admin password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });
});

describe("AdminSecurityPanel — successful admin password change", () => {
  it("calls onPasswordChanged after valid form submission", async () => {
    const { adminChangePassword } = await import("../../shared/api");
    adminChangePassword.mockResolvedValue({});

    const onPasswordChanged = vi.fn();
    const { container } = renderPanel({ onPasswordChanged });
    await waitFor(() => {});

    const inputs = getPasswordInputs(container);
    fireEvent.change(inputs[0], { target: { value: "currentPass1!" } });
    fireEvent.change(inputs[1], { target: { value: "StrongNewPass1!" } });
    fireEvent.change(inputs[2], { target: { value: "StrongNewPass1!" } });

    fireEvent.click(screen.getByRole("button", { name: /update admin password/i }));

    await waitFor(() => expect(onPasswordChanged).toHaveBeenCalledTimes(1));
    expect(onPasswordChanged).toHaveBeenCalledWith("StrongNewPass1!");
  });
});

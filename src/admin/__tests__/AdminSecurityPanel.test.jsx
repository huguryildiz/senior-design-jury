import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, vi } from "vitest";
import { qaTest } from "../../test/qaTest.js";
import AdminSecurityPanel from "../../components/admin/AdminSecurityPanel";
import { ToastProvider } from "../../components/toast/useToast";

// Prevent real API calls — stub only what AdminSecurityPanel uses.
// Do NOT spread importOriginal: the real api.js initialises a Supabase client
// at module load time and requires VITE_SUPABASE_URL (unavailable in CI).
vi.mock("../../shared/api", () => ({
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
}));

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
  qaTest("security.validation.01", async () => {
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

  qaTest("security.validation.02", async () => {
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

  qaTest("security.validation.03", async () => {
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

  qaTest("security.validation.04", async () => {
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

  qaTest("security.validation.05", async () => {
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
  qaTest("security.success.01", async () => {
    const { adminChangePassword } = await vi.importMock("../../shared/api");
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

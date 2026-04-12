import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ViewSessionsDrawer from "../drawers/ViewSessionsDrawer";

vi.mock("../../shared/lib/supabaseClient", () => ({ supabase: {} }));

describe("ViewSessionsDrawer", () => {
  it("marks current session, uses signed-in fallback, and renders country inline in sub-line", () => {
    const { container } = render(
      <ViewSessionsDrawer
        open
        onClose={() => {}}
        currentDeviceId="dev_current"
        sessions={[
          {
            id: "older",
            device_id: "dev_old",
            browser: "Firefox",
            os: "Linux",
            ip_address: "bad-ip",
            country_code: null,
            signed_in_at: null,
            first_seen_at: "2026-04-09T08:00:00.000Z",
            last_activity_at: "2026-04-09T09:00:00.000Z",
            auth_method: "Email",
            expires_at: null,
          },
          {
            id: "newer",
            device_id: "dev_current",
            browser: "Chrome",
            os: "macOS",
            ip_address: "203.0.113.24",
            country_code: "TR",
            signed_in_at: "2026-04-10T08:00:00.000Z",
            first_seen_at: "2026-04-10T08:00:00.000Z",
            last_activity_at: "2026-04-10T09:00:00.000Z",
            auth_method: "Google",
            expires_at: "2026-04-10T12:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Current Session")).toBeInTheDocument();
    expect(screen.getByLabelText("signed-in-fallback-info")).toBeInTheDocument();
    expect(screen.getByText("(first seen)")).toBeInTheDocument();

    // Country is now shown inline in card-sub, hidden if "Unknown"
    const cardSubs = Array.from(container.querySelectorAll(".fs-session-card-sub")).map((node) => node.textContent);
    expect(cardSubs.some((sub) => sub.includes("TR"))).toBe(true);
    // Sessions are sorted by last_activity descending; first one is the newer (dev_current) with TR country
    expect(cardSubs[0]).toContain("203.0.113"); // masked IP
    expect(cardSubs[0]).toContain("TR"); // country code visible

    const cardNames = Array.from(container.querySelectorAll(".fs-session-card-name")).map((node) => node.textContent);
    expect(cardNames[0]).toContain("Chrome / macOS");
    expect(cardNames[1]).toContain("Firefox / Linux");
  });
});

describe("deleteAdminSession", () => {
  it("calls revoke session RPC with correct id", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });

    const { supabase } = await import("../../shared/lib/supabaseClient");
    supabase.rpc = mockRpc;

    const { deleteAdminSession } = await import("../../shared/api/admin/sessions");
    await deleteAdminSession("test-uuid-123");

    expect(mockRpc).toHaveBeenCalledWith("rpc_admin_revoke_admin_session", {
      p_session_id: "test-uuid-123",
    });
  });
});

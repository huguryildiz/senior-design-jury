// src/shared/__tests__/api.env.test.js
// ============================================================
// api.js — DEV warning for missing VITE_RPC_SECRET.
// Audit item: m-1
// ============================================================

import { describe, expect, vi, beforeEach, afterEach } from "vitest";
import { qaTest } from "../../test/qaTest.js";

// Prevent supabaseClient from requiring VITE_SUPABASE_URL at module load time.
// The factory persists across vi.resetModules() calls so each dynamic import
// of api.js still gets a safe stub instead of the real Supabase client.
vi.mock("../../lib/supabaseClient", () => ({ supabase: {} }));

// api.js executes the console.warn at module load time,
// so we must re-import the module fresh for each test.
// Use vi.resetModules() + dynamic import() to achieve this.

describe("api.js — DEV warning for missing VITE_RPC_SECRET", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  qaTest("api.env.01", async () => {
    // DEV=true, RPC secret absent → warn should fire
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_RPC_SECRET", "");

    await import("../api.js");

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("VITE_RPC_SECRET is not set")
    );
  });

  qaTest("api.env.02", async () => {
    // DEV=true, RPC secret present → no warn
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_RPC_SECRET", "test-secret");

    await import("../api.js");

    expect(console.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("VITE_RPC_SECRET is not set")
    );
  });
});

// src/shared/__tests__/withRetry.test.js
// ============================================================
// withRetry — exponential backoff retry helper.
// Audit items: retry.network.01 / .02 / .03
// ============================================================

import { describe, expect, vi } from "vitest";
import { withRetry } from "../api";
import { qaTest } from "../../test/qaTest.js";

describe("withRetry", () => {
  qaTest("retry.network.01", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new TypeError("Failed to fetch");
      return "ok";
    });

    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  qaTest("retry.network.02", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    const fn = vi.fn(async () => { throw abortError; });

    await expect(withRetry(fn, { maxAttempts: 3, delayMs: 1 })).rejects.toThrow("Aborted");
    // Must not retry — only called once
    expect(fn).toHaveBeenCalledTimes(1);
  });

  qaTest("retry.network.03", async () => {
    const businessError = new Error("permission denied");
    const fn = vi.fn(async () => { throw businessError; });

    await expect(withRetry(fn, { maxAttempts: 3, delayMs: 1 })).rejects.toThrow("permission denied");
    // Must not retry — only called once
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

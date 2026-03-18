// src/shared/api/core/retry.js
// ============================================================
// Exponential backoff retry helper for transient network errors.
//
// Retries on: native TypeError (raw fetch), Supabase client
// "Failed to fetch" / "NetworkError" wrapped errors.
// Never retries: AbortError (intentional cancellation) or
// business errors (auth, permission, constraint violations).
// Backoff formula: delayMs * 2^(attempt-1)
// ============================================================

export async function withRetry(fn, { maxAttempts = 3, delayMs = 500 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      // AbortError = intentional cancel (AbortController) — never retry
      if (e?.name === "AbortError") throw e;
      // Network-level failures: native TypeError (raw fetch) or
      // Supabase client "Failed to fetch" / "NetworkError" wrapped errors
      const isNetworkError =
        e instanceof TypeError ||
        (e?.message && (
          e.message.includes("Failed to fetch") ||
          e.message.includes("NetworkError") ||
          e.message.includes("network")
        ));
      if (isNetworkError) {
        lastError = e;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt - 1)));
          continue;
        }
      }
      // Supabase business errors, auth failures → propagate immediately
      throw e;
    }
  }
  throw lastError;
}

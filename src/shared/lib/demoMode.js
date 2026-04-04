// src/lib/demoMode.js
// Single source of truth for demo mode detection.
// Priority: ?explore URL param > VITE_DEMO_MODE env var (local dev fallback).
// Import DEMO_MODE from here instead of reading import.meta.env directly.

const _params =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

export const DEMO_MODE =
  _params.has("explore") ||
  _params.has("demo-jury") ||
  import.meta.env.VITE_DEMO_MODE === "true";

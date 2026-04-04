// src/shared/lib/demoMode.js
// Single source of truth for demo mode detection.
// Derived from runtime environment selection (URL params + sessionStorage).
// Import DEMO_MODE from here instead of checking env vars directly.

import { isDemoEnvironment } from "./environment";

export const DEMO_MODE = isDemoEnvironment();

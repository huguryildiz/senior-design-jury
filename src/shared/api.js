// src/shared/api.js
// ============================================================
// Re-export shim. All implementations have moved to src/shared/api/.
//
// This file exists so that all existing import paths of the form
//   import { X } from "../../shared/api"
// continue to resolve without any changes to callers.
//
// Bundler resolution: "../../shared/api" matches api.js before
// api/index.js, so this shim takes priority.
// ============================================================

export * from "./api/index";

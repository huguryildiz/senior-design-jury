// vitest.config.allure.js
// Used by "npm run test:report" to generate Allure results.
// The default "npm test" uses vite.config.js (no Allure overhead).

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import AllureReporter from "allure-vitest/reporter";

export default defineConfig({
  plugins: [react()],
  base: "/",
  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/e2e/**"],
    // allure-vitest/setup must come first so the runtime is ready for every test
    setupFiles: ["allure-vitest/setup", "./src/test/setup.js"],
    reporters: [
      "verbose",
      new AllureReporter({ resultsDir: "test-results/allure-results" }),
      "json",
    ],
    outputFile: {
      json: "test-results/results.json",
    },
  },
});

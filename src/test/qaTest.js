/**
 * qaTest — single-source-of-truth test helper.
 *
 * Wraps Vitest's `it()` with metadata from qa-catalog.json.
 * When the Allure reporter is active (npm run test:report), each test
 * is annotated with module, area, story, severity, and a plain-English
 * description.  When running under the default config (npm test), the
 * allure calls throw "No current runtime" which we catch silently —
 * tests still run normally.
 *
 * Usage:
 *   import { qaTest } from "../../test/qaTest.js";
 *
 *   qaTest("grid.filter.03", async () => {
 *     // test body — no need to repeat the scenario text here
 *   });
 */

import { it } from "vitest";
import { allure } from "allure-vitest";
import catalog from "./qa-catalog.json";

// Build lookup maps once at module load time.
const META_BY_ID = Object.fromEntries(catalog.map((m) => [m.id, m]));

/**
 * Apply one allure annotation, silently swallowing any error that occurs
 * when the Allure runtime is not active (i.e. plain `npm test`).
 */
function safe(fn) {
  try {
    fn();
  } catch {
    // Allure runtime not initialised — skip annotation, keep test running.
  }
}

/**
 * Annotate the current test with all available QA metadata.
 * Must be called from inside a running test body.
 */
function applyAllureMeta(meta) {
  safe(() => allure.label("module", meta.module));
  safe(() => allure.feature(meta.area));
  safe(() => allure.story(meta.story));
  safe(() => allure.label("severity", meta.severity));
  safe(() =>
    allure.description(
      `**Why it matters:** ${meta.whyItMatters}\n\n` +
        `**Risk:** ${meta.risk}\n\n` +
        `**Coverage:** ${meta.coverageStrength}`
    )
  );
}

/**
 * Declare a test whose name and metadata are pulled from qa-catalog.json.
 *
 * @param {string}   id     - Catalog entry ID (e.g. "grid.filter.03")
 * @param {Function} testFn - Test body (sync or async)
 */
export function qaTest(id, testFn) {
  const meta = META_BY_ID[id];
  if (!meta) {
    throw new Error(
      `[qaTest] Unknown QA test ID: "${id}". Add an entry to src/test/qa-catalog.json.`
    );
  }

  it(meta.scenario, async () => {
    applyAllureMeta(meta);
    await testFn();
  });
}

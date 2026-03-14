// e2e/jury-flow.spec.ts
// ============================================================
// Jury identity form — E2E smoke tests.
//
// These tests run against a live dev server connected to the
// staging Supabase project (E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY).
//
// PIN-dependent steps are kept in a separate describe block so
// they can be skipped when test credentials are not configured.
// ============================================================

import { test, expect } from "@playwright/test";

const TEST_JUROR_NAME = process.env.E2E_JUROR_NAME || "";
const TEST_JUROR_DEPT = process.env.E2E_JUROR_DEPT || "";
const TEST_JUROR_PIN  = process.env.E2E_JUROR_PIN  || "";

test.describe("Jury identity form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Navigate to the jury form
    await page.getByRole("button", { name: /start evaluation/i }).click();
  });

  test("Start button is disabled when fields are empty", async ({ page }) => {
    const startBtn = page.getByRole("button", { name: /start evaluation/i });
    await expect(startBtn).toBeDisabled();
  });

  test("Start button is enabled when both fields are filled", async ({ page }) => {
    await page.getByLabel(/full name/i).fill("Test Juror");
    await page.getByLabel(/institution \/ department/i).fill("EE");
    const startBtn = page.getByRole("button", { name: /start evaluation/i });
    await expect(startBtn).toBeEnabled();
  });

  test("Name field accepts text input", async ({ page }) => {
    const nameInput = page.getByLabel(/full name/i);
    await nameInput.fill("Jane Smith");
    await expect(nameInput).toHaveValue("Jane Smith");
  });
});

test.describe("Jury PIN flow", () => {
  test.skip(
    !TEST_JUROR_NAME || !TEST_JUROR_PIN,
    "Skipped: E2E_JUROR_NAME / E2E_JUROR_PIN not set"
  );

  test("Known juror reaches PIN step after identity submit", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start evaluation/i }).click();

    await page.getByLabel(/full name/i).fill(TEST_JUROR_NAME);
    await page.getByLabel(/institution \/ department/i).fill(TEST_JUROR_DEPT);
    await page.getByRole("button", { name: /start evaluation/i }).click();

    // After identity submit with a known juror, PIN step should appear
    await expect(page.getByText(/enter your access pin/i)).toBeVisible({ timeout: 10_000 });
  });
});

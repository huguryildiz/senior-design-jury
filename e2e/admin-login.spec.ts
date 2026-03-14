// e2e/admin-login.spec.ts
// ============================================================
// Admin panel — login smoke test.
//
// Requires E2E_ADMIN_PASSWORD env var to be set.
// Skipped automatically when the secret is not available.
// ============================================================

import { test, expect } from "@playwright/test";

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "";

test.describe("Admin panel login", () => {
  test.skip(!ADMIN_PASSWORD, "Skipped: E2E_ADMIN_PASSWORD not set");

  test("Admin can log in and see the dashboard", async ({ page }) => {
    await page.goto("/");
    // Navigate to admin
    await page.getByRole("button", { name: /admin|yönetici/i }).click();

    // Enter password
    const passwordInput = page.getByPlaceholder(/password|şifre/i).or(
      page.locator('input[type="password"]')
    );
    await passwordInput.fill(ADMIN_PASSWORD);
    await page.keyboard.press("Enter");

    // Dashboard heading should appear
    await expect(
      page.getByText(/overview|dashboard|genel bakış/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

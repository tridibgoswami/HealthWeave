import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Dashboard", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("dashboard loads and shows greeting", async ({ page }) => {
    await expect(page.locator("text=/Good (morning|afternoon|evening),/").first()).toBeVisible({ timeout: 8000 });
  });

  test("shows organ health scores section", async ({ page }) => {
    await expect(page.locator("text=Organ Health Scores")).toBeVisible();
  });

  test("shows quick action cards", async ({ page }) => {
    await expect(page.locator("text=Upload Record").first()).toBeVisible();
    await expect(page.locator("text=Ask AI").first()).toBeVisible();
  });

  test("shows health alerts section", async ({ page }) => {
    await expect(page.locator("text=Health Alerts").first()).toBeVisible();
  });

  test("shows recent records section", async ({ page }) => {
    await expect(page.locator("text=Recent Records")).toBeVisible();
  });

  test("AI chat CTA card is visible", async ({ page }) => {
    await expect(page.locator("text=Ask AI Assistant")).toBeVisible();
  });

  test("upload record quick action navigates correctly", async ({ page }) => {
    await page.locator("a.hw-card[href='/upload']").click();
    await expect(page).toHaveURL(/\/upload/);
  });

  test("ask AI quick action navigates correctly", async ({ page }) => {
    // quick-action card has rounded-2xl; the "Ask AI Assistant" CTA at bottom does not
    await page.locator("a.hw-card.rounded-2xl[href='/chat']").click();
    await expect(page).toHaveURL(/\/chat/);
  });

  test("refresh scores button is present and clickable", async ({ page }) => {
    const refresh = page.locator("button:has-text('Refresh')");
    await expect(refresh).toBeVisible();
    await refresh.click();
    // Should not crash
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/dashboard/);
  });

});

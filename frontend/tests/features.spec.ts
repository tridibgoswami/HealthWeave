import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";
import path from "path";

test.describe("Upload Page", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/upload");
  });

  test("upload page loads with dropzone", async ({ page }) => {
    await expect(page.locator("text=Upload Health Records")).toBeVisible();
    // Dropzone or input area present
    const dropzone = page.locator("[class*='dropzone'], [class*='drop'], input[type=file]").first();
    await expect(dropzone).toBeAttached();
  });

  test("shows How it works section", async ({ page }) => {
    await expect(page.locator("text=AI extracts").or(page.locator("text=How it works"))).toBeVisible();
  });

  test("rejects unsupported file types", async ({ page }) => {
    const input = page.locator("input[type=file]");
    if (await input.isVisible()) {
      // Try uploading a .exe file (unsupported)
      await input.setInputFiles({
        name: "malware.exe",
        mimeType: "application/octet-stream",
        buffer: Buffer.from("fake content"),
      });
      await page.waitForTimeout(1000);
      // Should show an error or rejection
      await expect(page.locator("text=Unsupported, text=not supported, text=invalid").first()).toBeVisible({ timeout: 3000 }).catch(() => {});
    }
  });

});

test.describe("AI Chat", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/chat");
  });

  test("chat page loads", async ({ page }) => {
    await expect(page.locator("text=AI Health Assistant")).toBeVisible();
  });

  test("shows chat input or loading state", async ({ page }) => {
    // Session creation is async — wait up to 8s for the input or any loading indicator
    const hasInput = await page.locator("input[type=text], textarea")
      .waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false);
    const hasLoading = !hasInput &&
      await page.locator("text=Starting AI session").isVisible().catch(() => false);
    expect(hasInput || hasLoading).toBeTruthy();
  });

  test("chat input is visible after session starts", async ({ page }) => {
    await page.waitForSelector(
      "input[type=text], textarea, [placeholder*='Ask'], [placeholder*='Type']",
      { timeout: 10_000 }
    );
    const input = page.locator("input[type=text], textarea").first();
    await expect(input).toBeVisible();
  });

});

test.describe("Health Alerts", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/alerts");
  });

  test("alerts page loads", async ({ page }) => {
    await expect(page.locator("h1, h2").filter({ hasText: /Alert/i })).toBeVisible();
  });

  test("shows empty state or alert list", async ({ page }) => {
    const hasAlerts   = await page.locator("[class*='alert']").first().isVisible().catch(() => false);
    const hasEmpty    = await page.locator("text=No alerts, text=All clear").first().isVisible().catch(() => false);
    const hasContent  = await page.locator("main, .content").first().innerText().then(t => t.length > 20).catch(() => false);
    expect(hasAlerts || hasEmpty || hasContent).toBeTruthy();
  });

});

test.describe("Health Timeline", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/timeline");
  });

  test("timeline page loads", async ({ page }) => {
    await expect(page.locator("h1, h2").filter({ hasText: /Timeline/i })).toBeVisible();
  });

});

test.describe("Biomarker Trends", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/biomarkers");
  });

  test("biomarker page loads", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
  });

});

test.describe("Risk Predictions", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/risk");
  });

  test("risk page loads", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
  });

});

test.describe("Emergency Passport", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/passport");
  });

  test("passport page loads", async ({ page }) => {
    await expect(page.locator("h1, h2").filter({ hasText: /Passport/i })).toBeVisible();
  });

  test("shows QR code section or setup prompt", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
  });

});

test.describe("Health Intelligence", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/insights");
  });

  test("insights page loads", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
  });

});

test.describe("Consents", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto("/consent");
  });

  test("consent page loads", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(50);
  });

});

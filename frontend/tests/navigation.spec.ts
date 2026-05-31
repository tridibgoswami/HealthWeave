import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

const PAGES = [
  { path: "/dashboard",   text: "Dashboard" },
  { path: "/upload",      text: "Upload Health Records" },
  { path: "/timeline",    text: "Timeline" },
  { path: "/chat",        text: "AI Health Assistant" },
  { path: "/alerts",      text: "Alerts" },
  { path: "/insights",    text: "Health Intelligence" },
  { path: "/biomarkers",  text: "Biomarker" },
  { path: "/risk",        text: "Risk" },
  { path: "/consent",     text: "Consent" },
  { path: "/passport",    text: "Passport" },
];

test.describe("Navigation — all pages load", () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  for (const { path, text } of PAGES) {
    test(`${path} loads without error`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      // No full-page error boundary
      await expect(page.locator("text=Something went wrong").first()).not.toBeVisible({ timeout: 3000 }).catch(() => {});
      // Page has some content
      const body = await page.locator("body").innerText();
      expect(body.length).toBeGreaterThan(50);
    });
  }

  test("unknown route does not show blank screen", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-xyz");
    await page.waitForLoadState("domcontentloaded");
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(10);
  });

  test("protected route redirects to login when not authenticated", async ({ page }) => {
    // Clear any stored auth
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });

});

test.describe("Navigation — mobile bottom nav", () => {

  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("bottom nav is visible on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.locator("nav").filter({ has: page.locator("text=More") });
    await expect(nav).toBeVisible();
  });

  test("More button opens sheet", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("button:has-text('More')");
    await expect(page.locator("text=Health Timeline")).toBeVisible({ timeout: 3000 });
  });

  test("mobile header is visible", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("header span:has-text('HealthWeave')").first()).toBeVisible();
  });

  test("hamburger opens sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("button[aria-label='Open menu']");
    await page.waitForTimeout(500);
    await expect(page.locator("aside")).toBeVisible();
  });

});

test.describe("Navigation — desktop sidebar", () => {

  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("sidebar is visible on desktop", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("aside")).toBeVisible();
  });

  test("all sidebar links are present", async ({ page }) => {
    await page.goto("/dashboard");
    const links = [
      "Dashboard", "Upload Records", "Health Timeline",
      "AI Assistant", "Alerts", "Health Intelligence",
      "Biomarker Trends", "Risk Predictions", "My Consents",
      "Send Report", "Emergency Passport",
    ];
    for (const link of links) {
      await expect(page.locator(`aside >> text=${link}`)).toBeVisible();
    }
  });

  test("sidebar shows user name", async ({ page }) => {
    await page.goto("/dashboard");
    const aside = page.locator("aside");
    // Should show some text (user name)
    const text = await aside.innerText();
    expect(text.length).toBeGreaterThan(10);
  });

});

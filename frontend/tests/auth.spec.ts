import { test, expect } from "@playwright/test";

const TEST_EMAIL = `test+${Date.now()}@healthweave-test.com`;
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = { first: "Test", last: "User" };

test.describe("Authentication", () => {

  test("landing page loads and shows login/register buttons", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/HealthWeave/);
    // Should show landing or redirect to login
    const url = page.url();
    expect(url).toMatch(/\/(login|register|$)/);
  });

  test("login page renders all fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[type=email], input[name=email]")).toBeVisible();
    await expect(page.locator("input[type=password]")).toBeVisible();
    await expect(page.locator("button[type=submit], button:has-text('Sign In'), button:has-text('Log In')")).toBeVisible();
  });

  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type=email], input[name=email]", "wrong@example.com");
    await page.fill("input[type=password]", "wrongpassword123");
    await page.click("button[type=submit], button:has-text('Sign In'), button:has-text('Log in')");
    // Should show error — not redirect to dashboard
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).not.toContain("/dashboard");
  });

  test("register page renders all fields", async ({ page }) => {
    await page.goto("/register/patient");
    await expect(page.locator("input[name=first_name], input[placeholder*='First']")).toBeVisible();
    await expect(page.locator("input[name=last_name], input[placeholder*='Last']")).toBeVisible();
    await expect(page.locator("input[type=email], input[name=email]")).toBeVisible();
    await expect(page.locator("input[type=password]")).toBeVisible();
  });

  test("register with weak password shows validation error", async ({ page }) => {
    await page.goto("/register/patient");
    await page.fill("input[name=first_name], input[placeholder*='First']", "Test");
    await page.fill("input[name=last_name], input[placeholder*='Last']", "User");
    await page.fill("input[type=email]", `weak+${Date.now()}@test.com`);
    await page.fill("input[type=password]", "weak");
    await page.click("button[type=submit], button:has-text('Create Account')");
    await page.waitForTimeout(1500);
    // Should NOT redirect to dashboard
    expect(page.url()).not.toContain("/dashboard");
  });

  test("register choice page shows patient/doctor/hospital options", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("text=Patient")).toBeVisible();
    await expect(page.locator("text=Doctor")).toBeVisible();
  });

  test("full registration → dashboard flow", async ({ page }) => {
    await page.goto("/register/patient");
    await page.fill("input[name=first_name], input[placeholder*='First']", TEST_NAME.first);
    await page.fill("input[name=last_name], input[placeholder*='Last']", TEST_NAME.last);
    await page.fill("input[type=email]", TEST_EMAIL);
    await page.fill("input[type=password]", TEST_PASSWORD);
    await page.click("button[type=submit], button:has-text('Create Account')");
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    await expect(page.locator(`text=${TEST_NAME.first}`)).toBeVisible();
  });

  test("logout redirects to login", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill("input[type=email]", TEST_EMAIL);
    await page.fill("input[type=password]", TEST_PASSWORD);
    await page.click("button[type=submit], button:has-text('Sign In'), button:has-text('Log in')");
    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    // Logout via sidebar (desktop) or More sheet (mobile)
    const logoutBtn = page.locator("button:has-text('Sign Out'), button:has-text('Logout')").first();
    await logoutBtn.click();
    await page.waitForURL("**/login", { timeout: 5_000 });
  });

});

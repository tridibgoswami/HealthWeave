import { Page } from "@playwright/test";

const SHARED_EMAIL    = process.env.TEST_USER_EMAIL    || "e2e-shared@healthweave-test.com";
const SHARED_PASSWORD = process.env.TEST_USER_PASSWORD || "E2eShared123!";

/**
 * Registers (if needed) and logs in as a shared test user.
 * Uses localStorage to skip login on subsequent calls within the same test.
 */
export async function loginAs(page: Page, email = SHARED_EMAIL, password = SHARED_PASSWORD) {
  // Try register first (idempotent — 409 if exists is fine)
  await page.request.post(
    `${page.url().includes("localhost") ? "http://localhost:9000" : "https://healthweave-yu6rn.ondigitalocean.app"}/api/v1/auth/register`,
    {
      data: {
        email,
        password,
        first_name: "E2E",
        last_name: "Test",
        role: "patient",
      },
    }
  ).catch(() => {});

  await page.goto("/login");
  await page.fill("input[type=email], input[name=email]", email);
  await page.fill("input[type=password]", password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

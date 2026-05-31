import { test, expect } from "@playwright/test";

/**
 * API contract tests — validates backend endpoints return correct
 * status codes and response shapes, without a UI.
 */

const BASE = process.env.BASE_URL || "https://healthweave-yu6rn.ondigitalocean.app";
const API  = `${BASE}/api/v1`;

test.describe("Backend Health & Routing", () => {

  test("GET /health returns healthy status", async ({ request }) => {
    const res = await request.get(`${BASE}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
  });

  test("GET / returns app root JSON", async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.app).toBe("HealthWeave");
  });

});

test.describe("Auth API", () => {

  const email    = `api-test+${Date.now()}@healthweave-test.com`;
  const password = "ApiTest123!";
  let   accessToken = "";

  test("POST /auth/register — creates account and returns tokens", async ({ request }) => {
    const res = await request.post(`${API}/auth/register`, {
      data: { email, password, first_name: "API", last_name: "Test", role: "patient" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("access_token");
    expect(body).toHaveProperty("refresh_token");
    expect(body).toHaveProperty("user_id");
    accessToken = body.access_token;
  });

  test("POST /auth/register — duplicate email returns 409", async ({ request }) => {
    const res = await request.post(`${API}/auth/register`, {
      data: { email, password, first_name: "API", last_name: "Test", role: "patient" },
    });
    expect(res.status()).toBe(409);
  });

  test("POST /auth/register — weak password returns 422", async ({ request }) => {
    const res = await request.post(`${API}/auth/register`, {
      data: { email: `new+${Date.now()}@test.com`, password: "weak", first_name: "A", last_name: "B", role: "patient" },
    });
    expect(res.status()).toBe(422);
  });

  test("POST /auth/login — valid credentials return tokens", async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email, password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("access_token");
    accessToken = body.access_token;
  });

  test("POST /auth/login — wrong password returns 401", async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email, password: "wrongPassword999!" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.detail).toBe("Invalid credentials");
  });

  test("GET /auth/me — returns user profile with valid token", async ({ request }) => {
    // Login to get fresh token
    const loginRes = await request.post(`${API}/auth/login`, { data: { email, password } });
    const { access_token } = await loginRes.json();

    const res = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.email).toBe(email);
    expect(body).toHaveProperty("role");
    expect(body).toHaveProperty("profile");
  });

  test("GET /auth/me — returns 401 without token", async ({ request }) => {
    const res = await request.get(`${API}/auth/me`);
    expect(res.status()).toBe(401);
  });

  test("GET /auth/me — returns 401 with fake token", async ({ request }) => {
    const res = await request.get(`${API}/auth/me`, {
      headers: { Authorization: "Bearer fake.token.here" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /auth/forgot-password — always returns 200 (no email leak)", async ({ request }) => {
    const res = await request.post(`${API}/auth/forgot-password`, {
      data: { email: "notexist@test.com" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("If that email");
    // MUST NOT contain a token in the response (security check)
    expect(JSON.stringify(body)).not.toContain("_dev_token");
  });

});

test.describe("Health Records API", () => {

  let token = "";

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API}/auth/register`, {
      data: {
        email: `records+${Date.now()}@healthweave-test.com`,
        password: "RecordsTest123!",
        first_name: "Records",
        last_name: "Test",
        role: "patient",
      },
    });
    const body = await res.json();
    token = body.access_token;
  });

  test("GET /records/ — returns empty list for new user", async ({ request }) => {
    const res = await request.get(`${API}/records/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("records");
    expect(Array.isArray(body.records)).toBeTruthy();
  });

  test("GET /records/ — requires auth", async ({ request }) => {
    const res = await request.get(`${API}/records/`);
    expect(res.status()).toBe(401);
  });

  test("GET /records/ — invalid date format returns 400", async ({ request }) => {
    const res = await request.get(`${API}/records/?from_date=not-a-date`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
  });

});

test.describe("Intelligence API", () => {

  let token = "";

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API}/auth/register`, {
      data: {
        email: `intel+${Date.now()}@healthweave-test.com`,
        password: "IntelTest123!",
        first_name: "Intel",
        last_name: "Test",
        role: "patient",
      },
    });
    const body = await res.json();
    token = body.access_token;
  });

  test("GET /intelligence/health-scores — returns scores list", async ({ request }) => {
    const res = await request.get(`${API}/intelligence/health-scores`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test("GET /intelligence/alerts — returns alerts list", async ({ request }) => {
    const res = await request.get(`${API}/intelligence/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

  test("GET /intelligence/risk-predictions — returns predictions", async ({ request }) => {
    const res = await request.get(`${API}/intelligence/risk-predictions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });

});

test.describe("Emergency API", () => {

  test("GET /emergency/passport/invalid-token — returns 404", async ({ request }) => {
    const res = await request.get(`${API}/emergency/passport/definitely-not-a-real-token`);
    expect(res.status()).toBe(404);
  });

});

test.describe("Security Checks", () => {

  test("security headers are present on API responses", async ({ request }) => {
    const res = await request.get(`${BASE}/health`);
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["strict-transport-security"]).toContain("max-age");
  });

  test("CORS rejects requests from unknown origins", async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: "test@test.com", password: "Test123!" },
      headers: { Origin: "https://evil-hacker.com" },
    });
    // Should not return Access-Control-Allow-Origin for unknown origin
    const corsHeader = res.headers()["access-control-allow-origin"] || "";
    expect(corsHeader).not.toBe("https://evil-hacker.com");
  });

  test("forgot-password does NOT leak reset token in response", async ({ request }) => {
    const res = await request.post(`${API}/auth/forgot-password`, {
      data: { email: "any@test.com" },
    });
    const body = await res.text();
    expect(body).not.toContain("_dev_token");
    expect(body).not.toContain("reset_token");
  });

});

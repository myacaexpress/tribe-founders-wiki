/**
 * Login API route tests
 *
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "../app/api/login/route";

function makeLoginRequest(password: string): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

describe("Login API route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 200 and sets cookie on correct password (default)", async () => {
    const res = await POST(makeLoginRequest("tribe2026"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("tribe-auth");
    expect(setCookie).toContain("HttpOnly");
  });

  it("returns 401 on wrong password", async () => {
    const res = await POST(makeLoginRequest("wrongpassword"));
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Invalid password");
  });

  it("returns 401 on empty password", async () => {
    const res = await POST(makeLoginRequest(""));
    expect(res.status).toBe(401);
  });

  it("accepts custom password from env var", async () => {
    process.env.TRIBE_PASSWORD = "custom-secret";
    const res = await POST(makeLoginRequest("custom-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("rejects default password when env var overrides", async () => {
    process.env.TRIBE_PASSWORD = "custom-secret";
    const res = await POST(makeLoginRequest("tribe2026"));
    expect(res.status).toBe(401);
  });
});

/**
 * Middleware tests — we test the logic by importing the middleware
 * with the node test environment since NextRequest needs Web APIs.
 *
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

function makeRequest(path: string, hasCookie = false): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  const headers = new Headers();
  if (hasCookie) {
    headers.set("cookie", "tribe-auth=true");
  }
  return new NextRequest(url, { headers });
}

describe("Password gate middleware", () => {
  it("allows /login through without auth cookie", () => {
    const res = middleware(makeRequest("/login"));
    expect(res.headers.get("Location")).toBeNull();
  });

  it("allows /api/login through without auth cookie", () => {
    const res = middleware(makeRequest("/api/login"));
    expect(res.headers.get("Location")).toBeNull();
  });

  it("redirects to /login when no auth cookie on /", () => {
    const res = middleware(makeRequest("/"));
    const location = res.headers.get("Location");
    expect(location).toContain("/login");
  });

  it("redirects /wiki to /login when no auth cookie", () => {
    const res = middleware(makeRequest("/wiki"));
    const location = res.headers.get("Location");
    expect(location).toContain("/login");
  });

  it("redirects /add to /login when no auth cookie", () => {
    const res = middleware(makeRequest("/add"));
    const location = res.headers.get("Location");
    expect(location).toContain("/login");
  });

  it("allows access when auth cookie is present", () => {
    const res = middleware(makeRequest("/", true));
    expect(res.headers.get("Location")).toBeNull();
  });

  it("allows /wiki when auth cookie is present", () => {
    const res = middleware(makeRequest("/wiki", true));
    expect(res.headers.get("Location")).toBeNull();
  });

  it("allows /add when auth cookie is present", () => {
    const res = middleware(makeRequest("/add", true));
    expect(res.headers.get("Location")).toBeNull();
  });
});

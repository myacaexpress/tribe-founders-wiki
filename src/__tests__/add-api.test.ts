/**
 * Add Something API route tests
 *
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "../app/api/add/route";

function makeAddRequest(body: Record<string, unknown>): NextRequest {
  const req = new NextRequest(new URL("http://localhost:3000/api/add"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: "tribe-auth=true",
    },
    body: JSON.stringify(body),
  });
  return req;
}

function makeUnauthRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/add"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Add Something API", () => {
  it("returns 401 without auth cookie", async () => {
    const res = await POST(makeUnauthRequest({ content: "test", destination: "lane" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when content is missing", async () => {
    const res = await POST(makeAddRequest({ destination: "lane" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when content is empty", async () => {
    const res = await POST(makeAddRequest({ content: "", destination: "lane" }));
    expect(res.status).toBe(400);
  });

  it("returns success for lane destination (falls back without GitHub token)", async () => {
    const original = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;

    const res = await POST(
      makeAddRequest({ content: "Test lane item", destination: "lane" })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBeTruthy();

    process.env.GITHUB_TOKEN = original;
  });

  it("returns success for brainstorm destination", async () => {
    const original = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;

    const res = await POST(
      makeAddRequest({ content: "Random thought", destination: "brainstorm" })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    process.env.GITHUB_TOKEN = original;
  });

  it("defaults founder to shawn", async () => {
    const original = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;

    const res = await POST(
      makeAddRequest({ content: "Test item", destination: "lane" })
    );
    const body = await res.json();
    expect(body.path).toContain("shawn");

    process.env.GITHUB_TOKEN = original;
  });
});

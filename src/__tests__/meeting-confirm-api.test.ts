/**
 * Meeting Confirm API route tests
 *
 * @jest-environment node
 */

import { POST } from "@/app/api/meeting/confirm/route";
import { NextRequest } from "next/server";

// Mock GitHub module
jest.mock("@/lib/github", () => ({
  getFileContent: jest.fn().mockResolvedValue({
    content: "---\ntype: tasks\n---\n\n- [ ] Existing task (shawn)\n",
    sha: "abc123",
  }),
  writeFile: jest.fn().mockResolvedValue("newsha123"),
}));

jest.mock("@/lib/github-data", () => ({
  parseFrontmatter: jest.fn().mockReturnValue({
    frontmatter: { type: "tasks" },
    body: "- [ ] Existing task (shawn)\n",
  }),
}));

function makeRequest(body: object): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/meeting/confirm"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: "tribe-auth=true",
    },
    body: JSON.stringify(body),
  });
}

function makeUnauthRequest(body: object): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/meeting/confirm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/meeting/confirm", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GITHUB_TOKEN: "test-token",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 401 without auth cookie", async () => {
    const req = makeUnauthRequest({ items: [] });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 with empty items", async () => {
    const req = makeRequest({ items: [], meetingTitle: "Test" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("saves confirmed items and returns counts", async () => {
    const req = makeRequest({
      items: [
        { type: "task", text: "Do something", owner: "shawn" },
        { type: "decision", text: "We decided X" },
        { type: "idea", text: "Try this approach", owner: "mark" },
      ],
      meetingTitle: "Weekly Standup",
      meetingDate: "2026-04-10",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.saved.tasks).toBe(1);
    expect(data.saved.decisions).toBe(1);
    expect(data.saved.ideas).toBe(1);
  });

  it("handles tasks-only payload", async () => {
    const req = makeRequest({
      items: [
        { type: "task", text: "Task 1", owner: "shawn" },
        { type: "task", text: "Task 2", owner: "mark" },
      ],
      meetingTitle: "Planning",
      meetingDate: "2026-04-10",
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.saved.tasks).toBe(2);
    expect(data.saved.decisions).toBe(0);
  });
});

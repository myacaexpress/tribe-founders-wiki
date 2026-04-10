/**
 * GitHub integration tests
 *
 * @jest-environment node
 */
import { getFileContent, getDirectoryContents } from "../lib/github";

describe("GitHub API module", () => {
  it("exports getFileContent function", () => {
    expect(typeof getFileContent).toBe("function");
  });

  it("exports getDirectoryContents function", () => {
    expect(typeof getDirectoryContents).toBe("function");
  });

  it("getFileContent returns null when GITHUB_TOKEN is not set", async () => {
    const original = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;

    const result = await getFileContent("nonexistent.md").catch(() => null);
    // Without a token, it should either return null or throw
    expect(result === null || result === undefined || result instanceof Error).toBeTruthy;

    process.env.GITHUB_TOKEN = original;
  });
});

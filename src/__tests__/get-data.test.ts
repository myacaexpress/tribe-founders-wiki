/**
 * Tests for the unified data-fetching layer
 *
 * @jest-environment node
 */
import { getData } from "../lib/get-data";

describe("getData (unified data layer)", () => {
  it("returns data with all required fields", async () => {
    // Without GITHUB_TOKEN, should fall back to hardcoded data
    const data = await getData();

    expect(data.radarItems).toBeDefined();
    expect(data.radarItems.length).toBeGreaterThan(0);

    expect(data.groupTableItems).toBeDefined();
    expect(data.groupTableItems.length).toBeGreaterThan(0);

    expect(data.laneItems).toBeDefined();
    expect(data.laneItems.shawn).toBeDefined();
    expect(data.laneItems.mark).toBeDefined();
    expect(data.laneItems.michael).toBeDefined();

    expect(data.taskItems).toBeDefined();
    expect(data.taskItems.length).toBeGreaterThan(0);

    expect(data.toolItems).toBeDefined();
    expect(data.toolItems.length).toBe(6);

    expect(typeof data.businessStateSentence).toBe("string");
    expect(data.businessStateSentence.length).toBeGreaterThan(0);
  });

  it("falls back to hardcoded data when no GitHub token", async () => {
    const original = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;

    const data = await getData();
    expect(data.radarItems.length).toBeGreaterThan(0);
    expect(data.businessStateSentence).toContain("Florida");

    process.env.GITHUB_TOKEN = original;
  });
});

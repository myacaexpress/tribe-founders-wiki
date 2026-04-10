import {
  radarItems,
  groupTableItems,
  laneItems,
  taskItems,
  toolItems,
  businessStateSentence,
} from "../lib/data";

describe("Data layer", () => {
  describe("radarItems", () => {
    it("has items", () => {
      expect(radarItems.length).toBeGreaterThan(0);
    });

    it("each item has required fields", () => {
      radarItems.forEach((item) => {
        expect(item.id).toBeTruthy();
        expect(item.title).toBeTruthy();
        expect(["red", "amber", "sage"]).toContain(item.level);
      });
    });

    it("has at least one red-level item", () => {
      const reds = radarItems.filter((r) => r.level === "red");
      expect(reds.length).toBeGreaterThan(0);
    });
  });

  describe("groupTableItems", () => {
    it("has items", () => {
      expect(groupTableItems.length).toBeGreaterThan(0);
    });

    it("each item has valid status", () => {
      const validStatuses = ["raised", "discussed", "decided", "executing", "complete"];
      groupTableItems.forEach((item) => {
        expect(validStatuses).toContain(item.status);
      });
    });

    it("each item has an owner", () => {
      groupTableItems.forEach((item) => {
        expect(item.owner).toBeTruthy();
      });
    });
  });

  describe("laneItems", () => {
    it("has lanes for all three founders", () => {
      expect(laneItems.shawn).toBeDefined();
      expect(laneItems.mark).toBeDefined();
      expect(laneItems.michael).toBeDefined();
    });

    it("each founder has at least one lane", () => {
      expect(laneItems.shawn.length).toBeGreaterThan(0);
      expect(laneItems.mark.length).toBeGreaterThan(0);
      expect(laneItems.michael.length).toBeGreaterThan(0);
    });

    it("each lane item has required fields", () => {
      Object.values(laneItems)
        .flat()
        .forEach((lane) => {
          expect(lane.id).toBeTruthy();
          expect(lane.title).toBeTruthy();
          expect(["active", "exploring", "complete"]).toContain(lane.status);
        });
    });
  });

  describe("taskItems", () => {
    it("has items", () => {
      expect(taskItems.length).toBeGreaterThan(0);
    });

    it("has both done and not-done tasks", () => {
      const done = taskItems.filter((t) => t.done);
      const todo = taskItems.filter((t) => !t.done);
      expect(done.length).toBeGreaterThan(0);
      expect(todo.length).toBeGreaterThan(0);
    });

    it("each task has a founder assigned", () => {
      taskItems.forEach((task) => {
        expect(["shawn", "mark", "michael"]).toContain(task.founder);
      });
    });
  });

  describe("toolItems", () => {
    it("has 6 tools", () => {
      expect(toolItems.length).toBe(6);
    });

    it("each tool has a valid URL", () => {
      toolItems.forEach((tool) => {
        expect(tool.url).toMatch(/^https:\/\//);
      });
    });

    it("each tool has an icon", () => {
      toolItems.forEach((tool) => {
        expect(tool.icon).toBeTruthy();
      });
    });
  });

  describe("businessStateSentence", () => {
    it("is a non-empty string", () => {
      expect(typeof businessStateSentence).toBe("string");
      expect(businessStateSentence.length).toBeGreaterThan(0);
    });

    it("mentions key facts", () => {
      expect(businessStateSentence).toContain("Florida");
      expect(businessStateSentence).toContain("Medicare");
    });
  });
});

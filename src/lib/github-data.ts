/**
 * Higher-level GitHub data access layer
 * Provides domain-specific functions that read from GitHub and return structured data
 */

import {
  RadarItem,
  GroupTableItem,
  LaneItem,
  TaskItem,
} from "./data";
import {
  getFileContent,
  getDirectoryContents,
  getMultipleFiles,
} from "./github";

/**
 * Simple YAML-like frontmatter parser
 * Parses structured key: value pairs between --- markers
 */
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  body: string;
} {
  const lines = content.split("\n");
  const frontmatter: Record<string, any> = {};
  let bodyStart = 0;

  // Check if content starts with ---
  if (lines[0]?.trim() === "---") {
    let frontmatterEnd = -1;

    // Find closing ---
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === "---") {
        frontmatterEnd = i;
        bodyStart = i + 1;
        break;
      }
    }

    if (frontmatterEnd !== -1) {
      // Parse frontmatter lines
      for (let i = 1; i < frontmatterEnd; i++) {
        const line = lines[i];
        if (!line) continue;

        // Simple key: value parsing
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (match) {
          const [, key, value] = match;
          const trimmedKey = key.trim();
          let trimmedValue = value.trim();

          // Handle different value types
          if (trimmedValue === "true") {
            frontmatter[trimmedKey] = true;
          } else if (trimmedValue === "false") {
            frontmatter[trimmedKey] = false;
          } else if (!isNaN(Number(trimmedValue)) && trimmedValue !== "") {
            frontmatter[trimmedKey] = Number(trimmedValue);
          } else if (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) {
            frontmatter[trimmedKey] = trimmedValue.slice(1, -1);
          } else if (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")) {
            frontmatter[trimmedKey] = trimmedValue.slice(1, -1);
          } else {
            frontmatter[trimmedKey] = trimmedValue;
          }
        }
      }
    }
  }

  const body = lines.slice(bodyStart).join("\n");

  return { frontmatter, body };
}

/**
 * Get all radar items from wiki/radar.md or individual radar files
 */
export async function getRadarItems(): Promise<RadarItem[]> {
  try {
    // Try to read from a single radar.md file first
    const radarContent = await getFileContent("wiki/radar.md");

    if (radarContent) {
      return parseRadarFile(radarContent.content);
    }

    // If single file doesn't exist, try directory with individual items
    const items = await getDirectoryContents("wiki/radar");
    const radarItems: RadarItem[] = [];

    for (const item of items) {
      if (item.type === "file" && item.name.endsWith(".md")) {
        const content = await getFileContent(item.path);
        if (content) {
          const parsed = parseRadarFile(content.content);
          radarItems.push(...parsed);
        }
      }
    }

    return radarItems;
  } catch (error) {
    console.error("Error reading radar items:", error);
    return [];
  }
}

/**
 * Parse a radar markdown file into RadarItem[]
 */
function parseRadarFile(content: string): RadarItem[] {
  const { frontmatter, body } = parseFrontmatter(content);
  const items: RadarItem[] = [];

  // If frontmatter has item data, use it
  if (frontmatter.id && frontmatter.title) {
    items.push({
      id: frontmatter.id as string,
      title: frontmatter.title as string,
      level: (frontmatter.level || "sage") as "red" | "amber" | "sage",
      daysUntil: frontmatter.daysUntil
        ? Number(frontmatter.daysUntil)
        : undefined,
      description: frontmatter.description as string | undefined,
    });

    return items;
  }

  // Parse markdown list format: - [id] title (level) daysUntil description
  const lines = body.split("\n");
  for (const line of lines) {
    const match = line.match(/^-\s*\[([^\]]+)\]\s*(.+?)(?:\((\w+)\))?(?:\(\d+\))?(?::\s*(.+))?$/);
    if (match) {
      const [, id, title, level, description] = match;
      items.push({
        id: id.trim(),
        title: title.trim(),
        level: (level?.toLowerCase() || "sage") as "red" | "amber" | "sage",
        description: description?.trim(),
      });
    }
  }

  return items;
}

/**
 * Get all group table items from wiki/group-table.md
 */
export async function getGroupTableItems(): Promise<GroupTableItem[]> {
  try {
    const content = await getFileContent("wiki/group-table.md");

    if (!content) {
      return [];
    }

    return parseGroupTableFile(content.content);
  } catch (error) {
    console.error("Error reading group table items:", error);
    return [];
  }
}

/**
 * Parse group table markdown file
 */
function parseGroupTableFile(content: string): GroupTableItem[] {
  const { body } = parseFrontmatter(content);
  const items: GroupTableItem[] = [];

  // Parse markdown table format
  const lines = body.split("\n");
  let inTable = false;

  for (const line of lines) {
    // Skip separators and headers
    if (line.includes("|") && (line.includes("---") || !inTable)) {
      if (!line.includes("---")) {
        inTable = true;
      }
      continue;
    }

    if (line.includes("|") && inTable) {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell);

      if (cells.length >= 2) {
        items.push({
          id: cells[0] || `item-${items.length}`,
          title: cells[1] || "",
          status: (cells[2]?.toLowerCase() || "raised") as
            | "raised"
            | "discussed"
            | "decided"
            | "executing"
            | "complete",
          owner: cells[3],
          raised: cells[4],
          decided: cells[5],
        });
      }
    }
  }

  return items;
}

/**
 * Get all lane items organized by founder from founders/[founder]/lane/*.md files
 */
export async function getLaneItems(): Promise<Record<string, LaneItem[]>> {
  try {
    const laneStructure: Record<string, LaneItem[]> = {};

    // Get list of founder directories
    const foundersDir = await getDirectoryContents("founders");

    for (const founder of foundersDir) {
      if (founder.type === "dir") {
        const founderName = founder.name;
        laneStructure[founderName] = [];

        try {
          const laneDir = await getDirectoryContents(`${founder.path}/lane`);

          for (const laneFile of laneDir) {
            if (laneFile.type === "file" && laneFile.name.endsWith(".md")) {
              const content = await getFileContent(laneFile.path);
              if (content) {
                const { frontmatter } = parseFrontmatter(content.content);

                const item: LaneItem = {
                  id: frontmatter.id || laneFile.name.replace(".md", ""),
                  title: frontmatter.title || laneFile.name,
                  status: (frontmatter.status || "exploring") as
                    | "active"
                    | "exploring"
                    | "complete",
                  zone: (frontmatter.zone || "exploring") as
                    | "active"
                    | "exploring",
                  description: frontmatter.description,
                };

                laneStructure[founderName].push(item);
              }
            }
          }
        } catch (error) {
          // Directory might not exist, skip
          console.debug(`No lane directory for ${founderName}`);
        }
      }
    }

    return laneStructure;
  } catch (error) {
    console.error("Error reading lane items:", error);
    return {};
  }
}

/**
 * Get all task items from wiki/tasks.md or individual task files
 */
export async function getTaskItems(): Promise<TaskItem[]> {
  try {
    // Try single file first
    const tasksContent = await getFileContent("wiki/tasks.md");

    if (tasksContent) {
      return parseTasksFile(tasksContent.content);
    }

    // Try directory
    const tasks: TaskItem[] = [];
    const taskDir = await getDirectoryContents("wiki/tasks");

    for (const item of taskDir) {
      if (item.type === "file" && item.name.endsWith(".md")) {
        const content = await getFileContent(item.path);
        if (content) {
          const parsed = parseTasksFile(content.content);
          tasks.push(...parsed);
        }
      }
    }

    return tasks;
  } catch (error) {
    console.error("Error reading task items:", error);
    return [];
  }
}

/**
 * Parse tasks markdown file
 */
function parseTasksFile(content: string): TaskItem[] {
  const { body } = parseFrontmatter(content);
  const items: TaskItem[] = [];

  // Parse markdown checklist format: - [x] title (founder)
  const lines = body.split("\n");

  for (const line of lines) {
    const match = line.match(/^-\s*\[([x\s])\]\s*(.+?)(?:\((\w+)\))?$/);
    if (match) {
      const [, checked, title, founder] = match;
      items.push({
        id: `task-${items.length}`,
        title: title.trim(),
        done: checked.toLowerCase() === "x",
        founder: founder as "shawn" | "mark" | "michael" | undefined,
      });
    }
  }

  return items;
}

/**
 * Get the business state sentence from a designated file
 */
export async function getBusinessStateSentence(): Promise<string> {
  try {
    const content = await getFileContent("wiki/business-state.txt");

    if (!content) {
      return "";
    }

    return content.content.trim();
  } catch (error) {
    console.error("Error reading business state sentence:", error);
    return "";
  }
}

/**
 * Get all data at once (useful for pages that need multiple data sources)
 */
export async function getAllData() {
  const [radarItems, groupTableItems, laneItems, taskItems, businessState] =
    await Promise.all([
      getRadarItems(),
      getGroupTableItems(),
      getLaneItems(),
      getTaskItems(),
      getBusinessStateSentence(),
    ]);

  return {
    radarItems,
    groupTableItems,
    laneItems,
    taskItems,
    businessState,
  };
}

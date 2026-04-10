import { NextRequest, NextResponse } from "next/server";
import { getFileContent, writeFile } from "@/lib/github";

interface UpdateRequest {
  id: string;
  newStatus: string;
}

interface GroupTableItem {
  id: string;
  title: string;
  status: string;
  owner?: string;
  raised?: string;
  decided?: string;
}

interface GroupTableFrontmatter {
  items: GroupTableItem[];
}

const VALID_STATUSES = ["raised", "discussed", "decided", "executing", "complete"];

/**
 * Parse YAML frontmatter from markdown
 */
function parseFrontmatter(content: string): {
  data: Record<string, any>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error("Invalid frontmatter format");
  }

  const yamlContent = match[1];
  const body = match[2];

  // Simple YAML parser for our specific format
  const data: Record<string, any> = {};
  const lines = yamlContent.split("\n");
  let currentKey: string | null = null;
  let inItems = false;
  let items: GroupTableItem[] = [];
  let currentItem: GroupTableItem | null = null;

  for (const line of lines) {
    if (line.startsWith("items:")) {
      inItems = true;
      items = [];
      continue;
    }

    if (inItems) {
      if (line.startsWith("  - id:")) {
        if (currentItem) {
          items.push(currentItem);
        }
        const id = line.substring(8).trim();
        currentItem = { id, title: "", status: "" };
      } else if (line.startsWith("    ") && currentItem) {
        const [key, ...valueParts] = line.trim().split(": ");
        const value = valueParts.join(": ").replace(/^["']|["']$/g, "");
        if (key === "title" || key === "status" || key === "owner" || key === "raised" || key === "decided") {
          (currentItem as any)[key] = value;
        }
      }
    }
  }

  if (currentItem) {
    items.push(currentItem);
  }

  data.items = items;
  return { data, body };
}

/**
 * Serialize items back to YAML frontmatter
 */
function serializeFrontmatter(items: GroupTableItem[]): string {
  let yaml = "---\nitems:\n";

  for (const item of items) {
    yaml += `  - id: ${item.id}\n`;
    yaml += `    title: "${item.title}"\n`;
    yaml += `    status: ${item.status}\n`;
    if (item.owner) {
      yaml += `    owner: ${item.owner}\n`;
    }
    if (item.raised) {
      yaml += `    raised: "${item.raised}"\n`;
    }
    if (item.decided) {
      yaml += `    decided: "${item.decided}"\n`;
    }
  }

  yaml += "---\n";
  return yaml;
}

/**
 * POST /api/group-table/update
 * Updates a group table item's status
 * Body: { id, newStatus }
 */
export async function POST(request: NextRequest) {
  // Check for auth cookie
  const authCookie = request.cookies.get("tribe-auth");

  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reqBody: UpdateRequest = await request.json();
    const { id, newStatus } = reqBody;

    // Validate required fields
    if (!id || !newStatus) {
      return NextResponse.json(
        { error: "Missing required fields: id, newStatus" },
        { status: 400 }
      );
    }

    // Validate status
    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Read the group-table.md file
    const fileResult = await getFileContent("wiki/group-table.md");

    if (!fileResult) {
      return NextResponse.json(
        { error: "group-table.md not found" },
        { status: 404 }
      );
    }

    const { content, sha } = fileResult;
    const { data, body } = parseFrontmatter(content);

    // Find and update the item
    const items = (data.items as GroupTableItem[]) || [];
    const itemIndex = items.findIndex((item) => item.id === id);

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: `Item with id '${id}' not found` },
        { status: 404 }
      );
    }

    const item = items[itemIndex];
    item.status = newStatus;

    // Add decided date if transitioning to decided
    if (newStatus === "decided" && !item.decided) {
      const today = new Date().toISOString().split("T")[0];
      item.decided = today;
    }

    // Serialize back to markdown
    const newFrontmatter = serializeFrontmatter(items);
    const newContent = newFrontmatter + body;

    // Write back to GitHub
    await writeFile(
      "wiki/group-table.md",
      newContent,
      `Update group table: ${item.title} → ${newStatus}`,
      sha
    );

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        title: item.title,
        status: item.status,
      },
    });
  } catch (error) {
    console.error("Error updating group table:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update group table", details: errorMessage },
      { status: 500 }
    );
  }
}

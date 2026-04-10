import { NextRequest, NextResponse } from "next/server";
import {
  getFileContent,
  writeFile,
  getDirectoryContents,
} from "@/lib/github";

interface Commitment {
  text: string;
  owner: string;
  type: "task" | "decision" | "commitment";
  confidence: "high" | "medium";
  sourceMessage: string;
  date: string;
}

/**
 * Call Anthropic API to extract commitments from messages
 */
async function extractWithClaude(
  apiKey: string,
  messagesContent: string
): Promise<Commitment[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Analyze these iMessage conversations between business co-founders (Shawn, Mark, Michael) and extract commitments, decisions, and action items.

Look for:
- Explicit commitments ("I'll do X", "I'll handle that", "I'm on it")
- Group decisions ("Let's go with X", "We agreed to X", "Sounds good, let's do that")
- Action items ("Can you X?", "Need to X", "Don't forget to X")

For each found, output a JSON array with objects containing:
- text: what was committed to or decided
- owner: who made the commitment or who it was assigned to (shawn, mark, or michael)
- type: "task" (action item), "decision" (group agreement), or "commitment" (personal pledge)
- confidence: "high" if explicit, "medium" if inferred from context
- sourceMessage: the exact message text
- date: the date from file context

Only extract genuine commitments, not casual conversation. Ignore greetings, acknowledgments, and off-topic chat.

Messages:
${messagesContent}

Return ONLY a JSON array. If none found, return [].`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "[]";

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

/**
 * POST /api/imessage/extract-commitments
 * Scans raw/imessage/ files for commitments and writes to wiki
 */
export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("tribe-auth");
  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: "GITHUB_TOKEN not configured" },
        { status: 500 }
      );
    }

    // Read recent iMessage files
    let messageFiles: { path: string; name: string }[] = [];
    try {
      const dir = await getDirectoryContents("raw/imessage");
      messageFiles = dir
        .filter((f) => f.type === "file" && f.name.endsWith(".md"))
        .sort((a, b) => b.name.localeCompare(a.name))
        .slice(0, 7); // Last 7 days
    } catch {
      return NextResponse.json({
        success: true,
        message: "No iMessage files found",
        extracted: 0,
      });
    }

    if (messageFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No iMessage files to process",
        extracted: 0,
      });
    }

    // Gather message content
    let allMessages = "";
    for (const file of messageFiles) {
      const content = await getFileContent(file.path);
      if (content) {
        allMessages += `\n\n--- File: ${file.name} ---\n${content.content}`;
      }
    }

    if (!allMessages.trim()) {
      return NextResponse.json({
        success: true,
        message: "No message content found",
        extracted: 0,
      });
    }

    // Extract commitments via Claude
    const extracted = await extractWithClaude(apiKey, allMessages);

    if (extracted.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No commitments found",
        extracted: 0,
      });
    }

    // Separate tasks from decisions
    const tasks = extracted.filter((c) => c.type === "task" || c.type === "commitment");
    const decisions = extracted.filter((c) => c.type === "decision");

    // Append tasks to wiki/tasks.md
    if (tasks.length > 0) {
      let tasksContent = "";
      let tasksSha: string | undefined;
      try {
        const existing = await getFileContent("wiki/tasks.md");
        if (existing) {
          tasksContent = existing.content;
          tasksSha = existing.sha;
        }
      } catch {
        // File doesn't exist
      }

      const newTaskLines = tasks.map(
        (t) => `- [ ] ${t.text} (${t.owner}) [${t.confidence}]`
      );

      const updated = tasksContent.trim()
        ? `${tasksContent.trim()}\n${newTaskLines.join("\n")}\n`
        : `---\ntype: tasks\n---\n\n${newTaskLines.join("\n")}\n`;

      await writeFile(
        "wiki/tasks.md",
        updated,
        `Add ${tasks.length} task(s) from iMessages`,
        tasksSha
      );
    }

    // Append decisions to wiki/group-table.md
    if (decisions.length > 0) {
      let gtContent = "";
      let gtSha: string | undefined;
      try {
        const existing = await getFileContent("wiki/group-table.md");
        if (existing) {
          gtContent = existing.content;
          gtSha = existing.sha;
        }
      } catch {
        // File doesn't exist
      }

      const dateStr = new Date().toISOString().split("T")[0];
      const newRows = decisions.map(
        (d, i) =>
          `| imsg-${dateStr}-${i + 1} | ${d.text} | decided | ${d.owner} | ${dateStr} | ${dateStr} |`
      );

      const updated = gtContent.trim()
        ? `${gtContent.trim()}\n${newRows.join("\n")}\n`
        : `---\ntype: group-table\n---\n\n| ID | Title | Status | Owner | Raised | Decided |\n| --- | --- | --- | --- | --- | --- |\n${newRows.join("\n")}\n`;

      await writeFile(
        "wiki/group-table.md",
        updated,
        `Add ${decisions.length} decision(s) from iMessages`,
        gtSha
      );
    }

    return NextResponse.json({
      success: true,
      extracted: extracted.length,
      tasks: tasks.length,
      decisions: decisions.length,
      items: extracted,
    });
  } catch (error) {
    console.error("Error extracting commitments:", error);
    return NextResponse.json(
      {
        error: "Failed to extract commitments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

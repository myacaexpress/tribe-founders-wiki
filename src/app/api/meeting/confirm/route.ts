import { NextRequest, NextResponse } from "next/server";
import { getFileContent, writeFile } from "@/lib/github";
import { parseFrontmatter } from "@/lib/github-data";

interface ConfirmItem {
  type: "task" | "decision" | "idea" | "question";
  text: string;
  owner?: string;
  confidence?: "high" | "medium";
}

interface ConfirmRequest {
  items: ConfirmItem[];
  meetingTitle: string;
  meetingDate: string;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Append task items to wiki/tasks.md
 */
async function appendTasks(tasks: ConfirmItem[]): Promise<void> {
  if (tasks.length === 0) return;

  const path = "wiki/tasks.md";
  let existingContent = "";
  let sha: string | undefined;

  try {
    const existing = await getFileContent(path);
    if (existing) {
      existingContent = existing.content;
      sha = existing.sha;
    }
  } catch {
    // File doesn't exist yet
  }

  // Build new task lines
  const newLines = tasks.map(
    (t) => `- [ ] ${t.text}${t.owner ? ` (${t.owner})` : ""}`
  );

  // Append to existing content
  const updatedContent = existingContent.trim()
    ? `${existingContent.trim()}\n${newLines.join("\n")}\n`
    : `---\ntype: tasks\n---\n\n${newLines.join("\n")}\n`;

  await writeFile(path, updatedContent, `Add ${tasks.length} task(s) from meeting`, sha);
}

/**
 * Append decision items to wiki/group-table.md
 */
async function appendDecisions(
  decisions: ConfirmItem[],
  meetingTitle: string
): Promise<void> {
  if (decisions.length === 0) return;

  const path = "wiki/group-table.md";
  let existingContent = "";
  let sha: string | undefined;

  try {
    const existing = await getFileContent(path);
    if (existing) {
      existingContent = existing.content;
      sha = existing.sha;
    }
  } catch {
    // File doesn't exist yet
  }

  const dateStr = formatDate();

  // Build new table rows
  const newRows = decisions.map((d, i) => {
    const id = `mtg-${dateStr}-${i + 1}`;
    return `| ${id} | ${d.text} | decided | all | ${dateStr} | ${dateStr} |`;
  });

  // Append to existing table content
  let updatedContent: string;
  if (existingContent.trim()) {
    updatedContent = `${existingContent.trim()}\n${newRows.join("\n")}\n`;
  } else {
    // Create new table
    updatedContent = `---\ntype: group-table\n---\n\n| ID | Title | Status | Owner | Raised | Decided |\n| --- | --- | --- | --- | --- | --- |\n${newRows.join("\n")}\n`;
  }

  await writeFile(
    path,
    updatedContent,
    `Add ${decisions.length} decision(s) from meeting: ${meetingTitle}`,
    sha
  );
}

/**
 * Write ideas to individual brainstorm files
 */
async function writeIdeas(
  ideas: ConfirmItem[],
  meetingTitle: string
): Promise<void> {
  if (ideas.length === 0) return;

  const dateStr = formatDate();

  for (let i = 0; i < ideas.length; i++) {
    const idea = ideas[i];
    const slug = idea.text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

    const path = `wiki/brainstorms/${dateStr}-${slug}.md`;

    const content = `---
type: idea
source: meeting
meeting: ${meetingTitle}
date: ${dateStr}
speaker: ${idea.owner || "unknown"}
---

# ${idea.text}

*Captured from meeting: ${meetingTitle} on ${dateStr}*
`;

    await writeFile(path, content, `Add idea from meeting: ${idea.text.slice(0, 50)}`);
  }
}

/**
 * Write open questions to wiki/open-questions.md
 */
async function appendQuestions(
  questions: ConfirmItem[],
  meetingTitle: string
): Promise<void> {
  if (questions.length === 0) return;

  const path = "wiki/open-questions.md";
  const dateStr = formatDate();
  let existingContent = "";
  let sha: string | undefined;

  try {
    const existing = await getFileContent(path);
    if (existing) {
      existingContent = existing.content;
      sha = existing.sha;
    }
  } catch {
    // File doesn't exist yet
  }

  const newLines = questions.map(
    (q) => `- [ ] ${q.text} *(from ${meetingTitle}, ${dateStr})*`
  );

  const updatedContent = existingContent.trim()
    ? `${existingContent.trim()}\n${newLines.join("\n")}\n`
    : `---\ntype: open-questions\n---\n\n# Open Questions\n\n${newLines.join("\n")}\n`;

  await writeFile(
    path,
    updatedContent,
    `Add ${questions.length} question(s) from meeting: ${meetingTitle}`,
    sha
  );
}

/**
 * POST /api/meeting/confirm
 * Confirms reviewed meeting items and writes them to the wiki
 *
 * Body: { items: ConfirmItem[], meetingTitle, meetingDate }
 */
export async function POST(request: NextRequest) {
  // Check for auth cookie
  const authCookie = request.cookies.get("tribe-auth");

  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: ConfirmRequest = await request.json();
    const { items, meetingTitle, meetingDate } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items to confirm" },
        { status: 400 }
      );
    }

    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: "GitHub integration not configured" },
        { status: 500 }
      );
    }

    // Group items by type
    const tasks = items.filter((i) => i.type === "task");
    const decisions = items.filter((i) => i.type === "decision");
    const ideas = items.filter((i) => i.type === "idea");
    const questions = items.filter((i) => i.type === "question");

    const title = meetingTitle || `Meeting ${meetingDate || formatDate()}`;

    // Write all item types in parallel
    const results = await Promise.allSettled([
      appendTasks(tasks),
      appendDecisions(decisions, title),
      writeIdeas(ideas, title),
      appendQuestions(questions, title),
    ]);

    // Check for errors
    const errors = results
      .filter((r) => r.status === "rejected")
      .map((r) => (r as PromiseRejectedResult).reason?.message || "Unknown error");

    if (errors.length > 0) {
      console.error("Some items failed to save:", errors);
      return NextResponse.json({
        success: true,
        partial: true,
        saved: {
          tasks: tasks.length,
          decisions: decisions.length,
          ideas: ideas.length,
          questions: questions.length,
        },
        errors,
      });
    }

    return NextResponse.json({
      success: true,
      saved: {
        tasks: tasks.length,
        decisions: decisions.length,
        ideas: ideas.length,
        questions: questions.length,
      },
    });
  } catch (error) {
    console.error("Error confirming meeting items:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to confirm items", details: errorMessage },
      { status: 500 }
    );
  }
}

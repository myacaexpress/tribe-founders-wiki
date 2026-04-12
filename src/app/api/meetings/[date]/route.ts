import { NextRequest, NextResponse } from "next/server";
import { getFileContent } from "@/lib/github";
import fs from "fs";
import path from "path";

interface ExtractedItem {
  id: string;
  type: "task" | "decision" | "idea";
  text: string;
  owner?: string;
  confidence?: "high" | "medium";
  status: "pending";
}

function parseItemsFromMarkdown(content: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  let idCounter = 0;

  const taskSection = content.match(/## Tasks?\n([\s\S]*?)(?=\n##|$)/i);
  const decisionSection = content.match(/## Decisions?\n([\s\S]*?)(?=\n##|$)/i);
  const ideaSection = content.match(/## Ideas?\n([\s\S]*?)(?=\n##|$)/i);

  function parseLines(section: RegExpMatchArray | null | undefined, type: "task" | "decision" | "idea") {
    if (!section) return;
    const lines = section[1].split("\n").filter((l) => l.trim().startsWith("-"));
    for (const line of lines) {
      const text = line.replace(/^-\s*/, "").trim();
      if (!text) continue;
      const ownerMatch = text.match(/\b(shawn|mark|michael)\b/i);
      items.push({
        id: `${type}-${++idCounter}`,
        type,
        text,
        owner: ownerMatch ? ownerMatch[1].toLowerCase() : undefined,
        confidence: "medium",
        status: "pending",
      });
    }
  }

  parseLines(taskSection, "task");
  parseLines(decisionSection, "decision");
  parseLines(ideaSection, "idea");

  return items;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  let content: string | null = null;
  let title = `Meeting ${date}`;

  // Try GitHub first
  try {
    const file = await getFileContent(`wiki/meetings/${date}.md`);
    if (file) content = file.content;
  } catch {
    // fall through to local fs
  }

  // Fall back to local filesystem
  if (!content) {
    const localPath = path.join(process.cwd(), "wiki", "meetings", `${date}.md`);
    if (fs.existsSync(localPath)) {
      content = fs.readFileSync(localPath, "utf-8");
    }
  }

  if (!content) {
    return NextResponse.json(
      { error: `No meeting found for ${date}` },
      { status: 404 }
    );
  }

  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) title = titleMatch[1];

  const summaryMatch = content.match(/## Summary\n([\s\S]*?)(?=\n##|$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : "";

  const items = parseItemsFromMarkdown(content);

  return NextResponse.json({ date, title, summary, items });
}

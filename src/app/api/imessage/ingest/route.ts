import { NextRequest, NextResponse } from "next/server";
import { getFileContent, writeFile } from "@/lib/github";

interface Message {
  sender: string;
  text: string;
  timestamp?: string;
}

interface IngestRequest {
  messages: Message[];
  date?: string;
  chatName?: string;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/**
 * POST /api/imessage/ingest
 * Receives iMessage data and commits to raw/imessage/YYYY-MM-DD.md
 *
 * Designed to be called by:
 * 1. A local cron script reading ~/Library/Messages/chat.db
 * 2. Manual paste via the UI
 * 3. The iMessage MCP tool
 *
 * Body: { messages: [{sender, text, timestamp?}], date?, chatName? }
 */
export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("tribe-auth");
  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: IngestRequest = await request.json();
    const { messages, date, chatName } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: "GitHub integration not configured" },
        { status: 500 }
      );
    }

    const dateStr = date || formatDate();
    const chat = chatName || "founders";
    const path = `raw/imessage/${dateStr}-${chat}.md`;

    // Format messages as markdown timeline
    const lines: string[] = [];
    lines.push(`---`);
    lines.push(`type: imessage`);
    lines.push(`chat: ${chat}`);
    lines.push(`date: ${dateStr}`);
    lines.push(`messageCount: ${messages.length}`);
    lines.push(`ingested: ${new Date().toISOString()}`);
    lines.push(`---`);
    lines.push(``);
    lines.push(`# iMessage: ${chat} — ${dateStr}`);
    lines.push(``);

    for (const msg of messages) {
      const time = msg.timestamp || "";
      const sender = msg.sender || "Unknown";
      const text = msg.text || "";

      if (time) {
        lines.push(`**${time}** — **${sender}**: ${text}`);
      } else {
        lines.push(`**${sender}**: ${text}`);
      }
      lines.push(``);
    }

    // Check if file already exists (append mode)
    let existingContent = "";
    let sha: string | undefined;
    try {
      const existing = await getFileContent(path);
      if (existing) {
        existingContent = existing.content;
        sha = existing.sha;
      }
    } catch {
      // File doesn't exist
    }

    let finalContent: string;
    if (existingContent) {
      // Append new messages to existing file
      const newMessages = lines.slice(lines.indexOf("") + 1).join("\n");
      finalContent = `${existingContent.trim()}\n\n---\n\n*Appended at ${new Date().toISOString()}*\n\n${newMessages}`;
    } else {
      finalContent = lines.join("\n");
    }

    await writeFile(
      path,
      finalContent,
      `Ingest ${messages.length} iMessages from ${chat} (${dateStr})`,
      sha
    );

    return NextResponse.json({
      success: true,
      path,
      messageCount: messages.length,
      date: dateStr,
    });
  } catch (error) {
    console.error("Error ingesting iMessages:", error);
    return NextResponse.json(
      {
        error: "Failed to ingest messages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

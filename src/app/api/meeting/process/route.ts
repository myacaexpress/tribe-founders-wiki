import { NextRequest, NextResponse } from "next/server";
import { writeFile, getFileContent } from "@/lib/github";

interface ProcessRequest {
  transcript: string;
  title: string;
  attendees: string[];
}

interface MeetingItem {
  type: "task" | "decision" | "idea" | "question";
  text: string;
  owner?: string;
  speaker?: string;
  confidence?: "high" | "medium";
}

interface ProcessResponse {
  success: boolean;
  items: MeetingItem[];
  summary: string;
}

interface AnthropicMessage {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Slugify a title for use in filenames
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parse Claude's response to extract structured items
 */
function parseItems(content: string): MeetingItem[] {
  const items: MeetingItem[] = [];

  // Parse tasks (look for task markers)
  const taskRegex = /(?:^|\n)(?:###?\s+)?(?:TASK|Task|TODO|ACTION|Action)[\s:]*\n?([\s\S]*?)(?=(?:^|\n)(?:###?\s+)?(?:TASK|Task|DECISION|Decision|IDEA|Idea|QUESTION|Question)|$)/gm;
  let match;

  // Task pattern: "TASK: description (Owner: name) [confidence]"
  const taskDetailRegex = /^\s*[-*]?\s*(.+?)(?:\s*\((?:Owner|Assigned to|Owner:):\s*(.+?)\))?(?:\s*\[(\w+)\])?$/;

  while ((match = taskRegex.exec(content)) !== null) {
    const lines = match[1].trim().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        const detailMatch = line.match(taskDetailRegex);
        if (detailMatch) {
          items.push({
            type: "task",
            text: detailMatch[1].trim(),
            owner: detailMatch[2]?.trim(),
            confidence: (detailMatch[3]?.toLowerCase() as "high" | "medium") || "medium",
          });
        }
      }
    }
  }

  // Decision pattern
  const decisionRegex = /(?:^|\n)(?:###?\s+)?(?:DECISION|Decision)[\s:]*\n?([\s\S]*?)(?=(?:^|\n)(?:###?\s+)?(?:TASK|Task|DECISION|Decision|IDEA|Idea|QUESTION|Question)|$)/gm;
  while ((match = decisionRegex.exec(content)) !== null) {
    const lines = match[1].trim().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        const detailMatch = line.match(taskDetailRegex);
        if (detailMatch) {
          items.push({
            type: "decision",
            text: detailMatch[1].trim(),
            confidence: (detailMatch[3]?.toLowerCase() as "high" | "medium") || "high",
          });
        }
      }
    }
  }

  // Idea pattern
  const ideaRegex = /(?:^|\n)(?:###?\s+)?(?:IDEA|Idea|INSIGHT|Insight)[\s:]*\n?([\s\S]*?)(?=(?:^|\n)(?:###?\s+)?(?:TASK|Task|DECISION|Decision|IDEA|Idea|QUESTION|Question)|$)/gm;
  while ((match = ideaRegex.exec(content)) !== null) {
    const lines = match[1].trim().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        const detailMatch = line.match(taskDetailRegex);
        if (detailMatch) {
          items.push({
            type: "idea",
            text: detailMatch[1].trim(),
            speaker: detailMatch[2]?.trim(),
          });
        }
      }
    }
  }

  // Question pattern
  const questionRegex = /(?:^|\n)(?:###?\s+)?(?:QUESTION|Question|OPEN|Open)[\s:]*\n?([\s\S]*?)(?=(?:^|\n)(?:###?\s+)?(?:TASK|Task|DECISION|Decision|IDEA|Idea|QUESTION|Question)|$)/gm;
  while ((match = questionRegex.exec(content)) !== null) {
    const lines = match[1].trim().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        const detailMatch = line.match(taskDetailRegex);
        if (detailMatch) {
          items.push({
            type: "question",
            text: detailMatch[1].trim(),
          });
        }
      }
    }
  }

  return items;
}

/**
 * Extract summary from Claude's response
 */
function extractSummary(content: string): string {
  const summaryRegex = /(?:###?\s+)?(?:SUMMARY|Summary)[\s:]*\n?([\s\S]*?)(?=(?:^|\n)###?\s+|$)/;
  const match = content.match(summaryRegex);

  if (match) {
    return match[1].trim().split("\n").slice(0, 3).join(" ").trim();
  }

  // Fallback: use first few lines that aren't section headers
  const lines = content.split("\n").filter((line) => !line.match(/^#+\s+/));
  return lines.slice(0, 3).join(" ").trim();
}

/**
 * POST /api/meeting/process
 * Processes a transcript to extract tasks, decisions, ideas, and questions
 *
 * Body: { transcript, title, attendees }
 */
export async function POST(request: NextRequest) {
  // Check for auth cookie
  const authCookie = request.cookies.get("tribe-auth");

  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: ProcessRequest = await request.json();
    const { transcript, title, attendees } = body;

    if (!transcript || !title || !attendees) {
      return NextResponse.json(
        { error: "Missing required fields: transcript, title, attendees" },
        { status: 400 }
      );
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      console.error("ANTHROPIC_API_KEY is not configured");
      return NextResponse.json(
        { error: "Processing service not configured" },
        { status: 500 }
      );
    }

    // Build the analysis prompt
    const prompt = `You are analyzing a meeting transcript to extract structured information.

Meeting Title: ${title}
Attendees: ${attendees.join(", ")}

Transcript:
${transcript}

Please analyze this transcript and extract the following information in a structured format:

1. **TASKS** - Any commitments or action items with owners if identifiable. Format each as a bullet point with (Owner: name) notation if known.

2. **DECISIONS** - Group agreements or decisions made during the meeting. Format each as a bullet point.

3. **IDEAS** - Novel approaches, suggestions, or interesting ideas worth preserving. Include the speaker if mentioned.

4. **QUESTIONS** - Unresolved issues or open questions that need further discussion.

5. **SUMMARY** - A 2-3 sentence summary of the meeting.

Structure your response with clear section headers for each category. For confidence levels, add [high] or [medium] at the end of items where applicable.`;

    // Call Anthropic API
    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!anthropicResponse.ok) {
      const error = await anthropicResponse.text();
      console.error("Anthropic API error:", error);
      return NextResponse.json(
        { error: "Failed to process transcript", details: error },
        { status: anthropicResponse.status }
      );
    }

    const anthropicData = (await anthropicResponse.json()) as AnthropicMessage;
    const responseText = anthropicData.content[0]?.text || "";

    // Parse the response to extract items
    const items = parseItems(responseText);
    const summary = extractSummary(responseText);

    // Try to commit results to GitHub if GITHUB_TOKEN is set
    if (process.env.GITHUB_TOKEN) {
      try {
        const dateStr = formatDate();
        const titleSlug = slugify(title);
        const gitPath = `wiki/meetings/${dateStr}-${titleSlug}.md`;

        // Create markdown content for meeting results
        const meetingContent = `# Meeting: ${title}

**Date:** ${new Date().toISOString()}
**Attendees:** ${attendees.join(", ")}

## Summary

${summary}

## Tasks

${
  items
    .filter((item) => item.type === "task")
    .map(
      (item) =>
        `- [ ] ${item.text}${item.owner ? ` (Owner: ${item.owner})` : ""}${item.confidence ? ` [${item.confidence}]` : ""}`
    )
    .join("\n") || "No tasks identified."
}

## Decisions

${
  items
    .filter((item) => item.type === "decision")
    .map((item) => `- ${item.text}${item.confidence ? ` [${item.confidence}]` : ""}`)
    .join("\n") || "No decisions recorded."
}

## Ideas

${
  items
    .filter((item) => item.type === "idea")
    .map((item) => `- ${item.text}${item.speaker ? ` (${item.speaker})` : ""}`)
    .join("\n") || "No ideas captured."
}

## Open Questions

${
  items
    .filter((item) => item.type === "question")
    .map((item) => `- ${item.text}`)
    .join("\n") || "No open questions."
}

## Raw Analysis

${responseText}
`;

        // Try to get existing file SHA for update
        let existingSha: string | undefined;
        try {
          const existing = await getFileContent(gitPath);
          if (existing) {
            existingSha = existing.sha;
          }
        } catch (e) {
          // File doesn't exist, that's fine
        }

        await writeFile(
          gitPath,
          meetingContent,
          `Add meeting notes: ${title}`,
          existingSha
        );
      } catch (gitError) {
        console.error("Failed to commit meeting results to GitHub:", gitError);
        // Don't fail the request if GitHub write fails
      }
    }

    return NextResponse.json({
      success: true,
      items,
      summary,
    });
  } catch (error) {
    console.error("Error processing transcript:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to process transcript", details: errorMessage },
      { status: 500 }
    );
  }
}

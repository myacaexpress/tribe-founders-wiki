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
 * Parse Claude's JSON response to extract structured items
 */
function parseItems(content: string): MeetingItem[] {
  // Try to find a JSON array in the response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          type: item.type || "task",
          text: item.text || item.content || "",
          owner: item.owner || item.speaker || undefined,
          confidence: item.confidence || "medium",
          speaker: item.speaker || undefined,
        }));
      }
    } catch {
      // JSON parse failed, fall through to text parsing
    }
  }

  // Fallback: line-by-line text parsing for bullet points
  const items: MeetingItem[] = [];
  const lines = content.split("\n");
  let currentType: MeetingItem["type"] = "task";

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section headers
    if (/^#+\s*TASK/i.test(trimmed) || /^TASK/i.test(trimmed)) { currentType = "task"; continue; }
    if (/^#+\s*DECISION/i.test(trimmed) || /^DECISION/i.test(trimmed)) { currentType = "decision"; continue; }
    if (/^#+\s*IDEA/i.test(trimmed) || /^IDEA/i.test(trimmed)) { currentType = "idea"; continue; }
    if (/^#+\s*(?:QUESTION|OPEN)/i.test(trimmed) || /^(?:QUESTION|OPEN)/i.test(trimmed)) { currentType = "question"; continue; }
    if (/^#+\s*SUMMARY/i.test(trimmed) || /^SUMMARY/i.test(trimmed)) break; // Stop before summary

    // Match bullet lines (-, *, •, numbered)
    const bulletMatch = trimmed.match(/^(?:[-*•]|\d+[.)]\s)\s*(.+)/);
    if (bulletMatch) {
      const text = bulletMatch[1];

      // Extract owner: "(Owner: name)" or "(name)"
      const ownerMatch = text.match(/\((?:Owner:\s*)?(\w+)\)/i);
      const owner = ownerMatch ? ownerMatch[1].toLowerCase() : undefined;

      // Extract confidence: "[high]" or "[medium]"
      const confMatch = text.match(/\[(high|medium|low)\]/i);
      const confidence = confMatch ? confMatch[1].toLowerCase() as "high" | "medium" : "medium";

      // Clean text
      const cleanText = text
        .replace(/\((?:Owner:\s*)?\w+\)/gi, "")
        .replace(/\[(high|medium|low)\]/gi, "")
        .trim();

      if (cleanText.length > 2) {
        items.push({ type: currentType, text: cleanText, owner, confidence });
      }
    }
  }

  return items;
}

/**
 * Extract summary from Claude's response
 */
function extractSummary(content: string): string {
  // Try JSON format first
  try {
    const parsed = JSON.parse(content);
    if (parsed.summary) return parsed.summary;
  } catch {
    // Not JSON
  }

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

    // Map items to frontend format (text -> content)
    const frontendItems = items.map((item) => ({
      type: item.type,
      content: item.text,
      owner: item.owner || item.speaker,
      confidence: item.confidence,
    }));

    return NextResponse.json({
      success: true,
      items: frontendItems,
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

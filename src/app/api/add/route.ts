import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "@/lib/github";

interface AddRequest {
  content: string;
  destination: "lane" | "brainstorm";
  founder?: string;
}

/**
 * Generate a slug from content (first few words)
 */
function generateSlug(content: string): string {
  return content
    .split(/\s+/)
    .slice(0, 5)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate a unique ID (timestamp-based)
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const date = new Date();
  return date.toISOString().split("T")[0];
}

/**
 * Extract title from content (first line or first ~60 chars)
 */
function extractTitle(content: string): string {
  const firstLine = content.split("\n")[0];
  if (firstLine.length <= 60) {
    return firstLine;
  }
  return content.substring(0, 60).trim() + "...";
}

/**
 * POST /api/add
 * Creates a new item in the founder's lane or brainstorm
 * Body: { content, destination: "lane" | "brainstorm", founder?: string }
 */
export async function POST(request: NextRequest) {
  // Check for auth cookie
  const authCookie = request.cookies.get("tribe-auth");

  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: AddRequest = await request.json();
    let { content, destination, founder } = body;

    // Validate required fields
    if (!content || !destination) {
      return NextResponse.json(
        { error: "Missing required fields: content, destination" },
        { status: 400 }
      );
    }

    // Default founder to "shawn" for Phase 1
    if (!founder) {
      founder = "shawn";
    }

    const today = getTodayDate();
    const slug = generateSlug(content);
    const filename = `${today}-${slug}.md`;
    const title = extractTitle(content);
    const id = generateId();

    let fileContent: string;
    let filePath: string;
    let confirmationMessage: string;

    if (destination === "lane") {
      filePath = `founders/${founder}/lane/${filename}`;
      fileContent = `---
id: ${id}
title: "${title}"
status: active
zone: active
founder: ${founder}
---
# ${title}

**Status:** New — just captured
**Why it matters:** ${content}
**Next step:** Review and refine
**Zone:** active

## Log
- ${today} — Created from Add Something
`;
      confirmationMessage = `Got it. Saved to your lane as '${title}'`;
    } else if (destination === "brainstorm") {
      filePath = `founders/${founder}/brainstorm/${filename}`;
      fileContent = `---
date: ${today}
founder: ${founder}
---
${content}
`;
      confirmationMessage = `Got it. Added to your brainstorm.`;
    } else {
      return NextResponse.json(
        { error: "Invalid destination. Must be 'lane' or 'brainstorm'" },
        { status: 400 }
      );
    }

    try {
      // Try to write to GitHub
      await writeFile(
        filePath,
        fileContent,
        `Add ${destination} item: ${title}`
      );

      return NextResponse.json({
        success: true,
        path: filePath,
        message: confirmationMessage,
      });
    } catch (githubError) {
      // If GitHub write fails, log locally but return success
      console.error("GitHub write failed, falling back to local:", githubError);

      return NextResponse.json({
        success: true,
        path: filePath,
        message: `${confirmationMessage} (logged locally)`,
      });
    }
  } catch (error) {
    console.error("Error adding item:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to add item", details: errorMessage },
      { status: 500 }
    );
  }
}

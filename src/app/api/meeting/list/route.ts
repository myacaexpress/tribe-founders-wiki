import { NextRequest, NextResponse } from "next/server";
import { getDirectoryContents, getFileContent } from "@/lib/github";

interface MeetingSummary {
  name: string;
  path: string;
  date: string;
  title: string;
  isBrief: boolean;
}

/**
 * GET /api/meeting/list
 * Lists all meeting notes from wiki/meetings/ in GitHub
 */
export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("tribe-auth");
  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: "GitHub not configured" },
        { status: 500 }
      );
    }

    const files = await getDirectoryContents("wiki/meetings");

    // Filter for .md files and parse metadata from filenames
    const meetings: MeetingSummary[] = files
      .filter((f) => f.type === "file" && f.name.endsWith(".md"))
      .map((f) => {
        const name = f.name.replace(".md", "");
        // Filename format: YYYY-MM-DD-title-slug.md
        const dateMatch = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)/);
        const date = dateMatch ? dateMatch[1] : "";
        const slug = dateMatch ? dateMatch[2] : name;
        const isBrief = slug.endsWith("-brief");

        // Convert slug to readable title
        const title = slug
          .replace(/-brief$/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        return {
          name: f.name,
          path: f.path,
          date,
          title: isBrief ? `${title} (Brief)` : title,
          isBrief,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // Newest first

    return NextResponse.json({ success: true, meetings });
  } catch (error) {
    console.error("Error listing meetings:", error);
    return NextResponse.json(
      { error: "Failed to list meetings" },
      { status: 500 }
    );
  }
}

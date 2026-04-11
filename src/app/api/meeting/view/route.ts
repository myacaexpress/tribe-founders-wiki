import { NextRequest, NextResponse } from "next/server";
import { getFileContent } from "@/lib/github";

/**
 * GET /api/meeting/view?file=wiki/meetings/2026-04-11-example.md
 * Returns the markdown content of a specific meeting file
 */
export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("tribe-auth");
  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filePath = request.nextUrl.searchParams.get("file");
  if (!filePath || !filePath.startsWith("wiki/meetings/")) {
    return NextResponse.json(
      { error: "Invalid file path" },
      { status: 400 }
    );
  }

  try {
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: "GitHub not configured" },
        { status: 500 }
      );
    }

    const result = await getFileContent(filePath);
    if (!result) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, content: result.content });
  } catch (error) {
    console.error("Error reading meeting:", error);
    return NextResponse.json(
      { error: "Failed to read meeting" },
      { status: 500 }
    );
  }
}

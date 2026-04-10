import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "@/lib/github";

interface WriteFileRequest {
  path: string;
  content: string;
  message: string;
  sha?: string;
}

/**
 * POST /api/github/write
 * Creates or updates a file in the GitHub repo
 * Body: { path, content, message, sha? }
 */
export async function POST(request: NextRequest) {
  // Check for auth cookie
  const authCookie = request.cookies.get("tribe-auth");

  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: WriteFileRequest = await request.json();
    const { path, content, message, sha } = body;

    // Validate required fields
    if (!path || !content || !message) {
      return NextResponse.json(
        { error: "Missing required fields: path, content, message" },
        { status: 400 }
      );
    }

    const newSha = await writeFile(path, content, message, sha);

    return NextResponse.json({
      success: true,
      sha: newSha,
      path,
    });
  } catch (error) {
    console.error("Error writing file:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to write file", details: errorMessage },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDirectoryContents } from "@/lib/github";

/**
 * GET /api/github/list?path=wiki
 * Lists contents of a directory in the GitHub repo
 */
export async function GET(request: NextRequest) {
  // Check for auth cookie
  const authCookie = request.cookies.get("tribe-auth");

  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Missing path parameter" },
        { status: 400 }
      );
    }

    const contents = await getDirectoryContents(path);

    return NextResponse.json({
      path,
      contents,
      count: contents.length,
    });
  } catch (error) {
    console.error("Error listing directory:", error);
    return NextResponse.json(
      { error: "Failed to list directory" },
      { status: 500 }
    );
  }
}

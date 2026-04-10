import { NextRequest, NextResponse } from "next/server";
import {
  getFileContent,
  getDirectoryContents,
  GitHubDirectoryItem,
} from "@/lib/github";
import { parseFrontmatter } from "@/lib/github-data";

interface WatcherConfig {
  founder: string;
  query: string;
  targetPage: string;
  schedule: string;
  type: "email" | "manual";
  description: string;
  active?: boolean;
}

interface WatcherListItem {
  name: string;
  path: string;
  config: WatcherConfig;
  active: boolean;
  lastRunAt?: string;
  status: "configured" | "error";
  error?: string;
}

/**
 * GET /api/watchers/list
 * Lists all configured watchers with their frontmatter configuration and status
 *
 * Returns an array of watcher configurations with metadata about each watcher
 */
export async function GET(request: NextRequest) {
  // Check for auth cookie
  const authCookie = request.cookies.get("tribe-auth");
  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const watchers: WatcherListItem[] = [];

    // Get all watcher files from watchers/ directory
    let watcherFiles: GitHubDirectoryItem[] = [];
    try {
      watcherFiles = await getDirectoryContents("watchers");
    } catch (error) {
      console.error("Error reading watchers directory:", error);
      return NextResponse.json(
        {
          error: "Failed to read watchers directory",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Filter for markdown files and read their configs
    const mdFiles = watcherFiles.filter(
      (item) => item.type === "file" && item.name.endsWith(".md")
    );

    for (const file of mdFiles) {
      const watcher: WatcherListItem = {
        name: file.name,
        path: file.path,
        config: {} as WatcherConfig,
        active: true,
        status: "configured",
      };

      try {
        const content = await getFileContent(file.path);
        if (!content) {
          watcher.status = "error";
          watcher.error = "File content not found";
          watchers.push(watcher);
          continue;
        }

        // Parse frontmatter
        const { frontmatter } = parseFrontmatter(content.content);
        const config = frontmatter as WatcherConfig;

        // Validate required fields
        if (!config.founder || !config.targetPage || !config.description) {
          watcher.status = "error";
          watcher.error =
            "Missing required fields: founder, targetPage, description";
          watchers.push(watcher);
          continue;
        }

        watcher.config = config;
        watcher.active = config.active !== false;

        // TODO: In the future, we could track last run timestamp in a separate file
        // For now, we only indicate the configuration status
      } catch (error) {
        watcher.status = "error";
        watcher.error =
          error instanceof Error ? error.message : "Failed to parse watcher";
        console.error(`Error reading watcher ${file.name}:`, error);
      }

      watchers.push(watcher);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: watchers.length,
      watchers: watchers.sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (error) {
    console.error("Error listing watchers:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to list watchers", details: errorMessage },
      { status: 500 }
    );
  }
}

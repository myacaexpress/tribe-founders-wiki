import { NextRequest, NextResponse } from "next/server";
import {
  getFileContent,
  writeFile,
  getDirectoryContents,
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

interface WatcherResult {
  name: string;
  success: boolean;
  message: string;
  error?: string;
  targetPage?: string;
  updatedAt?: string;
}

/**
 * Call Anthropic API via fetch (no SDK dependency)
 */
async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

/**
 * POST /api/watchers/run
 * Executes all active watchers and updates their target wiki pages
 */
export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("tribe-auth");
  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: "GITHUB_TOKEN not configured" },
        { status: 500 }
      );
    }

    const results: WatcherResult[] = [];

    // Read all watcher files
    let watcherFiles: { path: string; name: string }[] = [];
    try {
      const directoryItems = await getDirectoryContents("watchers");
      watcherFiles = directoryItems
        .filter((item) => item.type === "file" && item.name.endsWith(".md"))
        .map((item) => ({ path: item.path, name: item.name }));
    } catch (error) {
      return NextResponse.json(
        {
          error: "No watchers directory found. Create watchers/*.md files in the repo.",
          details: error instanceof Error ? error.message : "Unknown",
        },
        { status: 404 }
      );
    }

    if (watcherFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No watcher files found",
        results: [],
      });
    }

    // Process each watcher
    for (const watcherFile of watcherFiles) {
      const result: WatcherResult = {
        name: watcherFile.name,
        success: false,
        message: "",
      };

      try {
        const watcherContent = await getFileContent(watcherFile.path);
        if (!watcherContent) {
          result.error = "File not found";
          results.push(result);
          continue;
        }

        const { frontmatter, body } = parseFrontmatter(watcherContent.content);
        const config = frontmatter as WatcherConfig;

        // Skip inactive watchers
        if (config.active === false) {
          result.message = "Skipped (inactive)";
          result.success = true;
          results.push(result);
          continue;
        }

        if (!config.targetPage || !config.description) {
          result.error = "Missing required fields: targetPage, description";
          results.push(result);
          continue;
        }

        // Fetch existing target page content
        let existingContent = "";
        let targetPageSha: string | undefined;
        try {
          const existing = await getFileContent(config.targetPage);
          if (existing) {
            existingContent = existing.content;
            targetPageSha = existing.sha;
          }
        } catch {
          // Target page doesn't exist yet
        }

        const systemPrompt = `You are a wiki content curator for Trifecta Benefits (TriBe), an insurance agency. Your job is to update wiki pages based on watcher configurations that monitor specific information sources.

Generate clean markdown content that:
1. Preserves existing structure and history if a page already exists
2. Adds a dated status update section at the top
3. Uses clear formatting with headers, lists, and status badges
4. Includes an "Action Items" section when relevant
5. Marks confidence levels: [high] for explicit info, [medium] for inferred

Return ONLY the markdown content.`;

        const userPrompt = `Watcher: ${watcherFile.name}
Founder: ${config.founder}
Description: ${config.description}
Query: ${config.query || "N/A"}

Current page content:
${existingContent || "(New page — create initial structure)"}

Additional watcher context:
${body || "None"}

Generate an updated wiki page. If this is a new page, create a proper structure for tracking ${config.founder}'s work on "${config.targetPage.split("/").pop()?.replace(".md", "")}". Include a status update dated ${new Date().toISOString().split("T")[0]}.`;

        const generatedContent = await callClaude(
          apiKey,
          systemPrompt,
          userPrompt
        );

        if (!generatedContent) {
          result.error = "Claude returned empty content";
          results.push(result);
          continue;
        }

        // Write to target page
        await writeFile(
          config.targetPage,
          generatedContent,
          `Watcher update: ${config.description.slice(0, 60)}`,
          targetPageSha
        );

        result.success = true;
        result.message = "Updated successfully";
        result.targetPage = config.targetPage;
        result.updatedAt = new Date().toISOString();
      } catch (error) {
        result.error =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Error processing watcher ${watcherFile.name}:`, error);
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalProcessed: watcherFiles.length,
      results,
    });
  } catch (error) {
    console.error("Error running watchers:", error);
    return NextResponse.json(
      {
        error: "Failed to run watchers",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}

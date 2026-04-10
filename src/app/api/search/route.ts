import { NextRequest, NextResponse } from "next/server";
import {
  getFileContent,
  getDirectoryContents,
} from "@/lib/github";

interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
  type: string;
}

/**
 * Recursively get all markdown files from a GitHub directory
 */
async function getAllMarkdownFiles(
  dir: string,
  depth = 0
): Promise<{ path: string; name: string }[]> {
  if (depth > 3) return []; // Max recursion depth

  const files: { path: string; name: string }[] = [];

  try {
    const items = await getDirectoryContents(dir);

    for (const item of items) {
      if (item.type === "file" && item.name.endsWith(".md")) {
        files.push({ path: item.path, name: item.name });
      } else if (item.type === "dir") {
        const subFiles = await getAllMarkdownFiles(item.path, depth + 1);
        files.push(...subFiles);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files;
}

/**
 * Simple keyword search scoring
 */
function scoreMatch(content: string, query: string): number {
  const lowerContent = content.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  let score = 0;
  for (const term of terms) {
    // Count occurrences
    const regex = new RegExp(term, "gi");
    const matches = lowerContent.match(regex);
    if (matches) {
      score += matches.length;

      // Bonus for title matches (first line)
      const firstLine = lowerContent.split("\n")[0] || "";
      if (firstLine.includes(term)) {
        score += 5;
      }
    }
  }

  // Bonus if all terms found
  const allFound = terms.every((t) => lowerContent.includes(t));
  if (allFound) score += 10;

  return score;
}

/**
 * Extract a relevant snippet around the first match
 */
function extractSnippet(content: string, query: string): string {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (terms.some((t) => lower.includes(t))) {
      // Get surrounding context (1 line before, match, 1 line after)
      const start = Math.max(0, i - 1);
      const end = Math.min(lines.length, i + 2);
      return lines
        .slice(start, end)
        .join(" ")
        .replace(/^#+\s*/, "")
        .replace(/\*\*/g, "")
        .slice(0, 200)
        .trim();
    }
  }

  // Fallback: first meaningful line
  const meaningful = lines.find(
    (l) => l.trim() && !l.startsWith("---") && !l.startsWith("#")
  );
  return (meaningful || lines[0] || "").slice(0, 200).trim();
}

/**
 * Determine content type from path
 */
function getType(path: string): string {
  if (path.includes("wiki/meetings")) return "meeting";
  if (path.includes("wiki/tasks")) return "task";
  if (path.includes("wiki/group-table")) return "decision";
  if (path.includes("wiki/radar")) return "radar";
  if (path.includes("wiki/brainstorms")) return "idea";
  if (path.includes("wiki/reimbursements")) return "reimbursement";
  if (path.includes("wiki/open-questions")) return "question";
  if (path.includes("founders/") && path.includes("/lane/")) return "lane";
  if (path.includes("raw/imessage")) return "imessage";
  if (path.includes("raw/transcripts")) return "transcript";
  if (path.includes("watchers/")) return "watcher";
  return "wiki";
}

/**
 * Extract title from markdown content
 */
function getTitle(content: string, fileName: string): string {
  const headingMatch = content.match(/^#\s+(.+)/m);
  if (headingMatch) return headingMatch[1];

  const fmTitleMatch = content.match(/title:\s*(.+)/);
  if (fmTitleMatch) return fmTitleMatch[1].trim();

  return fileName.replace(".md", "").replace(/-/g, " ");
}

/**
 * GET /api/search?q=query
 * Searches across all wiki and raw files using keyword matching
 */
export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("tribe-auth");
  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    // Gather all searchable files
    const [wikiFiles, rawFiles, founderFiles, watcherFiles] =
      await Promise.all([
        getAllMarkdownFiles("wiki"),
        getAllMarkdownFiles("raw"),
        getAllMarkdownFiles("founders"),
        getAllMarkdownFiles("watchers"),
      ]);

    const allFiles = [
      ...wikiFiles,
      ...rawFiles,
      ...founderFiles,
      ...watcherFiles,
    ];

    // Search each file
    const results: SearchResult[] = [];

    // Process in batches of 5 to avoid rate limits
    for (let i = 0; i < allFiles.length; i += 5) {
      const batch = allFiles.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            const content = await getFileContent(file.path);
            if (!content) return null;

            const score = scoreMatch(content.content, query);
            if (score === 0) return null;

            return {
              path: file.path,
              title: getTitle(content.content, file.name),
              snippet: extractSnippet(content.content, query),
              score,
              type: getType(file.path),
            };
          } catch {
            return null;
          }
        })
      );

      results.push(
        ...(batchResults.filter(Boolean) as SearchResult[])
      );
    }

    // Sort by score descending, limit to top 20
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, 20);

    return NextResponse.json({
      success: true,
      query,
      resultCount: topResults.length,
      totalFiles: allFiles.length,
      results: topResults,
    });
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

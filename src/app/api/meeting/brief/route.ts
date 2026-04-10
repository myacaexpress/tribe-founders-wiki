import { NextRequest, NextResponse } from "next/server";
import { getFileContent, writeFile, getDirectoryContents } from "@/lib/github";
import { parseFrontmatter } from "@/lib/github-data";

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/**
 * Slugify a string for use in filenames
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Gather open tasks from wiki/tasks.md
 */
async function getOpenTasks(): Promise<string[]> {
  try {
    const file = await getFileContent("wiki/tasks.md");
    if (!file) return [];

    const lines = file.content.split("\n");
    return lines
      .filter((line) => line.match(/^-\s*\[\s\]/))
      .map((line) => line.replace(/^-\s*\[\s\]\s*/, "").trim());
  } catch {
    return [];
  }
}

/**
 * Gather recent decisions from wiki/group-table.md
 */
async function getRecentDecisions(): Promise<string[]> {
  try {
    const file = await getFileContent("wiki/group-table.md");
    if (!file) return [];

    const lines = file.content.split("\n");
    const decisions: string[] = [];
    let inTable = false;

    for (const line of lines) {
      if (line.includes("|") && line.includes("---")) continue;
      if (line.includes("|") && !inTable) {
        inTable = true;
        continue;
      }
      if (line.includes("|") && inTable) {
        const cells = line
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean);
        if (cells.length >= 3) {
          const status = cells[2]?.toLowerCase();
          if (status !== "complete") {
            decisions.push(`${cells[1]} (${status})`);
          }
        }
      }
    }
    return decisions;
  } catch {
    return [];
  }
}

/**
 * Gather radar items
 */
async function getRadarItems(): Promise<string[]> {
  try {
    const file = await getFileContent("wiki/radar.md");
    if (!file) return [];

    const { body } = parseFrontmatter(file.content);
    const lines = body.split("\n");
    return lines
      .filter((line) => line.startsWith("-"))
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Gather open questions
 */
async function getOpenQuestions(): Promise<string[]> {
  try {
    const file = await getFileContent("wiki/open-questions.md");
    if (!file) return [];

    const lines = file.content.split("\n");
    return lines
      .filter((line) => line.match(/^-\s*\[\s\]/))
      .map((line) => line.replace(/^-\s*\[\s\]\s*/, "").trim());
  } catch {
    return [];
  }
}

/**
 * Gather lane items for each founder
 */
async function getLaneSummary(): Promise<Record<string, string[]>> {
  const lanes: Record<string, string[]> = {};

  try {
    const founders = await getDirectoryContents("founders");

    for (const founder of founders) {
      if (founder.type !== "dir") continue;

      const name = founder.name;
      lanes[name] = [];

      try {
        const laneDir = await getDirectoryContents(`${founder.path}/lane`);

        for (const file of laneDir) {
          if (file.type !== "file" || !file.name.endsWith(".md")) continue;

          const content = await getFileContent(file.path);
          if (content) {
            const { frontmatter } = parseFrontmatter(content.content);
            if (frontmatter.status !== "complete") {
              lanes[name].push(
                `${frontmatter.title || file.name} (${frontmatter.status || "exploring"})`
              );
            }
          }
        }
      } catch {
        // No lane dir for this founder
      }
    }
  } catch {
    // No founders dir
  }

  return lanes;
}

/**
 * Gather recent meeting notes (last 3)
 */
async function getRecentMeetings(): Promise<string[]> {
  try {
    const files = await getDirectoryContents("wiki/meetings");
    const mdFiles = files
      .filter((f) => f.type === "file" && f.name.endsWith(".md"))
      .sort((a, b) => b.name.localeCompare(a.name))
      .slice(0, 3);

    const summaries: string[] = [];
    for (const file of mdFiles) {
      const content = await getFileContent(file.path);
      if (content) {
        // Extract just the title from the first heading
        const titleMatch = content.content.match(/^#\s+(.+)/m);
        summaries.push(titleMatch ? titleMatch[1] : file.name);
      }
    }

    return summaries;
  } catch {
    return [];
  }
}

/**
 * POST /api/meeting/brief
 * Generates a pre-meeting briefing document from wiki data
 *
 * Body: { title?: string }
 */
export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("tribe-auth");
  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let title = "Founders Sync";
    try {
      const body = await request.json();
      if (body.title) title = body.title;
    } catch {
      // No body or invalid JSON, use defaults
    }

    const dateStr = formatDate();

    // Gather all data in parallel
    const [openTasks, decisions, radar, questions, lanes, recentMeetings] =
      await Promise.all([
        getOpenTasks(),
        getRecentDecisions(),
        getRadarItems(),
        getOpenQuestions(),
        getLaneSummary(),
        getRecentMeetings(),
      ]);

    // Build the briefing markdown
    const sections: string[] = [];

    sections.push(`# Pre-Meeting Brief: ${title}`);
    sections.push(`**Date:** ${dateStr}`);
    sections.push(`**Generated:** ${new Date().toISOString()}\n`);

    // Radar / urgent items
    if (radar.length > 0) {
      sections.push(`## Radar Items\n`);
      radar.forEach((item) => sections.push(`- ${item}`));
      sections.push("");
    }

    // Open tasks
    if (openTasks.length > 0) {
      sections.push(`## Open Tasks (${openTasks.length})\n`);
      openTasks.forEach((task) => sections.push(`- [ ] ${task}`));
      sections.push("");
    }

    // Active decisions
    if (decisions.length > 0) {
      sections.push(`## Active Decisions\n`);
      decisions.forEach((d) => sections.push(`- ${d}`));
      sections.push("");
    }

    // Open questions
    if (questions.length > 0) {
      sections.push(`## Open Questions\n`);
      questions.forEach((q) => sections.push(`- ${q}`));
      sections.push("");
    }

    // Founder lanes
    const laneFounders = Object.entries(lanes).filter(
      ([, items]) => items.length > 0
    );
    if (laneFounders.length > 0) {
      sections.push(`## Founder Lanes\n`);
      for (const [founder, items] of laneFounders) {
        sections.push(
          `### ${founder.charAt(0).toUpperCase() + founder.slice(1)}`
        );
        items.forEach((item) => sections.push(`- ${item}`));
        sections.push("");
      }
    }

    // Recent meetings
    if (recentMeetings.length > 0) {
      sections.push(`## Recent Meetings\n`);
      recentMeetings.forEach((m) => sections.push(`- ${m}`));
      sections.push("");
    }

    const briefContent = sections.join("\n");

    // Try to commit to GitHub
    let committed = false;
    if (process.env.GITHUB_TOKEN) {
      try {
        const gitPath = `wiki/meetings/${dateStr}-${slugify(title)}-brief.md`;

        let existingSha: string | undefined;
        try {
          const existing = await getFileContent(gitPath);
          if (existing) existingSha = existing.sha;
        } catch {
          // File doesn't exist
        }

        await writeFile(
          gitPath,
          briefContent,
          `Generate pre-meeting brief: ${title}`,
          existingSha
        );
        committed = true;
      } catch (err) {
        console.error("Failed to commit brief to GitHub:", err);
      }
    }

    return NextResponse.json({
      success: true,
      brief: briefContent,
      committed,
      stats: {
        openTasks: openTasks.length,
        activeDecisions: decisions.length,
        radarItems: radar.length,
        openQuestions: questions.length,
      },
    });
  } catch (error) {
    console.error("Error generating brief:", error);
    return NextResponse.json(
      {
        error: "Failed to generate brief",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

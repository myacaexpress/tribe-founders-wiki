import { NextRequest, NextResponse } from "next/server";
import { getFileContent, writeFile } from "@/lib/github";

interface ConfirmedItem {
  id: string;
  type: "task" | "decision" | "idea";
  text: string;
  owner?: string;
  status: "confirmed" | "edited" | "pending";
}

interface ConfirmPayload {
  date: string;
  items: ConfirmedItem[];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

async function appendToFile(filePath: string, newLines: string) {
  const existing = await getFileContent(filePath);
  const currentContent = existing?.content ?? "";
  const sha = existing?.sha;
  const updated = currentContent.trimEnd() + "\n\n" + newLines.trim() + "\n";
  await writeFile(filePath, updated, `Meeting review: append items from ${today()}`, sha);
}

export async function POST(req: NextRequest) {
  try {
    const { date, items } = (await req.json()) as ConfirmPayload;

    if (!date || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const tasks = items.filter((i) => i.type === "task");
    const decisions = items.filter((i) => i.type === "decision");
    const ideas = items.filter((i) => i.type === "idea");

    const errors: string[] = [];

    // Write tasks → founder lane folders
    for (const task of tasks) {
      const owner = task.owner?.toLowerCase();
      const filePath = owner
        ? `founders/${owner}/lane/meeting-tasks.md`
        : "wiki/tasks.md";
      try {
        const line = `- [ ] ${task.text}  *(from meeting ${date})*`;
        await appendToFile(filePath, line);
      } catch (e) {
        errors.push(`task "${task.text.slice(0, 40)}": ${e}`);
      }
    }

    // Write decisions → wiki/decisions/
    if (decisions.length) {
      const lines = decisions
        .map((d) => `- **${d.text}**${d.owner ? `  *(${d.owner})*` : ""}  — ${date}`)
        .join("\n");
      const decisionFile = `wiki/decisions/${date}.md`;
      try {
        const content = `# Decisions — ${date}\n\n${lines}\n`;
        const existing = await getFileContent(decisionFile);
        await writeFile(decisionFile, content, `Meeting decisions from ${date}`, existing?.sha);
      } catch (e) {
        errors.push(`decisions: ${e}`);
      }
    }

    // Write ideas → wiki/ideas/
    if (ideas.length) {
      const lines = ideas.map((i) => `- ${i.text}  *(from meeting ${date})*`).join("\n");
      const ideaFile = "wiki/ideas/seedlings.md";
      try {
        await appendToFile(ideaFile, `\n## From meeting ${date}\n\n${lines}`);
      } catch (e) {
        errors.push(`ideas: ${e}`);
      }
    }

    if (errors.length) {
      return NextResponse.json(
        { ok: false, errors },
        { status: 207 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

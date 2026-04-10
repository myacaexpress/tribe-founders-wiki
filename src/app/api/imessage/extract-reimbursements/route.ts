import { NextRequest, NextResponse } from "next/server";
import {
  getFileContent,
  writeFile,
  getDirectoryContents,
} from "@/lib/github";

interface Reimbursement {
  date: string;
  who: string;
  amount: string;
  description: string;
  confidence: "high" | "medium" | "low";
  sourceMessage: string;
}

/**
 * Call Anthropic API to extract reimbursements from messages
 */
async function extractWithClaude(
  apiKey: string,
  messagesContent: string
): Promise<Reimbursement[]> {
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
      messages: [
        {
          role: "user",
          content: `Analyze these iMessage conversations between business co-founders and extract any mentions of money spent, reimbursements owed, or expenses.

For each expense found, output a JSON array with objects containing:
- date: the date (from the message or file context)
- who: who spent the money
- amount: the dollar amount (include $ sign)
- description: what it was for
- confidence: "high" if explicitly stated amount, "medium" if inferred, "low" if unclear
- sourceMessage: the exact message text that mentions the expense

Only extract real expenses, not hypothetical amounts or price quotes being discussed. Ignore messages about general pricing, comparisons, or hypothetical costs.

Messages:
${messagesContent}

Return ONLY a JSON array. If no expenses found, return [].`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "[]";

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

/**
 * POST /api/imessage/extract-reimbursements
 * Scans raw/imessage/ files for expense mentions and updates wiki/reimbursements.md
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

    // Read all iMessage files
    let messageFiles: { path: string; name: string }[] = [];
    try {
      const dir = await getDirectoryContents("raw/imessage");
      messageFiles = dir
        .filter((f) => f.type === "file" && f.name.endsWith(".md"))
        .sort((a, b) => b.name.localeCompare(a.name))
        .slice(0, 10); // Last 10 files
    } catch {
      return NextResponse.json({
        success: true,
        message: "No iMessage files found",
        extracted: 0,
      });
    }

    if (messageFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No iMessage files to process",
        extracted: 0,
      });
    }

    // Gather all message content
    let allMessages = "";
    for (const file of messageFiles) {
      const content = await getFileContent(file.path);
      if (content) {
        allMessages += `\n\n--- File: ${file.name} ---\n${content.content}`;
      }
    }

    if (!allMessages.trim()) {
      return NextResponse.json({
        success: true,
        message: "No message content found",
        extracted: 0,
      });
    }

    // Extract reimbursements via Claude
    const extracted = await extractWithClaude(apiKey, allMessages);

    if (extracted.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expenses found in messages",
        extracted: 0,
      });
    }

    // Read existing reimbursements file
    const reimbPath = "wiki/reimbursements.md";
    let existingContent = "";
    let sha: string | undefined;
    try {
      const existing = await getFileContent(reimbPath);
      if (existing) {
        existingContent = existing.content;
        sha = existing.sha;
      }
    } catch {
      // File doesn't exist
    }

    // Build or update the reimbursements table
    let content: string;

    if (existingContent) {
      // Append new rows to existing table
      const newRows = extracted
        .map(
          (r) =>
            `| ${r.date} | ${r.who} | ${r.amount} | ${r.description} | ${r.confidence} | [ ] |`
        )
        .join("\n");

      content = `${existingContent.trim()}\n${newRows}\n`;
    } else {
      // Create new file with table
      const rows = extracted
        .map(
          (r) =>
            `| ${r.date} | ${r.who} | ${r.amount} | ${r.description} | ${r.confidence} | [ ] |`
        )
        .join("\n");

      content = `---
type: reimbursements
updated: ${new Date().toISOString()}
---

# Reimbursements

| Date | Who | Amount | Description | Confidence | Settled |
| --- | --- | --- | --- | --- | --- |
${rows}

## Running Balances

*Balances are calculated from unsettled items above.*
`;
    }

    await writeFile(
      reimbPath,
      content,
      `Extract ${extracted.length} expense(s) from iMessages`,
      sha
    );

    return NextResponse.json({
      success: true,
      extracted: extracted.length,
      items: extracted,
      path: reimbPath,
    });
  } catch (error) {
    console.error("Error extracting reimbursements:", error);
    return NextResponse.json(
      {
        error: "Failed to extract reimbursements",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

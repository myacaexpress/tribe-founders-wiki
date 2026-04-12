import fs from "fs";
import path from "path";
import Link from "next/link";
import { marked } from "marked";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

async function getMarkdownContent(
  slug: string[]
): Promise<{ content: string; title: string }> {
  try {
    // Map slug path to markdown file
    const sanitizedSlug = slug.map((s) => s.replace(/[^a-z0-9-]/gi, ""));
    let filePath = path.join(process.cwd(), "wiki", ...sanitizedSlug);

    // Try with .md extension
    if (!filePath.endsWith(".md")) {
      filePath += ".md";
    }

    // Security: ensure file is within wiki directory
    const wikiDir = path.join(process.cwd(), "wiki");
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(wikiDir)) {
      notFound();
    }

    // Try the direct path, then fall back to index.md inside a folder
    let finalPath = resolvedPath;
    if (!fs.existsSync(resolvedPath)) {
      const indexPath = resolvedPath.replace(/\.md$/, "/index.md");
      if (fs.existsSync(indexPath)) {
        finalPath = indexPath;
      } else {
        notFound();
      }
    }

    // Read file
    const fileContent = fs.readFileSync(finalPath, "utf-8");

    // Extract title from first H1 or use slug
    const titleMatch = fileContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : slug[slug.length - 1];

    // Generate HTML from markdown
    const html = await marked(fileContent);

    return { content: html, title };
  } catch {
    notFound();
  }
}

function extractHeadings(html: string): Array<{ level: number; text: string; id: string }> {
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const regex = /<h([2-3])>(.+?)<\/h[2-3]>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]*>/g, "");
    const id = text.toLowerCase().replace(/\s+/g, "-");
    headings.push({ level, text, id });
  }

  return headings;
}

export async function generateMetadata(props: PageProps) {
  try {
    const params = await props.params;
    const { title } = await getMarkdownContent(params.slug);
    return {
      title: title ? `${title} — TriBe Wiki` : "TriBe Wiki",
    };
  } catch {
    return {
      title: "Page not found — TriBe Wiki",
    };
  }
}

export default async function WikiArticlePage(props: PageProps) {
  const params = await props.params;
  const { content, title } = await getMarkdownContent(params.slug);

  const headings = extractHeadings(content);

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <div className="container-main py-8">
        {/* Header */}
        <Link
          href="/wiki"
          className="text-[#8a8580] hover:text-[#1a1a1a] transition-colors mb-6 block"
        >
          ← Back to Wiki
        </Link>

        <h1 className="serif-heading text-3xl mb-8 text-[#1a1a1a]">{title}</h1>

        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1">
            <div className="card prose prose-sm max-w-none">
              <div
                className="prose-headings:font-serif prose-headings:text-[#1a1a1a] prose-p:text-[#1a1a1a] prose-a:text-[#2b8a88] prose-strong:text-[#1a1a1a] prose-code:text-[#e85d4e] prose-code:bg-[#fef4f2] prose-code:px-2 prose-code:py-1 prose-code:rounded"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>

          {/* Table of contents */}
          {headings.length > 0 && (
            <aside className="hidden lg:block w-48 flex-shrink-0">
              <div className="sticky top-6 card">
                <h3 className="serif-heading text-sm font-bold mb-3 text-[#1a1a1a]">
                  On this page
                </h3>
                <ul className="space-y-2 text-xs">
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <a
                        href={`#${heading.id}`}
                        className={`text-[#2b8a88] hover:text-[#1a5554] transition-colors block ${
                          heading.level === 3 ? "pl-4" : ""
                        }`}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

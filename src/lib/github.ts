/**
 * GitHub Contents API integration layer
 * Provides low-level read/write access to GitHub repo files
 */

// Configuration types and interfaces
export interface GitHubFileContent {
  content: string;
  sha: string;
}

export interface GitHubDirectoryItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
}

interface GitHubAPIResponse {
  content?: string;
  sha: string;
  [key: string]: any;
}

interface GitHubListResponse extends Array<any> {
  [index: number]: GitHubDirectoryItem;
}

// Configuration from environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "myacaexpress";
const GITHUB_REPO = process.env.GITHUB_REPO || "tribe-founders-wiki";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Build the GitHub API URL for a given path
 */
function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents${cleanPath}`;
}

/**
 * Make a GitHub API request with proper headers
 */
async function makeRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3.raw",
    "User-Agent": "tribe-founders-app",
  };

  if (options.headers && typeof options.headers === "object") {
    Object.assign(headers, options.headers);
  }

  if (GITHUB_TOKEN) {
    headers["Authorization"] = `token ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: headers as HeadersInit,
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(
      `GitHub API error: ${response.status} - ${error || response.statusText}`
    );
  }

  return response;
}

/**
 * Decode base64 content from GitHub API
 */
function decodeBase64(encoded: string): string {
  return Buffer.from(encoded, "base64").toString("utf-8");
}

/**
 * Encode content to base64 for GitHub API
 */
function encodeBase64(content: string): string {
  return Buffer.from(content, "utf-8").toString("base64");
}

/**
 * Read a file from the GitHub repo
 * Returns the decoded content and SHA, or null if file not found
 */
export async function getFileContent(path: string): Promise<GitHubFileContent | null> {
  try {
    const url = `${buildApiUrl(path)}?ref=${GITHUB_BRANCH}`;
    const response = await makeRequest(url);

    if (response.status === 404) {
      return null;
    }

    // For raw content, the response is the content directly
    const content = await response.text();

    // We need to get the SHA separately with a JSON request
    const jsonUrl = buildApiUrl(path);
    const jsonHeaders: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "tribe-founders-app",
    };

    if (GITHUB_TOKEN) {
      jsonHeaders["Authorization"] = `token ${GITHUB_TOKEN}`;
    }

    const jsonResponse = await fetch(`${jsonUrl}?ref=${GITHUB_BRANCH}`, {
      headers: jsonHeaders as HeadersInit,
    });

    if (!jsonResponse.ok) {
      throw new Error(`Failed to get SHA for ${path}`);
    }

    const data = (await jsonResponse.json()) as GitHubAPIResponse;

    return {
      content,
      sha: data.sha,
    };
  } catch (error) {
    console.error(`Error reading file ${path}:`, error);
    throw error;
  }
}

/**
 * List contents of a directory in the GitHub repo
 */
export async function getDirectoryContents(path: string): Promise<GitHubDirectoryItem[]> {
  try {
    const url = `${buildApiUrl(path)}?ref=${GITHUB_BRANCH}`;
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "tribe-founders-app",
    };

    if (GITHUB_TOKEN) {
      headers["Authorization"] = `token ${GITHUB_TOKEN}`;
    }

    const response = await fetch(url, { headers: headers as HeadersInit });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(
        `Failed to list directory ${path}: ${response.status}`
      );
    }

    const data = (await response.json()) as Array<any>;

    // Filter and map to our interface
    return data
      .filter((item) => item.type === "file" || item.type === "dir")
      .map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type as "file" | "dir",
        sha: item.sha,
      }));
  } catch (error) {
    console.error(`Error listing directory ${path}:`, error);
    throw error;
  }
}

/**
 * Create or update a file in the GitHub repo
 * If sha is provided, updates existing file; otherwise creates new file
 */
export async function writeFile(
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<string> {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is not configured");
  }

  try {
    const url = buildApiUrl(path);
    const encoded = encodeBase64(content);

    const payload = {
      message,
      content: encoded,
      branch: GITHUB_BRANCH,
      ...(sha && { sha }),
    };

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": `token ${GITHUB_TOKEN}`,
        "User-Agent": "tribe-founders-app",
        "Content-Type": "application/json",
      } as HeadersInit,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to write file: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as { content: { sha: string } };
    return data.content.sha;
  } catch (error) {
    console.error(`Error writing file ${path}:`, error);
    throw error;
  }
}

/**
 * Delete a file from the GitHub repo
 */
export async function deleteFile(
  path: string,
  sha: string,
  message: string
): Promise<void> {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is not configured");
  }

  try {
    const url = buildApiUrl(path);

    const payload = {
      message,
      sha,
      branch: GITHUB_BRANCH,
    };

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": `token ${GITHUB_TOKEN}`,
        "User-Agent": "tribe-founders-app",
        "Content-Type": "application/json",
      } as HeadersInit,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete file: ${response.status} - ${error}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${path}:`, error);
    throw error;
  }
}

/**
 * Batch read multiple files from the GitHub repo
 * Returns a Map of path -> content
 */
export async function getMultipleFiles(
  paths: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Fetch all files in parallel
  const promises = paths.map(async (path) => {
    try {
      const result = await getFileContent(path);
      if (result) {
        results.set(path, result.content);
      }
    } catch (error) {
      console.error(`Failed to read ${path}:`, error);
      // Continue with other files even if one fails
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * Validate GitHub configuration
 */
export function validateGitHubConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!GITHUB_TOKEN) {
    errors.push("GITHUB_TOKEN is not configured");
  }

  if (!GITHUB_OWNER) {
    errors.push("GITHUB_OWNER is not configured");
  }

  if (!GITHUB_REPO) {
    errors.push("GITHUB_REPO is not configured");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get current GitHub configuration (for debugging)
 */
export function getGitHubConfig() {
  return {
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH,
    hasToken: !!GITHUB_TOKEN,
  };
}

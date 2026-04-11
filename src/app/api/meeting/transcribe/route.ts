import { NextRequest, NextResponse } from "next/server";
import { writeFile, getFileContent } from "@/lib/github";

interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

interface GroqTranscriptionResponse {
  text: string;
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
}

/**
 * Slugify a title for use in filenames
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/**
 * POST /api/meeting/transcribe
 * Transcribes audio using Groq's Whisper API
 *
 * Body: FormData with:
 *   - file: audio blob
 *   - title?: meeting title
 */
export async function POST(request: NextRequest) {
  // Check for auth cookie
  const authCookie = request.cookies.get("tribe-auth");

  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || "Meeting";

    if (!file) {
      return NextResponse.json(
        { error: "Missing required field: file" },
        { status: 400 }
      );
    }

    // Determine the correct mime type and file extension from the uploaded file
    const uploadedType = file.type || "audio/webm";
    const extMap: Record<string, string> = {
      "audio/webm": "webm",
      "audio/webm;codecs=opus": "webm",
      "audio/mp4": "m4a",
      "audio/ogg": "ogg",
      "audio/ogg;codecs=opus": "ogg",
      "audio/wav": "wav",
      "audio/mpeg": "mp3",
      "audio/flac": "flac",
    };
    const ext = extMap[uploadedType] || "webm";
    const fileName = `recording.${ext}`;

    // Convert file to buffer for Groq API
    const arrayBuffer = await file.arrayBuffer();

    // Create FormData for Groq API — preserve original mime type and use proper filename
    const groqFormData = new FormData();
    groqFormData.append("file", new Blob([arrayBuffer], { type: uploadedType }), fileName);
    groqFormData.append("model", "whisper-large-v3-turbo");
    groqFormData.append("response_format", "verbose_json");

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error("GROQ_API_KEY is not configured");
      return NextResponse.json(
        { error: "Transcription service not configured" },
        { status: 500 }
      );
    }

    // Call Groq Whisper API
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: groqFormData,
      }
    );

    if (!groqResponse.ok) {
      const error = await groqResponse.text();
      console.error("Groq API error:", error);
      return NextResponse.json(
        { error: "Failed to transcribe audio", details: error },
        { status: groqResponse.status }
      );
    }

    const transcriptionData = (await groqResponse.json()) as GroqTranscriptionResponse;

    // Try to commit raw transcript to GitHub if GITHUB_TOKEN is set
    if (process.env.GITHUB_TOKEN) {
      try {
        const dateStr = formatDate();
        const titleSlug = slugify(title);
        const gitPath = `raw/transcripts/${dateStr}-${titleSlug}.md`;

        // Create markdown content for raw transcript
        const transcriptContent = `# Raw Transcript: ${title}

**Date:** ${new Date().toISOString()}
**Duration:** ${transcriptionData.duration} seconds
**Language:** ${transcriptionData.language}

## Transcript

${transcriptionData.text}

## Segments

${transcriptionData.segments
  .map(
    (segment) => `
### [${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}]
${segment.text}
`
  )
  .join("")}
`;

        // Try to get existing file SHA for update
        let existingSha: string | undefined;
        try {
          const existing = await getFileContent(gitPath);
          if (existing) {
            existingSha = existing.sha;
          }
        } catch (e) {
          // File doesn't exist, that's fine
        }

        await writeFile(
          gitPath,
          transcriptContent,
          `Add raw transcript: ${title}`,
          existingSha
        );
      } catch (gitError) {
        console.error("Failed to commit transcript to GitHub:", gitError);
        // Don't fail the request if GitHub write fails
      }
    }

    return NextResponse.json({
      success: true,
      transcript: transcriptionData.text,
      segments: transcriptionData.segments,
      duration: transcriptionData.duration,
    });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to transcribe audio", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Format seconds as HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

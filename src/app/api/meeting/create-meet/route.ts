import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * POST /api/meeting/create-meet
 *
 * Creates a Google Calendar event with a Google Meet conference link using
 * a Google Service Account. Returns the Meet link so the client can open it
 * directly and start recording simultaneously.
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — service account email (…@….iam.gserviceaccount.com)
 *   GOOGLE_SERVICE_ACCOUNT_KEY    — private key (PEM, newlines as \n)
 *   GOOGLE_CALENDAR_ID            — calendar to create events on (e.g. shawn@myacaexpress.com)
 *
 * If any of these are missing the route returns a 501 so the client can
 * fall back to the Calendar URL approach.
 */
export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("tribe-auth");
  if (!authCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_KEY,
    GOOGLE_CALENDAR_ID,
  } = process.env;

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_KEY || !GOOGLE_CALENDAR_ID) {
    return NextResponse.json(
      { error: "Google Calendar not configured", fallback: true },
      { status: 501 }
    );
  }

  const { title, attendees, durationMinutes = 60 } = await request.json();

  const start = new Date();
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  try {
    const auth = new google.auth.JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    const event = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      conferenceDataVersion: 1,
      requestBody: {
        summary: title || "Founders Meeting",
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: (attendees as string[]).map((email: string) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `tribe-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const meetLink =
      event.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      )?.uri ?? null;

    return NextResponse.json({
      success: true,
      meetLink,
      eventId: event.data.id,
      eventLink: event.data.htmlLink,
    });
  } catch (error) {
    console.error("Error creating Calendar event:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create meeting", details: msg },
      { status: 500 }
    );
  }
}

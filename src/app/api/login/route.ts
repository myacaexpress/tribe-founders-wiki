import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;

  const correctPassword = process.env.TRIBE_PASSWORD || "tribe2026";

  if (password === correctPassword) {
    const response = NextResponse.json({ success: true });

    // Set secure cookie that lasts 30 days
    response.cookies.set("tribe-auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  }

  return NextResponse.json(
    { error: "Invalid password" },
    { status: 401 }
  );
}

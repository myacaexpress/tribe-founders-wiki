import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and login API through without auth
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("tribe-auth");

  if (!authCookie) {
    // Redirect to login if no auth cookie
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

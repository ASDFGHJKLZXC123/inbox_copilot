import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Body + matcher copied verbatim from FRONTEND_PORT_PLAN.md Appendix B.4 (~line 1034).
// Segment-bounded exclusions keep /api/auth/*, /api/webhooks/*, /api/health public
// while protecting every other /api/* path and the /inbox + /preferences page trees.

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (token) return NextResponse.next();

  // Page routes: redirect to /signin
  if (!pathname.startsWith("/api/")) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  // API routes: keep the 401 JSON shape
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: [
    "/api/((?!auth/|webhooks/|health$|health/).*)", // protect API except /api/auth/*, /api/webhooks/*, /api/health
    "/inbox/:path*",
    "/preferences/:path*"
  ]
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Note: Next.js Middleware runs on the Edge Runtime.
 * Importing `next-auth` here can pull in `jose` code paths that are not Edge-compatible
 * in Next's runtime, causing build-time warnings/retries. We keep middleware Edge-safe
 * by doing a minimal session-cookie presence check.
 */
export default function middleware(req: NextRequest) {
  const hasSession =
    // Auth.js / NextAuth v5 cookie names (secure + non-secure)
    Boolean(req.cookies.get("__Secure-authjs.session-token")?.value) ||
    Boolean(req.cookies.get("authjs.session-token")?.value) ||
    // Legacy NextAuth v4 cookie names (in case of older cookies)
    Boolean(req.cookies.get("__Secure-next-auth.session-token")?.value) ||
    Boolean(req.cookies.get("next-auth.session-token")?.value);

  if (!hasSession) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/t/:path*"],
};

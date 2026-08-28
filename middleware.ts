import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = request.cookies.get("orbit_session");

  let isAuthenticated = false;
  let isExpired = false;

  if (sessionCookie?.value) {
    try {
      const payload = JSON.parse(sessionCookie.value);
      const now = Date.now();
      if (payload?.sessionId && payload?.user) {
        if (payload.expiresAt && now > payload.expiresAt) {
          isExpired = true;
          isAuthenticated = false;
        } else {
          isAuthenticated = true;
        }
      }
    } catch {
      isAuthenticated = false;
    }
  }

  // 1. Root and Login Redirection Logic
  if (pathname === "/" || pathname === "/login" || pathname === "/ad/login") {
    if (isAuthenticated) {
      // User is already logged in, redirect to destination
      const target = request.nextUrl.searchParams.get("redirect") || "/ad/ipo";
      const validTarget = target.startsWith("/") ? target : "/ad/ipo";
      return NextResponse.redirect(new URL(validTarget, request.url));
    }

    if (pathname === "/" || pathname === "/login") {
      return NextResponse.redirect(new URL("/ad/login", request.url));
    }

    return NextResponse.next();
  }

  // 2. Protected Routes Guard (/ad/*, /admin/*)
  const isProtectedRoute = pathname.startsWith("/ad") || pathname.startsWith("/admin");
  if (isProtectedRoute && pathname !== "/ad/login") {
    if (!isAuthenticated) {
      const loginUrl = new URL("/ad/login", request.url);
      if (isExpired) {
        loginUrl.searchParams.set("reason", "expired");
      }
      const redirectPath = pathname + search;
      if (redirectPath !== "/ad/login") {
        loginUrl.searchParams.set("redirect", redirectPath);
      }

      const response = NextResponse.redirect(loginUrl);
      if (isExpired) {
        response.cookies.delete("orbit_session");
      }
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match application entrypoints & protected admin routes:
     * - "/" and "/login" (for automatic redirection)
     * - "/ad/:path*" and "/admin/:path*" (for authentication guard)
     * Bypasses all static assets, Next.js internal files, favicons, fonts, and images.
     */
    "/",
    "/login",
    "/ad/:path*",
    "/admin/:path*",
  ],
};

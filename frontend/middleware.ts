import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getJwtRole(token?: string): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const data = JSON.parse(json);
    return data.role || null;
  } catch {
    return null;
  }
}

function getRoleDashboard(role: string | null): string {
  switch (role) {
    case "PROFESSOR":
      return "/professor/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    case "STUDENT":
    default:
      return "/student/dashboard";
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  const isProtectedRoute =
    pathname.startsWith("/student") ||
    pathname.startsWith("/professor") ||
    pathname.startsWith("/admin");

  // 1. If authenticated and visiting guest-only auth routes, redirect to role dashboard
  if (isAuthRoute && accessToken) {
    const role = getJwtRole(accessToken);
    if (role) {
      return NextResponse.redirect(new URL(getRoleDashboard(role), request.url));
    }
  }

  // 2. Protected routes handling
  if (isProtectedRoute) {
    if (!accessToken && !refreshToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If access token missing but refresh token exists, perform silent refresh
    if (!accessToken && refreshToken) {
      try {
        const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:8000";
        const refreshRes = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
          method: "POST",
          headers: {
            cookie: `refresh_token=${refreshToken}`,
          },
        });

        if (refreshRes.ok) {
          const response = NextResponse.next();
          const setCookieHeaders = refreshRes.headers.getSetCookie?.() || [];
          for (const cookieHeader of setCookieHeaders) {
            response.headers.append("Set-Cookie", cookieHeader);
          }
          return response;
        } else {
          const loginUrl = new URL("/login", request.url);
          loginUrl.searchParams.set("next", pathname);
          return NextResponse.redirect(loginUrl);
        }
      } catch {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/student/:path*",
    "/professor/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};

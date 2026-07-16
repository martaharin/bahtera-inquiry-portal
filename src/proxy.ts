// proxy.ts
import { NextRequest, NextResponse } from "next/server";


export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip next assets & static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Ambil cookie NextAuth (sesuaikan nama token untuk dev vs prod)
  const isProd = process.env.NODE_ENV === "production";
  const nextAuthTokenName = isProd
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const hasSession = request.cookies.has(nextAuthTokenName);

  // ===== USER HAS SESSION =====
  if (hasSession) {
    if (pathname === "/auth/login") {
      return NextResponse.redirect(new URL("/admin/ticket", request.url));
    }
    return NextResponse.next();
  }

  // ===== NOT LOGGED IN =====
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};

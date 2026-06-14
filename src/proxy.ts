// proxy.ts

import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

const app_url = process.env.NEXT_PUBLIC_APP_URL;

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // skip next assets & static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get("session")?.value;

  // console.log("EMAIL:", email);

  // ===== USER HAS COOKIE =====
  if (session) {
    // prevent access login page after login
    if (pathname === "/auth/login") {
      return NextResponse.redirect(
        new URL("/admin/dashboard", request.url)
      );
    }

    try {
      const payload = await decrypt(session);

      if (payload) {
        return NextResponse.next();
      }
    } catch (error) {
      console.error("Session Invalid:", error);
    }

    // invalid cookie/session
    return NextResponse.redirect(
      new URL("/auth/login", request.url)
    );
  }

  // ===== NOT LOGGED IN =====
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(
      new URL("/auth/login", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
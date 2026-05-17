// proxy.ts

import { NextRequest, NextResponse } from "next/server";

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

  const email = request.cookies.get("email")?.value;
  const password = request.cookies.get("password")?.value;

  console.log("EMAIL:", email);

  // ===== USER HAS COOKIE =====
  if (email && password) {
    // prevent access login page after login
    if (pathname === "/auth/login") {
      return NextResponse.redirect(
        new URL("/admin/dashboard", request.url)
      );
    }

    try {
      const response = await fetch(`${app_url}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      // valid session
      if (response.ok && data.success) {
        return NextResponse.next();
      }
    } catch (error) {
      console.error("Proxy Auth Error:", error);
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
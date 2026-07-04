import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logout success",
  });

  // hapus semua auth cookies
  response.cookies.set("email", "", {
    expires: new Date(0),
    path: "/",
  });

  response.cookies.set("session", "", {
    expires: new Date(0),
    path: "/",
  });

  return response;
}
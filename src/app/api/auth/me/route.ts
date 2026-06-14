import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    console.log (
      "ALL COOKIES;",
      cookieStore.getAll()
    );

    const session =
      cookieStore.get("session")?.value;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "No session",
        },
        { status: 401 }
      );
    }

    const payload = await decrypt(session);

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid session",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: payload,
    });

  } catch (error: any) {
    console.error("AUTH ME ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
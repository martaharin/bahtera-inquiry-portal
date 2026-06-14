import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// ==========================================
// GET PROFILE
// ==========================================
export async function GET() {
  try {
    const cookieStore = await cookies();

    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const result = await db.query(
      `
      SELECT 
        user_id,
        user_name,
        user_email,
        password
      FROM public.users
      WHERE user_id = $1
      LIMIT 1
      `,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User tidak ditemukan",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error("GET PROFILE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// ==========================================
// UPDATE PROFILE
// ==========================================
export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();

    const userId = cookieStore.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      username,
      email,
      password,
    } = body;

    await db.query(
      `
      UPDATE public.users
      SET
        user_name = $1,
        user_email = $2,
        password = $3
      WHERE user_id = $4
      `,
      [username, email, password, userId]
    );

    return NextResponse.json({
      success: true,
      message: "Profile berhasil diupdate",
    });
  } catch (error: any) {
    console.error("UPDATE PROFILE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
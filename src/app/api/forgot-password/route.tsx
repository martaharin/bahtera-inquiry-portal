import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } =
      await request.json();

    // CHECK USER
    const checkUser = await db.query(
      `
      SELECT * FROM users
      WHERE user_email = $1
      `,
      [email]
    );

    if (checkUser.rows.length === 0) {
      return NextResponse.json(
        {
          error: "Email tidak ditemukan",
        },
        { status: 404 }
      );
    }

    // UPDATE PASSWORD
    await db.query(
      `
      UPDATE users
      SET password = $1
      WHERE user_email = $2
      `,
      [newPassword, email]
    );

    return NextResponse.json({
      success: true,
      message: "Password berhasil diupdate",
    });

  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
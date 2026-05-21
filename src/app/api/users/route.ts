import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Mengambil user_id dan user_name asli dari database kamu
    const result = await db.query(
      `SELECT user_id, user_name FROM public."users" ORDER BY user_name ASC`
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("ERROR FETCH USERS:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data user" },
      { status: 500 }
    );
  }
}
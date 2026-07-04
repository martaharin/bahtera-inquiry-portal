import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await db.query(`
      SELECT role_id, role_name
      FROM role
      ORDER BY role_id ASC
    `);

    return NextResponse.json({
      success: true,
      roles: result.rows,
    });
  } catch (error: any) {
    console.error("GET ROLES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
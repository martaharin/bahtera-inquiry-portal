import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query(
      `
  INSERT INTO chat_sessions
  DEFAULT VALUES
  RETURNING id, created_at, updated_at
  `,
    );

    return NextResponse.json({
      session: result.rows[0],
    });
  } catch (error) {
    console.error("Create chat session error:", error);

    return NextResponse.json(
      { error: "Failed to create chat session" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const result = await await db.query(
      `
      SELECT DISTINCT session_id
      FROM chat_messages
      WHERE session_id IS NOT NULL
      `,
    );

    const baseUrl = new URL(request.url).origin;

    const updateResults = [];

    for (const row of result.rows) {
      try {
        const res = await fetch(`${baseUrl}/api/lead-extraction`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(row),
        });

        const data = await res.json();

        updateResults.push({
          session_id: row.session_id,
          success: res.ok,
          status: res.status,
          response: data,
        });
      } catch (error) {
        updateResults.push({
          session_id: row.session_id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: result.rows.length,
      results: updateResults,
    });
  } catch (error) {
    console.error("Loop update error:", error);

    return NextResponse.json(
      { error: "Failed to loop update sessions" },
      { status: 500 },
    );
  }
}

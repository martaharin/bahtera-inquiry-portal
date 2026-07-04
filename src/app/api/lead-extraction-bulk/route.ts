import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const result = await db.query(
      `
      SELECT DISTINCT session_id
      FROM chat_messages
      WHERE session_id IS NOT NULL
        AND session_id NOT IN (
          SELECT id FROM chat_sessions 
          WHERE extraction_status IS NOT NULL
        )
      ORDER BY session_id
      `,
    );

    const baseUrl = new URL(request.url).origin;

    const updateResults = [];
    let qualifiedCount = 0;
    let unqualifiedCount = 0;
    let errorCount = 0;

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

        const status = data.unqualified
          ? "unqualified"
          : data.success
            ? "qualified"
            : "error";

        if (status === "qualified") qualifiedCount++;
        else if (status === "unqualified") unqualifiedCount++;
        else errorCount++;

        updateResults.push({
          session_id: row.session_id,
          status,
          success: res.ok && data.success,
          http_status: res.status,
          response: data,
        });
      } catch (error) {
        errorCount++;
        updateResults.push({
          session_id: row.session_id,
          status: "error",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: result.rows.length,
      qualified: qualifiedCount,
      unqualified: unqualifiedCount,
      errors: errorCount,
      results: updateResults,
    });
  } catch (error) {
    console.error("Bulk extraction error:", error);

    return NextResponse.json(
      { error: "Failed to process bulk extraction" },
      { status: 500 },
    );
  }
}

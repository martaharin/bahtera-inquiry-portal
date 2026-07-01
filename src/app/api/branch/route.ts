import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const result = await db.query(`
      SELECT
        branch_id,
        branch_name
      FROM public.branch
      ORDER BY branch_name ASC
    `);

    return NextResponse.json({
      success: true,
      branches: result.rows,
    });

  } catch (error: any) {

    console.error("FETCH BRANCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
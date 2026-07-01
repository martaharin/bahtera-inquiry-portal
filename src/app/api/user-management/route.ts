import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PermissionUser, isAdmin } from "@/lib/rbac";

// ==========================================
// GET ALL USERS
// ==========================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
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

    const currentUser: PermissionUser = {
      user_id: session.user.user_id,
      role_name: session.user.role_name,
      industry: session.user.industry,
      branch: session.user.branch,
    };

    // =========================
    // ADMIN ONLY
    // =========================

    if (!isAdmin(currentUser)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    // =========================
    // QUERY USERS
    // =========================

    const result = await db.query(`
      SELECT
          u.user_id,
          u.user_name,
          u.user_email,

          sp.role_name,
          sp.industry,
          sp.branch

      FROM public.users u

      LEFT JOIN public.sales_person sp
      ON u.user_id = sp.user_id

      ORDER BY
          u.user_name ASC;
    `);

    return NextResponse.json({
      success: true,
      users: result.rows,
    });

  } catch (error: any) {

    console.error(
      "GET USER MANAGEMENT ERROR:",
      error
    );

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
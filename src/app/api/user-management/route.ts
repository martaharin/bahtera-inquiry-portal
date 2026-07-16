import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getPermissionKeysBySessionUser,
  hasPermission,
} from "@/lib/permissions";

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

    // =========================
    // ADMIN ONLY
    // =========================

    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(userPermissions, "user.view")) {
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
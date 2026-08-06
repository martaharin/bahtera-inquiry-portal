import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
<<<<<<< HEAD
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import {
  getPermissionKeysBySessionUser,
  hasPermission,
} from "@/lib/permissions";
=======

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e

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

<<<<<<< HEAD
    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(userPermissions, "branch_industry.view")) {
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

=======
>>>>>>> 7e5c5e9fd6678346b26b1c7cc7749c85e63cc30e
    const result = await db.query(`
      SELECT
        industry_id,
        industry_name
      FROM public.industry
      ORDER BY industry_name ASC
    `);

    return NextResponse.json({
      success: true,
      industries: result.rows,
    });

  } catch (error: any) {

    console.error("FETCH INDUSTRY ERROR:", error);

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
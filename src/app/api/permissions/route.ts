import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getPermissionKeysBySessionUser,
  hasPermission,
} from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userPermissions = await getPermissionKeysBySessionUser(session.user);

    if (!hasPermission(userPermissions, "role.view")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const result = await db.query(`
      SELECT
        permission_id,
        "key",
        name,
        module,
        description
      FROM public.permissions
      ORDER BY module ASC, name ASC
    `);

    return NextResponse.json({
      success: true,
      permissions: result.rows,
    });
  } catch (error: any) {
    console.error("GET PERMISSIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to get permissions",
      },
      { status: 500 }
    );
  }
}